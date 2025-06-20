import { atom } from 'nanostores';
import { 
  initializeDataIfNeeded, 
  saveDraftData, 
  publishData, 
  subscribeToDraftData, 
  subscribeToPublishedData,
  getDraftData,
  getPublishedData
} from '../lib/firestore';

// --- INTERFACES ---
export interface Event {
  id: string;
  title: string;
  details: string | string[];
  time?: string;
  location: string;
  color: string;
}

export interface Instructor {
  id: string;
  name: string;
  city: string;
  regional: string;
}

export interface ScheduleRow {
  id: string;
  instructor: string;
  city: string;
  regional: string;
  events: {
    [day: string]: Event[];
  };
}

export interface GlobalConfig {
  title: string;
  currentWeek: {
    startDate: string;
    endDate: string;
  };
}

// --- DATOS INICIALES ---
const initialInstructors: Instructor[] = [
  { id: 'instructor-1', name: 'JUAN PABLO HERNANDEZ', city: 'Bucaramanga', regional: 'BUCARAMANGA' },
  { id: 'instructor-2', name: 'ZULAY VERA', city: 'Cúcuta', regional: 'NORTE' },
];

const initialScheduleRows: ScheduleRow[] = [
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
];

const initialGlobalConfig: GlobalConfig = {
  title: 'Cronograma Junio 2024',
  currentWeek: {
    startDate: '2024-06-24',
    endDate: '2024-06-28'
  }
};

// --- ESTADO (DRAFT & PUBLISHED) ---
export const draftInstructors = atom<Instructor[]>(initialInstructors);
export const draftScheduleRows = atom<ScheduleRow[]>(initialScheduleRows);
export const draftGlobalConfig = atom<GlobalConfig>(initialGlobalConfig);

export const publishedInstructors = atom<Instructor[]>(initialInstructors);
export const publishedScheduleRows = atom<ScheduleRow[]>(initialScheduleRows);
export const publishedGlobalConfig = atom<GlobalConfig>(initialGlobalConfig);

export const hasUnpublishedChanges = atom<boolean>(false);
export const isConnected = atom<boolean>(false);

// --- INICIALIZACIÓN DE FIREBASE ---
let unsubscribeDraft: (() => void) | null = null;
let unsubscribePublished: (() => void) | null = null;

export async function initializeFirebase() {
  try {
    // Inicializar datos si no existen
    await initializeDataIfNeeded();
    
    // Suscribirse a cambios en tiempo real
    unsubscribeDraft = subscribeToDraftData((data) => {
      draftInstructors.set(data.instructors);
      draftScheduleRows.set(data.scheduleRows);
      draftGlobalConfig.set(data.globalConfig);
      isConnected.set(true);
    });

    unsubscribePublished = subscribeToPublishedData((data) => {
      publishedInstructors.set(data.instructors);
      publishedScheduleRows.set(data.scheduleRows);
      publishedGlobalConfig.set(data.globalConfig);
      isConnected.set(true);
    });

    console.log('Firebase inicializado correctamente');
  } catch (error) {
    console.error('Error inicializando Firebase:', error);
    isConnected.set(false);
  }
}

// Función para limpiar suscripciones
export function cleanupFirebase() {
  if (unsubscribeDraft) {
    unsubscribeDraft();
    unsubscribeDraft = null;
  }
  if (unsubscribePublished) {
    unsubscribePublished();
    unsubscribePublished = null;
  }
}

// --- LÓGICA DE PUBLICACIÓN ---
export async function publishChanges() {
  try {
    const currentDraftInstructors = draftInstructors.get();
    const currentDraftScheduleRows = draftScheduleRows.get();
    const currentDraftGlobalConfig = draftGlobalConfig.get();

    await publishData({
      instructors: currentDraftInstructors,
      scheduleRows: currentDraftScheduleRows,
      globalConfig: currentDraftGlobalConfig
    });

    hasUnpublishedChanges.set(false);
    console.log('Cambios publicados exitosamente!');
  } catch (error) {
    console.error('Error publicando cambios:', error);
    throw error;
  }
}

