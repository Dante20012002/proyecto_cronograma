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
 * Inicializa los datos predefinidos en la base de datos (solo si no existen)
 */
export const initializePredefinedData = async () => {
  try {
    // Verificar si ya existen datos
    const programsSnapshot = await getDocs(collection(db, 'programs'));
    const modulesSnapshot = await getDocs(collection(db, 'modules'));
    const modalitiesSnapshot = await getDocs(collection(db, 'modalities'));
    
    // Si ya existen datos, no hacer nada
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
    
    // Módulos predefinidos con sus colores
    const modules = [
      { name: 'Acompañamiento', color: 'bg-blue-600' },
      { name: 'Actualización de Contenidos', color: 'bg-blue-600' },
      { name: 'App Terpel', color: 'bg-purple-600' },
      { name: 'Campo de Entrenamiento de Industria Limpia', color: 'bg-green-600' },
      { name: 'Canastilla', color: 'bg-orange-600' },
      { name: 'Caravana Rumbo PITS', color: 'bg-purple-600' },
      { name: 'Capacitación Bucaros', color: 'bg-orange-600' },
      { name: 'Clientes Propios Administrativo', color: 'bg-indigo-600' },
      { name: 'Construyendo Equipos Altamente Efectivos', color: 'bg-green-600' },
      { name: 'EDS Confiable', color: 'bg-teal-600' },
      { name: 'Entrenamiento Terpel POS Administrativo', color: 'bg-orange-600' },
      { name: 'Entrenamiento Terpel POS Operativo', color: 'bg-orange-600' },
      { name: 'Excelencia Administrativa', color: 'bg-green-600' },
      { name: 'Facturación Electrónica Administrativa', color: 'bg-indigo-600' },
      { name: 'Facturación Electrónica Operativa', color: 'bg-indigo-600' },
      { name: 'Festivo', color: 'bg-red-600' },
      { name: 'Formación Inicial Terpel POS Administrativo', color: 'bg-orange-600' },
      { name: 'Formación Inicial Terpel POS Operativo', color: 'bg-orange-600' },
      { name: 'Gestión Administrativa', color: 'bg-green-600' },
      { name: 'Gestión Ambiental, Seguridad y Salud en el Trabajo', color: 'bg-green-600' },
      { name: 'La Toma Vive Terpel & Vive PITS', color: 'bg-purple-600' },
      { name: 'Masterlub Administrativo', color: 'bg-cyan-600' },
      { name: 'Masterlub Operativo', color: 'bg-cyan-600' },
      { name: 'Módulo Bebidas Calientes', color: 'bg-blue-600' },
      { name: 'Módulo Escuela de Industria', color: 'bg-blue-600' },
      { name: 'Módulo Formativo GNV', color: 'bg-blue-600' },
      { name: 'Módulo Formativo Líquidos', color: 'bg-blue-600' },
      { name: 'Módulo Formativo Lubricantes', color: 'bg-blue-600' },
      { name: 'Módulo Historia y Masa', color: 'bg-blue-600' },
      { name: 'Módulo Perros y Más Perros', color: 'bg-blue-600' },
      { name: 'Módulo Protagonistas del Servicio', color: 'bg-blue-600' },
      { name: 'Módulo Rollos', color: 'bg-blue-600' },
      { name: 'Módulo Sánduches', color: 'bg-blue-600' },
      { name: 'Módulo Sbarro', color: 'bg-blue-600' },
      { name: 'Módulo Strombolis', color: 'bg-blue-600' },
      { name: 'Protocolo de Servicio EDS', color: 'bg-green-600' },
      { name: 'Taller EDS Confiable', color: 'bg-teal-600' },
      { name: 'Traslado', color: 'bg-yellow-600' },
      { name: 'Vacaciones', color: 'bg-pink-600' },
      { name: 'Vive PITS', color: 'bg-purple-600' },
      { name: 'UDVA P', color: 'bg-indigo-600' },
      { name: 'Módulo Elementos ambientalmente sensibles', color: 'bg-green-600' },
      { name: 'Módulo Control de derrames y atención de emergencias', color: 'bg-green-600' },
      { name: 'Módulo Control de calidad', color: 'bg-green-600' },
      { name: 'Módulo Medida exacta', color: 'bg-green-600' },
      { name: 'Módulo Control de incendios', color: 'bg-red-600' },
      { name: 'Módulo Comportamiento seguro', color: 'bg-yellow-600' },
      { name: 'Módulo Primeros auxilios', color: 'bg-red-600' },
      { name: 'Módulo Investigación de accidentes', color: 'bg-orange-600' },
      { name: 'Bogotá', color: 'bg-indigo-600' },
      { name: 'Barranquilla', color: 'bg-cyan-600' },
      { name: 'Empleados Terpel', color: 'bg-purple-600' },
      { name: 'Seguimiento Apertura', color: 'bg-teal-600' },
      { name: 'Entrenamiento Tienda', color: 'bg-orange-600' },
      { name: 'Preparación de Formación', color: 'bg-blue-600' }
    ];
    
    // Modalidades predefinidas
    const modalities = [
      'Presencial',
      'Virtual'
    ];
    
    // Crear programas
    const batch = writeBatch(db);
    
    for (const program of programs) {
      const programId = `program-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const programRef = doc(db, 'programs', programId);
      batch.set(programRef, {
        name: program,
        active: true,
        createdAt: serverTimestamp(),
        createdBy: 'system'
      });
      await new Promise(resolve => setTimeout(resolve, 10)); // Pequeño delay para IDs únicos
    }
    
    // Crear módulos
    for (const module of modules) {
      const moduleId = `module-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const moduleRef = doc(db, 'modules', moduleId);
      batch.set(moduleRef, {
        name: module.name,
        color: module.color,
        active: true,
        createdAt: serverTimestamp(),
        createdBy: 'system'
      });
      await new Promise(resolve => setTimeout(resolve, 10)); // Pequeño delay para IDs únicos
    }
    
    // Crear modalidades
    for (const modality of modalities) {
      const modalityId = `modality-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const modalityRef = doc(db, 'modalities', modalityId);
      batch.set(modalityRef, {
        name: modality,
        active: true,
        createdAt: serverTimestamp(),
        createdBy: 'system'
      });
      await new Promise(resolve => setTimeout(resolve, 10)); // Pequeño delay para IDs únicos
    }
    
    await batch.commit();
    
    console.log('✅ Datos predefinidos inicializados exitosamente en Firestore');
  } catch (error) {
    console.error('Error inicializando datos predefinidos:', error);
  }
}; 