import { signal } from '@preact/signals';
import { 
  initializeDataIfNeeded, 
  saveDraftData, 
  publishData, 
  subscribeToDraftData as subscribeToFirestoreDraft, 
  subscribeToPublishedData as subscribeToFirestorePublished,
  getDraftData as getFirestoreDraftData,
  getPublishedData as getFirestorePublishedData,
  logOperation
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

// --- CONSTANTES DE TIEMPO ---
export const startTimes = [
  '7:00 a.m.',
  '7:30 a.m.',
  '8:00 a.m.',
  '8:30 a.m.',
  '9:00 a.m.',
  '9:30 a.m.',
  '10:00 a.m.',
  '10:30 a.m.',
  '11:00 a.m.',
  '11:30 a.m.',
  '12:00 p.m.',
  '12:30 p.m.',
  '1:00 p.m.',
  '1:30 p.m.',
  '2:00 p.m.',
  '2:30 p.m.',
  '3:00 p.m.',
  '3:30 p.m.',
  '4:00 p.m.',
  '4:30 p.m.',
  '5:00 p.m.',
  '5:30 p.m.',
  '6:00 p.m.'
];

export const endTimes = [
  '8:00 a.m.',
  '8:30 a.m.',
  '9:00 a.m.',
  '9:30 a.m.',
  '10:00 a.m.',
  '10:30 a.m.',
  '11:00 a.m.',
  '11:30 a.m.',
  '12:00 p.m.',
  '12:30 p.m.',
  '1:00 p.m.',
  '1:30 p.m.',
  '2:00 p.m.',
  '2:30 p.m.',
  '3:00 p.m.',
  '3:30 p.m.',
  '4:00 p.m.',
  '4:30 p.m.',
  '5:00 p.m.',
  '5:30 p.m.',
  '6:00 p.m.',
  '6:30 p.m.',
  '7:00 p.m.'
];

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
  title: 'Cronograma 2025',
  currentWeek: {
    startDate: '2024-06-24',
    endDate: '2024-06-28'
  }
};

// --- ESTADO (DRAFT & PUBLISHED) ---
export const draftInstructors = signal<Instructor[]>(initialInstructors);
export const draftScheduleRows = signal<ScheduleRow[]>(initialScheduleRows);
export const draftGlobalConfig = signal<GlobalConfig>(initialGlobalConfig);

export const publishedInstructors = signal<Instructor[]>(initialInstructors);
export const publishedScheduleRows = signal<ScheduleRow[]>(initialScheduleRows);
export const publishedGlobalConfig = signal<GlobalConfig>(initialGlobalConfig);

export const hasUnpublishedChanges = signal<boolean>(false);
export const isConnected = signal<boolean>(false);

// Función auxiliar para obtener la semana inicial
function getInitialWeek(): { startDate: string; endDate: string } {
  try {
    const config = publishedGlobalConfig.value;
    return {
      startDate: config.currentWeek.startDate,
      endDate: config.currentWeek.endDate
    };
  } catch (error) {
    console.error('Error al inicializar selectedWeek:', error);
    // Valores por defecto en caso de error
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 4);

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      startDate: formatDate(today),
      endDate: formatDate(endDate)
    };
  }
}

// Estado para la semana seleccionada en la vista de usuario
export const selectedWeek = signal<{ startDate: string; endDate: string }>(getInitialWeek());

// --- INICIALIZACIÓN DE FIREBASE ---
let unsubscribeDraft: (() => void) | null = null;
let unsubscribePublished: (() => void) | null = null;

