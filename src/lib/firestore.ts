import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  collection,
  query,
  orderBy,
  serverTimestamp,
  getDocs,
  where,
  writeBatch,
  Firestore,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { slugify } from './utils';
import { normalizeColorToHex } from './colors';
import type { Instructor, ScheduleRow, GlobalConfig } from '../stores/schedule';

// Tipos para Firestore
interface FirestoreSchedule {
  instructors: Instructor[];
  scheduleRows: ScheduleRow[];
  globalConfig: GlobalConfig;
  lastUpdated: any;
}

// Sistema de logging
interface FirestoreLog {
  timestamp: any;
  operation: string;
  status: 'success' | 'error';
  details: any;
  error?: any;
}

// Función para registrar logs en Firebase
export async function logOperation(operation: string, status: 'success' | 'error', details: any, error?: any) {
  try {
    const log: FirestoreLog = {
      timestamp: serverTimestamp(),
      operation,
      status,
      details,
      ...(error && { error: JSON.stringify(error) })
    };
    
    await setDoc(doc(db as Firestore, 'logs', `${Date.now()}`), log);
  } catch (e) {
    console.error('Error logging to Firebase:', e);
  }
}

// Función para verificar la integridad de los datos
async function verifyDataIntegrity(data: FirestoreSchedule): Promise<boolean> {
  try {
    // Verificar que todos los instructores tienen una fila correspondiente
    const instructorIds = new Set(data.instructors.map(i => i.id));
    const rowIds = new Set(data.scheduleRows.map(r => r.id));
    
    const allInstructorsHaveRows = Array.from(instructorIds).every(id => rowIds.has(id));
    if (!allInstructorsHaveRows) {
      console.error('ERROR: No todos los instructores tienen filas correspondientes');
      const missingRows = Array.from(instructorIds).filter(id => !rowIds.has(id));
      console.error('Instructores sin filas:', missingRows);
      
      await logOperation('verifyDataIntegrity', 'error', {
        message: 'No todos los instructores tienen filas correspondientes',
        instructorIds: Array.from(instructorIds),
        rowIds: Array.from(rowIds),
        missingRows
      });
      return false;
    }

    // Verificar que todos los eventos tienen IDs válidos y únicos
    const eventIds = new Set<string>();
    let totalEvents = 0;
    
    for (const row of data.scheduleRows) {
      for (const [day, events] of Object.entries(row.events)) {
        for (const event of events) {
          totalEvents++;
          
          // Verificar que el ID es único
          if (eventIds.has(event.id)) {
            console.error(`ERROR: ID de evento duplicado: ${event.id}`);
            await logOperation('verifyDataIntegrity', 'error', {
              message: 'ID de evento duplicado detectado',
              eventId: event.id,
              rowId: row.id,
              day
            });
            return false;
          }
          eventIds.add(event.id);

          // Verificar que el ID tiene un formato válido (más permisivo)
          if (!event.id.startsWith('evt-')) {
            console.error(`ERROR: Formato de ID de evento inválido: ${event.id}`);
            await logOperation('verifyDataIntegrity', 'error', {
              message: 'Formato de ID de evento inválido',
              eventId: event.id,
              rowId: row.id,
              day
            });
            return false;
          }

          // Verificar que el evento tiene propiedades requeridas
          if (!event.title || !event.location || !event.color) {
            console.error(`ERROR: Evento incompleto: ${event.id}`, event);
            await logOperation('verifyDataIntegrity', 'error', {
              message: 'Evento con propiedades faltantes',
              eventId: event.id,
              event: event
            });
            return false;
          }
        }
      }
    }

    return true;
  } catch (error) {
    console.error('ERROR en verifyDataIntegrity:', error);
    await logOperation('verifyDataIntegrity', 'error', {
      message: 'Error verificando integridad de datos'
    }, error);
    return false;
  }
}

