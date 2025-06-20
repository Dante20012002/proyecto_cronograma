import { atom } from 'nanostores';

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

// --- FUNCIONES DE PERSISTENCIA ---
function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn(`Error loading from localStorage for key "${key}":`, error);
  }
  return defaultValue;
}

function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`Error saving to localStorage for key "${key}":`, error);
  }
}

// Función para limpiar todos los datos guardados
export function clearAllData(): void {
  if (typeof window === 'undefined') return;
  
  const keys = [
    'cronograma_draft_instructors',
    'cronograma_draft_schedule_rows', 
    'cronograma_draft_global_config',
    'cronograma_published_instructors',
    'cronograma_published_schedule_rows',
    'cronograma_published_global_config'
  ];
  
  keys.forEach(key => localStorage.removeItem(key));
  
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

/**
 * Guarda el estado actual del borrador (draft) en el localStorage.
 * Esto persiste los cambios para el administrador sin publicarlos.
 */
export function saveDraftChanges(): void {
  if (typeof window === 'undefined') return;

  const currentDraftInstructors = draftInstructors.get();
  const currentDraftScheduleRows = draftScheduleRows.get();
  const currentDraftGlobalConfig = draftGlobalConfig.get();

  saveToStorage('cronograma_draft_instructors', currentDraftInstructors);
  saveToStorage('cronograma_draft_schedule_rows', currentDraftScheduleRows);
  saveToStorage('cronograma_draft_global_config', currentDraftGlobalConfig);

  markAsDirty(); // Marca que hay cambios listos para ser publicados.
  console.log('Borrador guardado en localStorage.');
}

/**
 * Limpia todos los eventos del cronograma en el estado de borrador (draft).
 * Mantiene a los instructores y la configuración global.
 */
export function clearAllDraftEvents(): void {
  if (typeof window === 'undefined') return;

  const currentRows = draftScheduleRows.get();
  
  const newRows = currentRows.map(row => ({
    ...row,
    events: {} // Limpia todos los eventos
  }));
  
  draftScheduleRows.set(newRows);
  // Los cambios se deben guardar manualmente ahora
  // saveToStorage('cronograma_draft_schedule_rows', newRows);
  // markAsDirty(); 
  
  console.log('Todas las actividades del borrador han sido eliminadas.');
}

// --- ESTADO (DRAFT & PUBLISHED) ---
// Cargar datos guardados o usar los iniciales
const savedDraftInstructors = loadFromStorage('cronograma_draft_instructors', initialInstructors);
const savedDraftScheduleRows = loadFromStorage('cronograma_draft_schedule_rows', initialScheduleRows);
const savedDraftGlobalConfig = loadFromStorage('cronograma_draft_global_config', initialGlobalConfig);

const savedPublishedInstructors = loadFromStorage('cronograma_published_instructors', initialInstructors);
const savedPublishedScheduleRows = loadFromStorage('cronograma_published_schedule_rows', initialScheduleRows);
const savedPublishedGlobalConfig = loadFromStorage('cronograma_published_global_config', initialGlobalConfig);

export const draftInstructors = atom<Instructor[]>(savedDraftInstructors);
export const draftScheduleRows = atom<ScheduleRow[]>(savedDraftScheduleRows);
export const draftGlobalConfig = atom<GlobalConfig>(savedDraftGlobalConfig);

export const publishedInstructors = atom<Instructor[]>(savedPublishedInstructors);
export const publishedScheduleRows = atom<ScheduleRow[]>(savedPublishedScheduleRows);
export const publishedGlobalConfig = atom<GlobalConfig>(savedPublishedGlobalConfig);

export const hasUnpublishedChanges = atom<boolean>(false);

// --- LÓGICA DE PUBLICACIÓN ---
export function publishChanges() {
  const currentDraftInstructors = draftInstructors.get();
  const currentDraftScheduleRows = draftScheduleRows.get();
  const currentDraftGlobalConfig = draftGlobalConfig.get();

  publishedInstructors.set(JSON.parse(JSON.stringify(currentDraftInstructors)));
  publishedScheduleRows.set(JSON.parse(JSON.stringify(currentDraftScheduleRows)));
  publishedGlobalConfig.set(JSON.parse(JSON.stringify(currentDraftGlobalConfig)));
  
  // Guardar en localStorage
  saveToStorage('cronograma_published_instructors', currentDraftInstructors);
  saveToStorage('cronograma_published_schedule_rows', currentDraftScheduleRows);
  saveToStorage('cronograma_published_global_config', currentDraftGlobalConfig);
  
  hasUnpublishedChanges.set(false);
  console.log('Cambios publicados y guardados!');
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
    // saveToStorage('cronograma_draft_schedule_rows', newRows);
    // markAsDirty();
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
    // saveToStorage('cronograma_draft_schedule_rows', tempRows);
    // markAsDirty();
}

export function copyEvent(eventId: string, fromRowId: string, fromDay: string, toRowId: string, toDay: string) {
    const currentRows = draftScheduleRows.get();
    let originalEvent: Event | null = null;
    
    const fromRow = currentRows.find(r => r.id === fromRowId);
    if (fromRow && fromRow.events[fromDay]) {
        originalEvent = fromRow.events[fromDay].find(e => e.id === eventId) || null;
    }
    
    if (!originalEvent) return;

    const newEvent: Event = { ...originalEvent, id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };

    const newRows = currentRows.map(row => {
        if (row.id === toRowId) {
            const newDayEvents = row.events[toDay] ? [...row.events[toDay]] : [];
            newDayEvents.push(newEvent);
            return { ...row, events: { ...row.events, [toDay]: newDayEvents }};
        }
        return row;
    });

    draftScheduleRows.set(newRows);
    // saveToStorage('cronograma_draft_schedule_rows', newRows);
    // markAsDirty();
}

export function deleteEvent(eventId: string, rowId: string, day: string) {
    const newRows = draftScheduleRows.get().map(row => {
        if (row.id === rowId && row.events[day]) {
            const updatedDayEvents = row.events[day].filter(e => e.id !== eventId);
            return { ...row, events: { ...row.events, [day]: updatedDayEvents }};
        }
        return row;
    });
    draftScheduleRows.set(newRows);
    // saveToStorage('cronograma_draft_schedule_rows', newRows);
    // markAsDirty();
}

export function addEvent(rowId: string, day: string, newEvent: Event) {
    const newRows = draftScheduleRows.get().map(row => {
        if (row.id === rowId) {
            const currentDayEvents = row.events[day] || [];
            const updatedDayEvents = [...currentDayEvents, newEvent];
            return { ...row, events: { ...row.events, [day]: updatedDayEvents }};
        }
        return row;
    });
    draftScheduleRows.set(newRows);
    // saveToStorage('cronograma_draft_schedule_rows', newRows);
    // markAsDirty();
}

export function addInstructor(name: string, city: string, regional: string) {
    const newInstructor: Instructor = { id: `inst-${Date.now()}`, name: name.toUpperCase(), city, regional };
    const newInstructors = [...draftInstructors.get(), newInstructor];
    draftInstructors.set(newInstructors);
    // saveToStorage('cronograma_draft_instructors', newInstructors);

    const newRow: ScheduleRow = { id: newInstructor.id, instructor: newInstructor.name, city: newInstructor.city, regional: newInstructor.regional, events: {} };
    const newRows = [...draftScheduleRows.get(), newRow];
    draftScheduleRows.set(newRows);
    // saveToStorage('cronograma_draft_schedule_rows', newRows);
    // markAsDirty();
}

export function updateInstructor(id: string, name: string, city: string, regional: string) {
    const newInstructors = draftInstructors.get().map(inst => (inst.id === id ? { ...inst, name: name.toUpperCase(), city, regional } : inst));
    draftInstructors.set(newInstructors);
    // saveToStorage('cronograma_draft_instructors', newInstructors);

    const newRows = draftScheduleRows.get().map(row => (row.id === id ? { ...row, instructor: name.toUpperCase(), city, regional } : row));
    draftScheduleRows.set(newRows);
    // saveToStorage('cronograma_draft_schedule_rows', newRows);
    // markAsDirty();
}

export function deleteInstructor(id: string) {
    const newInstructors = draftInstructors.get().filter(inst => inst.id !== id);
    draftInstructors.set(newInstructors);
    // saveToStorage('cronograma_draft_instructors', newInstructors);

    const newRows = draftScheduleRows.get().filter(row => row.id !== id);
    draftScheduleRows.set(newRows);
    // saveToStorage('cronograma_draft_schedule_rows', newRows);
    // markAsDirty();
}

export function updateTitle(newTitle: string) {
    const newConfig = { ...draftGlobalConfig.get(), title: newTitle };
    draftGlobalConfig.set(newConfig);
    // saveToStorage('cronograma_draft_global_config', newConfig);
    // markAsDirty();
}

export function updateWeek(startDate: string, endDate: string) {
    const newConfig = { ...draftGlobalConfig.get(), currentWeek: { startDate, endDate } };
    draftGlobalConfig.set(newConfig);
    // saveToStorage('cronograma_draft_global_config', newConfig);
    // markAsDirty();
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

export function checkTimeConflict(eventId: string, rowId: string, day: string, time: string): { hasConflict: boolean; conflictingEvent?: Event } {
    const row = draftScheduleRows.get().find(r => r.id === rowId);
    if (!row || !row.events[day] || !time) return { hasConflict: false };

    for (const event of row.events[day]) {
        if (event.id === eventId) continue;
        if (event.time === time) {
            return { hasConflict: true, conflictingEvent: event };
        }
    }
    return { hasConflict: false };
} 