/**
 * Guarda el estado actual del borrador (draft) en Firebase.
 * Esto persiste los cambios para el administrador sin publicarlos.
 */
export async function saveDraftChanges(): Promise<void> {
  try {
    const currentDraftInstructors = draftInstructors.get();
    const currentDraftScheduleRows = draftScheduleRows.get();
    const currentDraftGlobalConfig = draftGlobalConfig.get();

    await saveDraftData({
      instructors: currentDraftInstructors,
      scheduleRows: currentDraftScheduleRows,
      globalConfig: currentDraftGlobalConfig
    });

    markAsDirty(); // Marca que hay cambios listos para ser publicados.
    console.log('Borrador guardado en Firebase.');
  } catch (error) {
    console.error('Error guardando borrador:', error);
    throw error;
  }
}

/**
 * Limpia todos los eventos del cronograma en el estado de borrador (draft).
 * Mantiene a los instructores y la configuración global.
 */
export function clearAllDraftEvents(): void {
  const currentRows = draftScheduleRows.get();
  
  const newRows = currentRows.map(row => ({
    ...row,
    events: {} // Limpia todos los eventos
  }));
  
  draftScheduleRows.set(newRows);
  console.log('Todas las actividades del borrador han sido eliminadas.');
}

// Función para limpiar todos los datos guardados
export function clearAllData(): void {
  // Resetear los stores a los valores iniciales
  draftInstructors.set(initialInstructors);
  draftScheduleRows.set(initialScheduleRows);
  draftGlobalConfig.set(initialGlobalConfig);
  publishedInstructors.set(initialInstructors);
  publishedScheduleRows.set(initialScheduleRows);
  publishedGlobalConfig.set(initialGlobalConfig);
  hasUnpublishedChanges.set(false);
  
  console.log('Todos los datos han sido limpiados y reseteados a los valores iniciales');
}

function markAsDirty() {
  hasUnpublishedChanges.set(true);
}

// --- FUNCIONES DE EDICIÓN (Modifican el estado DRAFT) ---
export function updateEvent(rowId: string, day: string, updatedEvent: Event) {
    const newRows = draftScheduleRows.get().map(row => {
        if (row.id === rowId && row.events[day]) {
            const newEvents = row.events[day].map(e => e.id === updatedEvent.id ? updatedEvent : e);
            return { ...row, events: { ...row.events, [day]: newEvents } };
        }
        return row;
    });
    draftScheduleRows.set(newRows);
}

export function moveEvent(eventId: string, fromRowId: string, fromDay: string, toRowId: string, toDay: string) {
    let eventToMove: Event | null = null;
    let tempRows = draftScheduleRows.get();

    // Extraer el evento
    tempRows = tempRows.map(row => {
        if (row.id === fromRowId && row.events[fromDay]) {
            eventToMove = row.events[fromDay].find(e => e.id === eventId) || null;
            if (eventToMove) {
                const newDayEvents = row.events[fromDay].filter(e => e.id !== eventId);
                return { ...row, events: { ...row.events, [fromDay]: newDayEvents }};
            }
        }
        return row;
    });

    if (!eventToMove) return;

    // Insertar el evento
    tempRows = tempRows.map(row => {
        if (row.id === toRowId) {
            const newDayEvents = row.events[toDay] ? [...row.events[toDay]] : [];
            newDayEvents.push(eventToMove!);
            return { ...row, events: { ...row.events, [toDay]: newDayEvents }};
        }
        return row;
    });

    draftScheduleRows.set(tempRows);
}