// Función mejorada para guardar datos con verificación y retry
async function saveWithRetry(
  docRef: string,
  data: FirestoreSchedule,
  maxRetries = 3,
  currentTry = 1
): Promise<boolean> {
  try {
    // Intentar guardar los datos
    await setDoc(doc(db, 'schedule', docRef), {
      ...data,
      lastUpdated: serverTimestamp()
    });

    // Verificar que los datos se guardaron correctamente
    const savedDoc = await getDoc(doc(db, 'schedule', docRef));
    if (!savedDoc.exists()) {
      throw new Error('Los datos no se guardaron correctamente');
    }

    const savedData = savedDoc.data() as FirestoreSchedule;
    const isValid = await verifyDataIntegrity(savedData);

    if (!isValid) {
      throw new Error('Los datos guardados no pasaron la verificación de integridad');
    }

    await logOperation('saveWithRetry', 'success', {
      docRef,
      attempt: currentTry
    });

    return true;
  } catch (error) {
    await logOperation('saveWithRetry', 'error', {
      docRef,
      attempt: currentTry
    }, error);

    if (currentTry < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000 * currentTry));
      return saveWithRetry(docRef, data, maxRetries, currentTry + 1);
    }

    throw error;
  }
}

// Función para obtener la semana actual
function getCurrentWeek(): { startDate: string; endDate: string } {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = domingo, 1 = lunes, etc.
  
  // Calcular el lunes de la semana actual
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  
  // Calcular el viernes de la semana actual
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    startDate: formatDate(monday),
    endDate: formatDate(friday)
  };
}

// Datos iniciales
const initialData: FirestoreSchedule = {
  instructors: [
    { id: 'instructor-1', name: 'JUAN PABLO HERNANDEZ', regional: 'BUCARAMANGA' },
    { id: 'instructor-2', name: 'ZULAY VERA', regional: 'NORTE' },
  ],
  scheduleRows: [
    {
      id: 'instructor-1',
      instructor: 'JUAN PABLO HERNANDEZ',
      regional: 'BUCARAMANGA',
      events: {
        '25': [{ id: 'evt-1', title: 'ESCUELA DE PROMOTORES', details: 'Módulo Formativo Líquidos', time: 'Presencial - 8:00 a.m. a 5:00 p.m.', location: 'Bucaramanga', color: 'bg-red-600' }],
        '26': [{ id: 'evt-2', title: 'ESCUELA DE PROMOTORES', details: 'Módulo de Lubricantes', time: 'Presencial - 8:00 a.m. a 5:00 p.m.', location: 'Bucaramanga', color: 'bg-red-600' }],
        '27': [{ id: 'evt-3', title: 'ESCUELA DE PROMOTORES', details: 'Módulo A Tu Servicio', time: 'Presencial - 8:00 a.m. a 5:00 p.m.', location: 'Bucaramanga', color: 'bg-red-600' }],
      }
    },
    {
      id: 'instructor-2',
      instructor: 'ZULAY VERA',
      regional: 'NORTE',
      events: {
        '26': [{ id: 'evt-4', title: 'NUEVO PROTOCOLO DE SERVICIO TERPEL', details: ['Sesión Virtual 1 - 8:00 a.m. a 9:30 a.m.', 'Sesión Virtual 2 - 10:30 a.m. a 12:00 p.m.', 'Sesión Virtual 3 - 2:30 p.m. a 4:00 p.m.'], location: 'Todas las Regionales', color: 'bg-rose-500' }],
        '27': [{ id: 'evt-5', title: 'VIVE TERPEL - VIVEPITS', details: ['Sesión Virtual 1 - 8:00 a.m. a 9:30 a.m.', 'Sesión Virtual 2 - 10:30 a.m. a 12:00 p.m.', 'Sesión Virtual 3 - 2:30 p.m. a 4:00 p.m.'], location: 'Todas las Regionales', color: 'bg-rose-500' }],
      }
    }
  ],
  globalConfig: {
    title: 'Cronograma Escuelas Colombia',
    weekTitles: {}, // Inicialmente vacío
    currentWeek: getCurrentWeek(),
    viewMode: 'weekly'
  },
  lastUpdated: serverTimestamp()
};

// Referencias a documentos
const DRAFT_DOC = 'draft';
const PUBLISHED_DOC = 'published';

