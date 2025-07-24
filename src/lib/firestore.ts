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
    console.log(`[Firebase Log] ${operation}:`, status, details);
  } catch (e) {
    console.error('Error logging to Firebase:', e);
  }
}

// Función para verificar la integridad de los datos
async function verifyDataIntegrity(data: FirestoreSchedule): Promise<boolean> {
  try {
    console.log('=== VERIFICANDO INTEGRIDAD DE DATOS ===');
    console.log('Datos a verificar:', {
      instructorsCount: data.instructors.length,
      scheduleRowsCount: data.scheduleRows.length,
      globalConfig: data.globalConfig
    });

    // Verificar que todos los instructores tienen una fila correspondiente
    const instructorIds = new Set(data.instructors.map(i => i.id));
    const rowIds = new Set(data.scheduleRows.map(r => r.id));
    
    console.log('IDs de instructores:', Array.from(instructorIds));
    console.log('IDs de filas:', Array.from(rowIds));
    
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
      console.log(`Verificando eventos de la fila: ${row.instructor} (${row.id})`);
      
      for (const [day, events] of Object.entries(row.events)) {
        console.log(`  Día ${day}: ${events.length} eventos`);
        
        for (const event of events) {
          totalEvents++;
          console.log(`    Evento: ${event.id} - ${event.title}`);
          
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

    console.log(`✅ Verificación exitosa: ${totalEvents} eventos únicos verificados`);
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
      console.log(`Reintentando guardar datos (intento ${currentTry + 1} de ${maxRetries})...`);
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
    currentWeek: getCurrentWeek()
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
      console.log('Datos de borrador inicializados');
    }

    if (!publishedDoc.exists()) {
      await setDoc(doc(db, 'schedule', PUBLISHED_DOC), initialData);
      console.log('Datos publicados inicializados');
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