export function copyEvent(eventId: string, fromRowId: string, fromDay: string, toRowId: string, toDay: string) {
    const currentRows = draftScheduleRows.get();
    let originalEvent: Event | null = null;
    
    const fromRow = currentRows.find(r => r.id === fromRowId);
    if (fromRow && fromRow.events[fromDay]) {
        originalEvent = fromRow.events[fromDay].find(e => e.id === eventId) || null;
    }
    
    if (!originalEvent) return;

    const copiedEvent: Event = {
        ...originalEvent,
        id: `${originalEvent.id}-copy-${Date.now()}`
    };

    const newRows = currentRows.map(row => {
        if (row.id === toRowId) {
            const newDayEvents = row.events[toDay] ? [...row.events[toDay]] : [];
            newDayEvents.push(copiedEvent);
            return { ...row, events: { ...row.events, [toDay]: newDayEvents }};
        }
        return row;
    });

    draftScheduleRows.set(newRows);
}

export function deleteEvent(eventId: string, rowId: string, day: string) {
    const newRows = draftScheduleRows.get().map(row => {
        if (row.id === rowId && row.events[day]) {
            const newDayEvents = row.events[day].filter(e => e.id !== eventId);
            return { ...row, events: { ...row.events, [day]: newDayEvents } };
        }
        return row;
    });
    draftScheduleRows.set(newRows);
}

export function addEvent(rowId: string, day: string, newEvent: Event) {
    const newRows = draftScheduleRows.get().map(row => {
        if (row.id === rowId) {
            const newDayEvents = row.events[day] ? [...row.events[day]] : [];
            newDayEvents.push(newEvent);
            return { ...row, events: { ...row.events, [day]: newDayEvents } };
        }
        return row;
    });
    draftScheduleRows.set(newRows);
}

export function addInstructor(name: string, city: string, regional: string) {
    const newInstructor: Instructor = {
        id: `instructor-${Date.now()}`,
        name,
        city,
        regional
    };
    
    const currentInstructors = draftInstructors.get();
    draftInstructors.set([...currentInstructors, newInstructor]);
    
    // Agregar fila correspondiente al cronograma
    const newRow: ScheduleRow = {
        id: newInstructor.id,
        instructor: name,
        city,
        regional,
        events: {}
    };
    
    const currentRows = draftScheduleRows.get();
    draftScheduleRows.set([...currentRows, newRow]);
}

export function updateInstructor(id: string, name: string, city: string, regional: string) {
    const newInstructors = draftInstructors.get().map(instructor => 
        instructor.id === id ? { ...instructor, name, city, regional } : instructor
    );
    draftInstructors.set(newInstructors);
    
    // Actualizar fila correspondiente en el cronograma
    const newRows = draftScheduleRows.get().map(row => 
        row.id === id ? { ...row, instructor: name, city, regional } : row
    );
    draftScheduleRows.set(newRows);
}

export function deleteInstructor(id: string) {
    const newInstructors = draftInstructors.get().filter(instructor => instructor.id !== id);
    draftInstructors.set(newInstructors);
    
    // Eliminar fila correspondiente del cronograma
    const newRows = draftScheduleRows.get().filter(row => row.id !== id);
    draftScheduleRows.set(newRows);
}

export function updateTitle(newTitle: string) {
    const currentConfig = draftGlobalConfig.get();
    draftGlobalConfig.set({ ...currentConfig, title: newTitle });
}

export function updateWeek(startDate: string, endDate: string) {
    const currentConfig = draftGlobalConfig.get();
    draftGlobalConfig.set({ 
        ...currentConfig, 
        currentWeek: { startDate, endDate } 
    });
}

// Función para verificar conflictos de horario
export function checkTimeConflict(eventId: string, rowId: string, day: string, time: string): { hasConflict: boolean; conflictingEvent?: Event } {
    if (!time) return { hasConflict: false };
    
    const currentRows = draftScheduleRows.get();
    const targetRow = currentRows.find(row => row.id === rowId);
    
    if (!targetRow || !targetRow.events[day]) {
        return { hasConflict: false };
    }
    
    const conflictingEvent = targetRow.events[day].find(event => 
        event.id !== eventId && event.time === time
    );
    
    return {
        hasConflict: !!conflictingEvent,
        conflictingEvent
    };
}