// Función para inicializar datos si no existen
export async function initializeDataIfNeeded() {
  try {
    const draftDoc = await getDoc(doc(db, 'schedule', DRAFT_DOC));
    const publishedDoc = await getDoc(doc(db, 'schedule', PUBLISHED_DOC));

    if (!draftDoc.exists()) {
      await setDoc(doc(db, 'schedule', DRAFT_DOC), initialData);
    }

    if (!publishedDoc.exists()) {
      await setDoc(doc(db, 'schedule', PUBLISHED_DOC), initialData);
    }
  } catch (error) {
    console.error('Error inicializando datos:', error);
  }
}

// Función para guardar datos de borrador
export async function saveDraftData(data: {
  instructors: Instructor[];
  scheduleRows: ScheduleRow[];
  globalConfig: GlobalConfig;
}): Promise<boolean> {
  return saveWithRetry('draft', data as FirestoreSchedule);
}

// Función para publicar cambios
export async function publishData(data: {
  instructors: Instructor[];
  scheduleRows: ScheduleRow[];
  globalConfig: GlobalConfig;
}): Promise<boolean> {
  return saveWithRetry('published', data as FirestoreSchedule);
}

// Función para suscribirse a cambios en tiempo real
export function subscribeToDraftData(callback: (data: FirestoreSchedule) => void) {
  return onSnapshot(doc(db, 'schedule', DRAFT_DOC), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as FirestoreSchedule);
    }
  });
}

export function subscribeToPublishedData(callback: (data: FirestoreSchedule) => void) {
  return onSnapshot(doc(db, 'schedule', PUBLISHED_DOC), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as FirestoreSchedule);
    }
  });
}

// Función para obtener datos una sola vez
export async function getDraftData(): Promise<FirestoreSchedule | null> {
  try {
    const docRef = await getDoc(doc(db, 'schedule', DRAFT_DOC));
    if (docRef.exists()) {
      return docRef.data() as FirestoreSchedule;
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo datos de borrador:', error);
    return null;
  }
}

export async function getPublishedData(): Promise<FirestoreSchedule | null> {
  try {
    const docRef = await getDoc(doc(db, 'schedule', PUBLISHED_DOC));
    if (docRef.exists()) {
      return docRef.data() as FirestoreSchedule;
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo datos publicados:', error);
    return null;
  }
}

/**
 * Inicializa un administrador en la base de datos
 * @param email - Correo electrónico del administrador
 */
export const initializeAdmin = async (email: string) => {
  try {
    const adminRef = doc(db, 'admins', email);
    await setDoc(adminRef, {
      email,
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('Error al inicializar administrador:', error);
    return false;
  }
};

/**
 * Verifica si un correo electrónico está registrado como administrador
 * @param email - Correo electrónico a verificar
 */
export const checkAdminStatus = async (email: string) => {
  try {
    const adminRef = doc(db, 'admins', email);
    const adminDoc = await getDocs(query(collection(db, 'admins'), where('email', '==', email)));
    return !adminDoc.empty;
  } catch (error) {
    console.error('Error al verificar estado de administrador:', error);
    return false;
  }
};

/**
 * Restaura los datos de draft desde published
 * Útil para recuperar draft si se perdieron accidentalmente
 * @returns Promise<boolean> - True si la restauración fue exitosa
 */
export async function restoreDraftFromPublished(): Promise<boolean> {
  try {
    const published = await getPublishedData();
    
    if (!published) {
      console.error('❌ No hay datos publicados para restaurar');
      await logOperation('restoreDraftFromPublished', 'error', {
        message: 'No hay datos publicados disponibles'
      });
      return false;
    }

    // Copiar published a draft
    await setDoc(doc(db, 'schedule', 'draft'), {
      instructors: published.instructors,
      scheduleRows: published.scheduleRows,
      globalConfig: published.globalConfig,
      lastUpdated: serverTimestamp()
    });

    await logOperation('restoreDraftFromPublished', 'success', {
      message: 'Draft restaurado desde published',
      instructorsCount: published.instructors.length,
      rowsCount: published.scheduleRows.length
    });

    console.log('✅ Draft restaurado exitosamente desde published');
    return true;
  } catch (error) {
    console.error('❌ Error al restaurar draft:', error);
    await logOperation('restoreDraftFromPublished', 'error', {
      message: 'Error restaurando draft desde published'
    }, error);
    return false;
  }
}

/**
 * Elimina un administrador de la base de datos
 * @param email - Correo electrónico del administrador a eliminar
 */
export const removeAdmin = async (email: string) => {
  try {
    const adminRef = doc(db, 'admins', email);
    await deleteDoc(adminRef);
    return true;
  } catch (error) {
    console.error('Error al eliminar administrador:', error);
    return false;
  }
};

/**
 * Obtiene todos los programas activos de la base de datos
 */
export const getActivePrograms = async (): Promise<string[]> => {
  try {
    const programsCollection = collection(db, 'programs');
    const snapshot = await getDocs(programsCollection);
    
    const programs: string[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.active) {
        programs.push(data.name);
      }
    });
    
    return programs.sort();
  } catch (error) {
    console.error('Error al obtener programas:', error);
    return [];
  }
};

/**
 * Obtiene todos los módulos activos de la base de datos
 */
export const getActiveModules = async (): Promise<string[]> => {
  try {
    const modulesCollection = collection(db, 'modules');
    const snapshot = await getDocs(modulesCollection);
    
    const modules: string[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.active) {
        modules.push(data.name);
      }
    });
    
    return modules.sort();
  } catch (error) {
    console.error('Error al obtener módulos:', error);
    return [];
  }
};