export async function initializeFirebase() {
  try {
    // Inicializar datos si no existen
    await initializeDataIfNeeded();
    
    // Suscribirse a cambios en tiempo real
    unsubscribeDraft = subscribeToFirestoreDraft((data) => {
      draftInstructors.value = data.instructors;
      draftScheduleRows.value = data.scheduleRows;
      draftGlobalConfig.value = data.globalConfig;
      isConnected.value = true;
    });

    unsubscribePublished = subscribeToFirestorePublished((data) => {
      publishedInstructors.value = data.instructors;
      publishedScheduleRows.value = data.scheduleRows;
      publishedGlobalConfig.value = data.globalConfig;
      isConnected.value = true;
    });

    console.log('Firebase inicializado correctamente');
  } catch (error) {
    console.error('Error inicializando Firebase:', error);
    isConnected.value = false;
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
    const currentDraftInstructors = draftInstructors.value;
    const currentDraftScheduleRows = draftScheduleRows.value;
    const currentDraftGlobalConfig = draftGlobalConfig.value;

    // Intentar publicar los cambios
    const saveSuccess = await publishData({
      instructors: currentDraftInstructors,
      scheduleRows: currentDraftScheduleRows,
      globalConfig: currentDraftGlobalConfig
    });

    if (!saveSuccess) {
      throw new Error('No se pudieron publicar los cambios después de varios intentos');
    }

    // Esperar un momento para asegurar que Firebase procese los cambios
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar que los datos se publicaron correctamente
    const publishedData = await getFirestorePublishedData();
    if (!publishedData) {
      throw new Error('No se pudo verificar la publicación de datos');
    }

    // Actualizar el estado local
    publishedInstructors.value = currentDraftInstructors;
    publishedScheduleRows.value = currentDraftScheduleRows;
    publishedGlobalConfig.value = currentDraftGlobalConfig;
    hasUnpublishedChanges.value = false;

    return true;
  } catch (error) {
    console.error('Error al publicar cambios:', error);
    return false;
  }
}

// --- OPERACIONES DE DRAFT ---
export async function saveDraftChanges() {
  try {
    const success = await saveDraftData({
      instructors: draftInstructors.value,
      scheduleRows: draftScheduleRows.value,
      globalConfig: draftGlobalConfig.value
    });

    if (success) {
      hasUnpublishedChanges.value = true;
    }

    return success;
  } catch (error) {
    console.error('Error al guardar borrador:', error);
    return false;
  }
}

export function clearAllDraftEvents() {
  const updatedRows = draftScheduleRows.value.map(row => ({
    ...row,
    events: {}
  }));
  
  draftScheduleRows.value = updatedRows;
  hasUnpublishedChanges.value = true;
}

export function clearAllData() {
  draftInstructors.value = [];
  draftScheduleRows.value = [];
  draftGlobalConfig.value = initialGlobalConfig;
  publishedInstructors.value = [];
  publishedScheduleRows.value = [];
  publishedGlobalConfig.value = initialGlobalConfig;
  hasUnpublishedChanges.value = false;
}

function markAsDirty() {
  hasUnpublishedChanges.value = true;
}

// --- OPERACIONES DE EVENTOS ---
export function updateEvent(rowId: string, day: string, updatedEvent: Event) {
  const rows = [...draftScheduleRows.value];
  const rowIndex = rows.findIndex(row => row.id === rowId);
  
  if (rowIndex !== -1) {
    const row = rows[rowIndex];
    const events = row.events[day] || [];
    const eventIndex = events.findIndex(e => e.id === updatedEvent.id);
    
    if (eventIndex !== -1) {
      events[eventIndex] = updatedEvent;
      row.events[day] = events;
      rows[rowIndex] = row;
      draftScheduleRows.value = rows;
      markAsDirty();
    }
  }
}

export function deleteEvent(rowId: string, day: string, eventId: string) {
  const rows = [...draftScheduleRows.value];
  const rowIndex = rows.findIndex(row => row.id === rowId);
  
  if (rowIndex !== -1) {
    const row = rows[rowIndex];
    const events = row.events[day] || [];
    row.events[day] = events.filter(e => e.id !== eventId);
    rows[rowIndex] = row;
    draftScheduleRows.value = rows;
    markAsDirty();
  }
}

export function addEvent(rowId: string, day: string, newEvent: Event) {
  const rows = [...draftScheduleRows.value];
  const rowIndex = rows.findIndex(row => row.id === rowId);
  
  if (rowIndex !== -1) {
    const row = rows[rowIndex];
    const events = row.events[day] || [];
    events.push(newEvent);
    row.events[day] = events;
    rows[rowIndex] = row;
    draftScheduleRows.value = rows;
    markAsDirty();
  }
}