// --- SELECTORES Y UTILIDADES ---
export const timeSlots = [
    { value: '', label: 'Sin horario específico' },
    { value: '6:00 a.m. a 7:00 a.m.', label: '6:00 a.m. - 7:00 a.m.' },
    { value: '7:00 a.m. a 8:00 a.m.', label: '7:00 a.m. - 8:00 a.m.' },
    { value: '8:00 a.m. a 9:00 a.m.', label: '8:00 a.m. - 9:00 a.m.' },
    { value: '9:00 a.m. a 10:00 a.m.', label: '9:00 a.m. - 10:00 a.m.' },
    { value: '10:00 a.m. a 11:00 a.m.', label: '10:00 a.m. - 11:00 a.m.' },
    { value: '11:00 a.m. a 12:00 p.m.', label: '11:00 a.m. - 12:00 p.m.' },
    { value: '12:00 p.m. a 1:00 p.m.', label: '12:00 p.m. - 1:00 p.m.' },
    { value: '1:00 p.m. a 2:00 p.m.', label: '1:00 p.m. - 2:00 p.m.' },
    { value: '2:00 p.m. a 3:00 p.m.', label: '2:00 p.m. - 3:00 p.m.' },
    { value: '3:00 p.m. a 4:00 p.m.', label: '3:00 p.m. - 4:00 p.m.' },
    { value: '4:00 p.m. a 5:00 p.m.', label: '4:00 p.m. - 5:00 p.m.' },
    { value: '5:00 p.m. a 6:00 p.m.', label: '5:00 p.m. - 6:00 p.m.' },
];

// Horarios individuales para inicio y fin
export const startTimes = [
    { value: '', label: 'Sin horario específico' },
    { value: '6:00 a.m.', label: '6:00 a.m.' },
    { value: '7:00 a.m.', label: '7:00 a.m.' },
    { value: '8:00 a.m.', label: '8:00 a.m.' },
    { value: '9:00 a.m.', label: '9:00 a.m.' },
    { value: '10:00 a.m.', label: '10:00 a.m.' },
    { value: '11:00 a.m.', label: '11:00 a.m.' },
    { value: '12:00 p.m.', label: '12:00 p.m.' },
    { value: '1:00 p.m.', label: '1:00 p.m.' },
    { value: '2:00 p.m.', label: '2:00 p.m.' },
    { value: '3:00 p.m.', label: '3:00 p.m.' },
    { value: '4:00 p.m.', label: '4:00 p.m.' },
    { value: '5:00 p.m.', label: '5:00 p.m.' },
    { value: '6:00 p.m.', label: '6:00 p.m.' },
];

export const endTimes = [
    { value: '', label: 'Sin horario específico' },
    { value: '6:00 a.m.', label: '6:00 a.m.' },
    { value: '7:00 a.m.', label: '7:00 a.m.' },
    { value: '8:00 a.m.', label: '8:00 a.m.' },
    { value: '9:00 a.m.', label: '9:00 a.m.' },
    { value: '10:00 a.m.', label: '10:00 a.m.' },
    { value: '11:00 a.m.', label: '11:00 a.m.' },
    { value: '12:00 p.m.', label: '12:00 p.m.' },
    { value: '1:00 p.m.', label: '1:00 p.m.' },
    { value: '2:00 p.m.', label: '2:00 p.m.' },
    { value: '3:00 p.m.', label: '3:00 p.m.' },
    { value: '4:00 p.m.', label: '4:00 p.m.' },
    { value: '5:00 p.m.', label: '5:00 p.m.' },
    { value: '6:00 p.m.', label: '6:00 p.m.' },
];

export const regionalOptions = [
    'ANTIOQUIA',
    'BUCARAMANGA', 
    'CENTRO',
    'NORTE',
    'OCCIDENTE',
    'SABANA',
    'SUR'
]; 