/**
 * Obtiene todas las modalidades activas de la base de datos
 */
export const getActiveModalities = async (): Promise<string[]> => {
  try {
    const modalitiesCollection = collection(db, 'modalities');
    const snapshot = await getDocs(modalitiesCollection);
    
    const modalities: string[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.active) {
        modalities.push(data.name);
      }
    });
    
    return modalities.sort();
  } catch (error) {
    console.error('Error al obtener modalidades:', error);
    return [];
  }
};

/**
 * Obtiene el color asociado a un módulo específico
 */
export const getModuleColor = async (moduleName: string): Promise<string> => {
  try {
    const modulesCollection = collection(db, 'modules');
    const snapshot = await getDocs(modulesCollection);
    
    let moduleColor = 'bg-blue-600'; // Color por defecto
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.name === moduleName && data.active) {
        moduleColor = data.color || 'bg-blue-600';
      }
    });
    
    return moduleColor;
  } catch (error) {
    console.error('Error al obtener color del módulo:', error);
    return 'bg-blue-600';
  }
};

/**
 * Función helper para eliminar duplicados de una colección
 * Mantiene el documento más antiguo y elimina los más nuevos con el mismo nombre
 */
async function deduplicateCollection(collectionName: string): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    const itemsByName = new Map<string, any[]>();
    
    // Agrupar documentos por nombre
    snapshot.forEach((doc) => {
      const data = doc.data();
      const name = data.name;
      
      if (!itemsByName.has(name)) {
        itemsByName.set(name, []);
      }
      itemsByName.get(name)!.push({
        id: doc.id,
        ...data
      });
    });
    
    // Eliminar duplicados (mantener el más antiguo)
    let deletedCount = 0;
    for (const [name, items] of itemsByName.entries()) {
      if (items.length > 1) {
        // Ordenar por createdAt, mantener el primero (más antiguo)
        const sorted = items.sort((a, b) => {
          const timeA = a.createdAt?.toDate?.() || new Date(0);
          const timeB = b.createdAt?.toDate?.() || new Date(0);
          return timeA.getTime() - timeB.getTime();
        });
        
        // Eliminar los duplicados (todos excepto el primero)
        for (let i = 1; i < sorted.length; i++) {
          await deleteDoc(doc(db, collectionName, sorted[i].id));
          deletedCount++;
          console.log(`🗑️ Eliminado duplicado: ${collectionName}/${sorted[i].id} (${name})`);
        }
      }
    }
    
    if (deletedCount > 0) {
      console.log(`✅ Eliminados ${deletedCount} duplicados de ${collectionName}`);
    }
  } catch (error) {
    console.error(`Error deduplicando ${collectionName}:`, error);
  }
}

/**
 * Función helper para agregar o actualizar un programa/módulo/modalidad
 * Previene duplicados usando ID basado en nombre (slugify)
 */
