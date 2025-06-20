import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  collection,
  query,
  orderBy,
  serverTimestamp 
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

// Datos iniciales
const initialData: FirestoreSchedule = {
  instructors: [
    { id: 'instructor-1', name: 'JUAN PABLO HERNANDEZ', city: 'Bucaramanga', regional: 'BUCARAMANGA' },
    { id: 'instructor-2', name: 'ZULAY VERA', city: 'Cúcuta', regional: 'NORTE' },
  ],
  scheduleRows: [
    {
      id: 'instructor-1',
      instructor: 'JUAN PABLO HERNANDEZ',
      city: 'Bucaramanga',
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
      city: 'Cúcuta',
      regional: 'NORTE',
      events: {
        '26': [{ id: 'evt-4', title: 'NUEVO PROTOCOLO DE SERVICIO TERPEL', details: ['Sesión Virtual 1 - 8:00 a.m. a 9:30 a.m.', 'Sesión Virtual 2 - 10:30 a.m. a 12:00 p.m.', 'Sesión Virtual 3 - 2:30 p.m. a 4:00 p.m.'], location: 'Todas las Regionales', color: 'bg-rose-500' }],
        '27': [{ id: 'evt-5', title: 'VIVE TERPEL - VIVEPITS', details: ['Sesión Virtual 1 - 8:00 a.m. a 9:30 a.m.', 'Sesión Virtual 2 - 10:30 a.m. a 12:00 p.m.', 'Sesión Virtual 3 - 2:30 p.m. a 4:00 p.m.'], location: 'Todas las Regionales', color: 'bg-rose-500' }],
      }
    }
  ],
  globalConfig: {
    title: 'Cronograma Junio 2024',
    currentWeek: {
      startDate: '2024-06-24',
      endDate: '2024-06-28'
    }
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
}) {
  try {
    await setDoc(doc(db, 'schedule', DRAFT_DOC), {
      ...data,
      lastUpdated: serverTimestamp()
    });
    console.log('Borrador guardado en Firestore');
  } catch (error) {
    console.error('Error guardando borrador:', error);
    throw error;
  }
}

// Función para publicar cambios
export async function publishData(data: {
  instructors: Instructor[];
  scheduleRows: ScheduleRow[];
  globalConfig: GlobalConfig;
}) {
  try {
    await setDoc(doc(db, 'schedule', PUBLISHED_DOC), {
      ...data,
      lastUpdated: serverTimestamp()
    });
    console.log('Datos publicados en Firestore');
  } catch (error) {
    console.error('Error publicando datos:', error);
    throw error;
  }
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