// --- OPERACIONES DE INSTRUCTORES ---
export function addInstructor(name: string, city: string, regional: string) {
  const newInstructor: Instructor = {
    id: `instructor-${Date.now()}`,
    name,
    city,
    regional
  };

  const newRow: ScheduleRow = {
    id: newInstructor.id,
    instructor: name,
    city,
    regional,
    events: {}
  };

  draftInstructors.value = [...draftInstructors.value, newInstructor];
  draftScheduleRows.value = [...draftScheduleRows.value, newRow];
  markAsDirty();
}

export function updateInstructor(id: string, name: string, city: string, regional: string) {
  const instructors = [...draftInstructors.value];
  const rows = [...draftScheduleRows.value];
  
  const instructorIndex = instructors.findIndex(i => i.id === id);
  const rowIndex = rows.findIndex(r => r.id === id);
  
  if (instructorIndex !== -1 && rowIndex !== -1) {
    instructors[instructorIndex] = { ...instructors[instructorIndex], name, city, regional };
    rows[rowIndex] = { ...rows[rowIndex], instructor: name, city, regional };
    
    draftInstructors.value = instructors;
    draftScheduleRows.value = rows;
    markAsDirty();
  }
}

export function deleteInstructor(id: string) {
  draftInstructors.value = draftInstructors.value.filter(i => i.id !== id);
  draftScheduleRows.value = draftScheduleRows.value.filter(r => r.id !== id);
  markAsDirty();
}

// --- OPERACIONES DE CONFIGURACIÓN ---
export function updateTitle(newTitle: string) {
  draftGlobalConfig.value = { ...draftGlobalConfig.value, title: newTitle };
  markAsDirty();
}

export function updateWeek(startDate: string, endDate: string) {
  draftGlobalConfig.value = {
    ...draftGlobalConfig.value,
    currentWeek: { startDate, endDate }
  };
  markAsDirty();
}

// --- UTILIDADES ---
export function checkTimeConflict(
  rowId: string,
  day: string,
  startTime: string,
  endTime: string,
  excludeEventId?: string
): { hasConflict: boolean; conflictingEvent?: Event } {
  const row = draftScheduleRows.value.find(r => r.id === rowId);
  if (!row || !row.events[day]) return { hasConflict: false };

  const events = row.events[day].filter(e => e.id !== excludeEventId);
  
  // Convertir tiempos a minutos para facilitar la comparación
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  for (const event of events) {
    if (!event.time) continue;

    // Manejar eventos con múltiples sesiones
    const sessions = Array.isArray(event.time) ? event.time : [event.time];
    
    for (const session of sessions) {
      const { start: eventStart, end: eventEnd } = parseEventTime(session);
      const eventStartMinutes = timeToMinutes(eventStart);
      const eventEndMinutes = timeToMinutes(eventEnd);

      if (
        (startMinutes >= eventStartMinutes && startMinutes < eventEndMinutes) ||
        (endMinutes > eventStartMinutes && endMinutes <= eventEndMinutes) ||
        (startMinutes <= eventStartMinutes && endMinutes >= eventEndMinutes)
      ) {
        return { hasConflict: true, conflictingEvent: event };
      }
    }
  }

  return { hasConflict: false };
}