export async function addOrUpdateItem(
  collectionName: 'programs' | 'modules' | 'modalities',
  name: string,
  color?: string
): Promise<boolean> {
  try {
    // Generar ID determinístico basado en el nombre
    const itemId = slugify(name);
    
    // Normalizar color si se proporciona
    const normalizedColor = color ? normalizeColorToHex(color) : undefined;
    
    // Verificar si ya existe con ese nombre (pero con otro ID antiguo)
    const existingDocs = await getDocs(
      query(
        collection(db, collectionName),
        where('name', '==', name)
      )
    );
    
    // Si existe con otro ID, actualizar solo si es necesario
    if (!existingDocs.empty) {
      const existingDoc = existingDocs.docs[0];
      const existingData = existingDoc.data();
      
      // Si el documento tiene otro ID (antiguo), copiar datos al nuevo y eliminar el viejo
      if (existingDoc.id !== itemId) {
        // Crear nuevo con ID correcto
        const newData: any = {
          name,
          active: true,
          createdAt: existingData.createdAt || serverTimestamp(),
          createdBy: existingData.createdBy || 'system',
          migratedAt: serverTimestamp()
        };
        
        if (collectionName === 'modules') {
          newData.color = normalizedColor || existingData.color || '#2563eb';
        }
        
        await setDoc(doc(db, collectionName, itemId), newData);
        
        // Eliminar el documento antiguo
        await deleteDoc(doc(db, collectionName, existingDoc.id));
        console.log(`🔄 Migrado ${collectionName}/${existingDoc.id} → ${itemId}`);
      } else {
        // El documento ya tiene el ID correcto, actualizar si es necesario
        const updateData: any = { name };
        if (collectionName === 'modules' && normalizedColor) {
          updateData.color = normalizedColor;
        }
        await setDoc(doc(db, collectionName, itemId), updateData, { merge: true });
      }
    } else {
      // No existe, crear nuevo
      const newData: any = {
        name,
        active: true,
        createdAt: serverTimestamp(),
        createdBy: 'system'
      };
      
      if (collectionName === 'modules') {
        newData.color = normalizedColor || '#2563eb';
      }
      
      await setDoc(doc(db, collectionName, itemId), newData);
    }
    
    return true;
  } catch (error) {
    console.error(`Error agregando/actualizando ${collectionName}:`, error);
    return false;
  }
}

/**
 * Inicializa los datos predefinidos en la base de datos (solo si no existen)
 * Ahora usa IDs determinísticos basados en nombres para prevenir duplicados
 */
export const initializePredefinedData = async () => {
  try {
    // Primero, deduplicar colecciones existentes
    console.log('🔍 Verificando y eliminando duplicados...');
    await Promise.all([
      deduplicateCollection('programs'),
      deduplicateCollection('modules'),
      deduplicateCollection('modalities')
    ]);
    
    // Verificar si ya existen datos
    const programsSnapshot = await getDocs(collection(db, 'programs'));
    const modulesSnapshot = await getDocs(collection(db, 'modules'));
    const modalitiesSnapshot = await getDocs(collection(db, 'modalities'));
    
    // Si ya existen datos, no hacer nada más
    if (!programsSnapshot.empty && !modulesSnapshot.empty && !modalitiesSnapshot.empty) {
      console.log('✅ Datos predefinidos ya existen en Firestore');
      return;
    }
    
    console.log('📦 Inicializando datos predefinidos en Firestore...');
    
    // Programas predefinidos
    const programs = [
      'ESCUELA DE PROMOTORES',
      'INDUSTRIA LIMPIA',
      'ESCUELA DE ADMINISTRADORES',
      'LEALTAD',
      'RED VIRTUAL',
      'EDS CONFIABLE',
      'RUMBO',
      'ESCUELA DE TIENDAS',
      'PROYECTO',
      '-'
    ];
    
    // Módulos predefinidos con sus colores (normalizados a HEX)
    const modules = [
      { name: 'Acompañamiento', color: '#EDF9F9' },
      { name: 'Actualización de Contenidos', color: '#46646B' },
      { name: 'App Terpel', color: '#68b645' },
      { name: 'Campo de Entrenamiento de Industria Limpia', color: '#74C48C' },
      { name: 'Canastilla', color: '#68b645' },
      { name: 'Caravana Rumbo PITS', color: '#bda42f' },
      { name: 'Capacitación Bucaros', color: '#ea580c' },
      { name: 'Clientes Propios Administrativo', color: '#68b645' },
      { name: 'Construyendo Equipos Altamente Efectivos', color: '#638287' },
      { name: 'EDS Confiable', color: '#12b19f' },
      { name: 'Entrenamiento Terpel POS Administrativo', color: '#68b645' },
      { name: 'Entrenamiento Terpel POS Operativo', color: '#68b645' },
      { name: 'Excelencia Administrativa', color: '#638287' },
      { name: 'Facturación Electrónica Administrativa', color: '#68b645' },
      { name: 'Facturación Electrónica Operativa', color: '#68b645' },
      { name: 'Festivo', color: '#46646B' },
      { name: 'Formación Inicial Terpel POS Administrativo', color: '#68b645' },
      { name: 'Formación Inicial Terpel POS Operativo', color: '#68b645' },
      { name: 'Gestión Administrativa', color: '#46646B' },
      { name: 'Gestión Ambiental, Seguridad y Salud en el Trabajo', color: '#e96f24' },
      { name: 'La Toma Vive Terpel & Vive PITS', color: '#1f4299' },
      { name: 'Masterlub Administrativo', color: '#68b645' },
      { name: 'Masterlub Operativo', color: '#68b645' },
      { name: 'Módulo Bebidas Calientes', color: '#f8945c' },
      { name: 'Módulo Escuela de Industria', color: '#9bcb48' },
      { name: 'Módulo Formativo GNV', color: '#9bcb48' },
      { name: 'Módulo Formativo Líquidos', color: '#f7f06d' },
      { name: 'Módulo Formativo Lubricantes', color: '#1ac0f2' },
      { name: 'Módulo Historia y Masa', color: '#f8945c' },
      { name: 'Módulo Perros y Más Perros', color: '#f8945c' },
      { name: 'Módulo Protagonistas del Servicio', color: '#b01a4e' },
      { name: 'Módulo Rollos', color: '#f8945c' },
      { name: 'Módulo Sánduches', color: '#f8945c' },
      { name: 'Módulo Sbarro', color: '#f8945c' },
      { name: 'Módulo Strombolis', color: '#f8945c' },
      { name: 'Protocolo de Servicio EDS', color: '#FF0818' },
      { name: 'Taller EDS Confiable', color: '#12b19f' },
      { name: 'Traslado', color: '#ca8a04' },
      { name: 'Vacaciones', color: '#db2777' },
      { name: 'Vive PITS', color: '#9333ea' },
      { name: 'UDVA P', color: '#dcd4b4' },
      { name: 'Módulo Elementos ambientalmente sensibles', color: '#EC447C' },
      { name: 'Módulo Control de derrames y atención de emergencias', color: '#EC447C' },
      { name: 'Módulo Control de calidad', color: '#EC447C' },
      { name: 'Módulo Medida exacta', color: '#EC447C' },
      { name: 'Módulo Control de incendios', color: '#EC447C' },
      { name: 'Módulo Comportamiento seguro', color: '#EC447C' },
      { name: 'Módulo Primeros auxilios', color: '#EC447C' },
      { name: 'Módulo Investigación de accidentes', color: '#EC447C' },
      { name: 'Bogotá', color: '#12b19f' },
      { name: 'Barranquilla', color: '#12b19f' },
      { name: 'Empleados Terpel', color: '#C48E35' },
      { name: 'Seguimiento Apertura', color: '#0d9488' },
      { name: 'Entrenamiento Tienda', color: '#f8945c' },
      { name: 'Preparación de Formación', color: '#2563eb' }
    ];
    
    // Modalidades predefinidas
    const modalities = [
      'Presencial',
      'Virtual'
    ];
    
    // Agregar programas
    for (const program of programs) {
      await addOrUpdateItem('programs', program);
    }
    
    // Agregar módulos
    for (const module of modules) {
      await addOrUpdateItem('modules', module.name, module.color);
    }
    
    // Agregar modalidades
    for (const modality of modalities) {
      await addOrUpdateItem('modalities', modality);
    }
    
    console.log('✅ Datos predefinidos inicializados/actualizados exitosamente en Firestore');
  } catch (error) {
    console.error('Error inicializando datos predefinidos:', error);
  }
}; 