function timeToMinutes(time: string): number {
  // Extraer la hora y los minutos del formato "HH:mm a.m./p.m."
  const match = time.match(/(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.)/i);
  if (!match) return 0;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toLowerCase();

  // Ajustar las horas según el período
  if (period === 'p.m.' && hours !== 12) {
    hours += 12;
  } else if (period === 'a.m.' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

function parseEventTime(timeString: string): { start: string; end: string } {
  // Extraer tiempos de inicio y fin del formato "Presencial/Virtual - HH:mm a.m. a HH:mm p.m."
  const match = timeString.match(/(?:Presencial|Virtual)\s*-\s*(\d{1,2}:\d{2}\s*(?:a\.m\.|p\.m\.))(?:\s*a\s*)(\d{1,2}:\d{2}\s*(?:a\.m\.|p\.m\.))/i);
  
  if (match) {
    return {
      start: match[1],
      end: match[2]
    };
  }

  return { start: '8:00 a.m.', end: '5:00 p.m.' }; // Valores por defecto
}

export function navigateWeek(direction: 'prev' | 'next'): { startDate: string; endDate: string } {
  const isAdminUser = isAdmin.value;
  const currentWeek = isAdminUser ? draftGlobalConfig.value.currentWeek : selectedWeek.value;
  const startDate = new Date(currentWeek.startDate);
  const endDate = new Date(currentWeek.endDate);

  if (direction === 'prev') {
    startDate.setDate(startDate.getDate() - 7);
    endDate.setDate(endDate.getDate() - 7);
  } else {
    startDate.setDate(startDate.getDate() + 7);
    endDate.setDate(endDate.getDate() + 7);
  }

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const newDates = {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };

  // Actualizar el estado según el tipo de usuario
  if (isAdminUser) {
    draftGlobalConfig.value = {
      ...draftGlobalConfig.value,
      currentWeek: newDates
    };
  } else {
    selectedWeek.value = newDates;
  }

  return newDates;
}

export function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('es', { month: 'long' });
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
}

// --- FUNCIONES DE MANIPULACIÓN DE EVENTOS ---
export function moveEvent(
  eventId: string,
  fromRowId: string,
  fromDay: string,
  toRowId: string,
  toDay: string
) {
  try {
    const rows = draftScheduleRows.value;
    const fromRow = rows.find(row => row.id === fromRowId);
    const toRow = rows.find(row => row.id === toRowId);

    if (!fromRow || !toRow) {
      console.error('Filas no encontradas para mover el evento');
      return;
    }

    // Encontrar el evento en la fila de origen
    const fromEvents = fromRow.events[fromDay] || [];
    const eventIndex = fromEvents.findIndex(e => e.id === eventId);

    if (eventIndex === -1) {
      console.error('Evento no encontrado en la fila de origen');
      return;
    }

    // Obtener el evento y eliminarlo de la fila de origen
    const event = fromEvents[eventIndex];
    fromEvents.splice(eventIndex, 1);

    // Inicializar el array de eventos del día destino si no existe
    if (!toRow.events[toDay]) {
      toRow.events[toDay] = [];
    }

    // Agregar el evento a la fila destino
    toRow.events[toDay].push(event);

    // Actualizar el estado
    draftScheduleRows.value = [...rows];
    markAsDirty();
    saveDraftChanges();
  } catch (error) {
    console.error('Error al mover el evento:', error);
  }
}

export function copyEvent(
  eventId: string,
  fromRowId: string,
  fromDay: string,
  toRowId: string,
  toDay: string
) {
  try {
    const rows = draftScheduleRows.value;
    const fromRow = rows.find(row => row.id === fromRowId);
    const toRow = rows.find(row => row.id === toRowId);

    if (!fromRow || !toRow) {
      console.error('Filas no encontradas para copiar el evento');
      return;
    }

    // Encontrar el evento en la fila de origen
    const fromEvents = fromRow.events[fromDay] || [];
    const event = fromEvents.find(e => e.id === eventId);

    if (!event) {
      console.error('Evento no encontrado en la fila de origen');
      return;
    }

    // Crear una copia del evento con un nuevo ID
    const newEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Inicializar el array de eventos del día destino si no existe
    if (!toRow.events[toDay]) {
      toRow.events[toDay] = [];
    }

    // Agregar la copia del evento a la fila destino
    toRow.events[toDay].push(newEvent);

    // Actualizar el estado
    draftScheduleRows.value = [...rows];
    markAsDirty();
    saveDraftChanges();
  } catch (error) {
    console.error('Error al copiar el evento:', error);
  }
}

// --- FUNCIONES DE ADMINISTRACIÓN ---
export const isAdmin = signal<boolean>(false);

export function updateDraftSchedule(newSchedule: ScheduleRow[]) {
  draftScheduleRows.value = newSchedule;
  markAsDirty();
  saveDraftChanges();
}

export function updateDraftEvent(rowId: string, day: string, eventId: string, updatedEvent: Event) {
  const rows = [...draftScheduleRows.value];
  const rowIndex = rows.findIndex(row => row.id === rowId);
  
  if (rowIndex !== -1) {
    const events = rows[rowIndex].events[day] || [];
    const eventIndex = events.findIndex(e => e.id === eventId);
    
    if (eventIndex !== -1) {
      events[eventIndex] = { ...updatedEvent };
      draftScheduleRows.value = rows;
      markAsDirty();
      saveDraftChanges();
    }
  }
} 