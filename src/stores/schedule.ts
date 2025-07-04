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
  modalidad?: string; // Nueva propiedad para modalidad (Presencial, Virtual)
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

const initialGlobalConfig: GlobalConfig = {
  title: 'Cronograma 2025',
  currentWeek: getCurrentWeek()
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

// Señales para controlar operaciones concurrentes
export const isSaving = signal<boolean>(false);
export const isPublishing = signal<boolean>(false);
export const isProcessing = signal<boolean>(false);
export const canPublish = signal<boolean>(false); // Nueva señal para controlar cuándo se puede publicar

// Cola de operaciones para evitar race conditions
let operationQueue: (() => Promise<void>)[] = [];
let isProcessingQueue = false;

// Función para agregar operaciones a la cola
async function addToOperationQueue(operation: () => Promise<void>) {
  return new Promise<void>((resolve, reject) => {
    operationQueue.push(async () => {
      try {
        await operation();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    
    processOperationQueue();
  });
}

// Procesar la cola de operaciones secuencialmente
async function processOperationQueue() {
  if (isProcessingQueue || operationQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  console.log(`🚦 Procesando cola de operaciones (${operationQueue.length} operaciones pendientes)`);
  
  while (operationQueue.length > 0) {
    const operation = operationQueue.shift();
    if (operation) {
      try {
        await operation();
        // Pequeño delay entre operaciones para evitar conflictos
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error('❌ Error en operación de la cola:', error);
      }
    }
  }
  
  isProcessingQueue = false;
  console.log('✅ Cola de operaciones procesada completamente');
}

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
    // Usar la semana actual como fallback
    return getCurrentWeek();
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
    
    // Verificar y limpiar duplicados automáticamente después de la inicialización
    setTimeout(() => {
      console.log('🔍 Verificando integridad de datos al inicializar...');
      const result = debugDataIntegrity();
      
      if (!result.isValid && result.problematicEvents.length > 0) {
        const duplicateEvents = result.problematicEvents.filter(p => p.issue === 'duplicate_id');
        if (duplicateEvents.length > 0) {
          console.log(`⚠️ Se encontraron ${duplicateEvents.length} eventos duplicados. Limpiando automáticamente...`);
          const removed = removeDuplicateEvents();
          if (removed > 0) {
            console.log(`✅ Se eliminaron ${removed} eventos duplicados automáticamente.`);
          }
        }
      }
    }, 3000); // Esperar 3 segundos para que todo se cargue
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
  // Verificar que se puede publicar
  if (!canPublish.value) {
    console.warn('⚠️ No se puede publicar aún. Guarda primero y espera 2 segundos.');
    return false;
  }

  // Prevenir operaciones concurrentes
  if (isPublishing.value || isSaving.value || isProcessing.value) {
    console.warn('⚠️ Operación ya en curso...');
    return false;
  }

  try {
    console.log('🚀 Iniciando publicación de cambios...');
    isPublishing.value = true;
    isProcessing.value = true;
    canPublish.value = false; // Bloquear inmediatamente

    // Verificar integridad antes de publicar
    console.log('🔍 Verificando integridad antes de publicar...');
    const integrityResult = debugDataIntegrity();
    if (!integrityResult.isValid) {
      const duplicates = integrityResult.problematicEvents.filter(p => p.issue === 'duplicate_id');
      const incompleteEvents = integrityResult.problematicEvents.filter(p => p.issue === 'incomplete_event');
      
      if (duplicates.length > 0) {
        console.log(`⚠️ Se encontraron ${duplicates.length} eventos duplicados antes de publicar. Limpiando automáticamente...`);
        const removed = removeDuplicateEvents();
        console.log(`✅ Se eliminaron ${removed} eventos duplicados antes de publicar.`);
      }
      
      if (incompleteEvents.length > 0) {
        console.log(`⚠️ Se encontraron ${incompleteEvents.length} eventos incompletos antes de publicar. Corrigiendo automáticamente...`);
        const fixed = fixIncompleteEvents(incompleteEvents);
        console.log(`✅ Se corrigieron ${fixed} eventos incompletos antes de publicar.`);
      }
    }

    // Tomar snapshot del estado actual (después de las correcciones)
    const currentDraftInstructors = draftInstructors.value;
    const currentDraftScheduleRows = draftScheduleRows.value;
    const currentDraftGlobalConfig = draftGlobalConfig.value;

    console.log('📦 Publicando datos en Firebase...');
    // Intentar publicar los cambios
    const saveSuccess = await publishData({
      instructors: currentDraftInstructors,
      scheduleRows: currentDraftScheduleRows,
      globalConfig: currentDraftGlobalConfig
    });

    if (!saveSuccess) {
      throw new Error('No se pudieron publicar los cambios después de varios intentos');
    }

    console.log('⏱️ Esperando confirmación de Firebase...');
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
    canPublish.value = false; // Resetear después de publicar

    console.log('✅ CAMBIOS PUBLICADOS EXITOSAMENTE');
    return true;
  } catch (error) {
    console.error('❌ Error al publicar cambios:', error);
    canPublish.value = false;
    return false;
  } finally {
    isPublishing.value = false;
    isProcessing.value = false;
  }
}

// --- OPERACIONES DE DRAFT ---
export async function saveDraftChanges() {
  // Prevenir guardados concurrentes
  if (isSaving.value) {
    console.warn('⚠️ Ya hay un guardado en curso, ignorando duplicado');
    return false;
  }

  try {
    console.log('💾 Iniciando guardado de borrador...');
    isSaving.value = true;
    isProcessing.value = true;
    canPublish.value = false; // Bloquear publicación durante guardado

    // Verificar integridad antes de guardar
    console.log('🔍 Verificando integridad antes de guardar...');
    const integrityResult = debugDataIntegrity();
    if (!integrityResult.isValid) {
      const duplicates = integrityResult.problematicEvents.filter(p => p.issue === 'duplicate_id');
      const incompleteEvents = integrityResult.problematicEvents.filter(p => p.issue === 'incomplete_event');
      
      if (duplicates.length > 0) {
        console.log(`⚠️ Se encontraron ${duplicates.length} eventos duplicados antes de guardar. Limpiando automáticamente...`);
        const removed = removeDuplicateEvents();
        console.log(`✅ Se eliminaron ${removed} eventos duplicados antes de guardar.`);
      }
      
      if (incompleteEvents.length > 0) {
        console.log(`⚠️ Se encontraron ${incompleteEvents.length} eventos incompletos antes de guardar. Corrigiendo automáticamente...`);
        const fixed = fixIncompleteEvents(incompleteEvents);
        console.log(`✅ Se corrigieron ${fixed} eventos incompletos automáticamente.`);
      }
    }

    console.log('📦 Guardando datos en Firebase...');
    const success = await saveDraftData({
      instructors: draftInstructors.value,
      scheduleRows: draftScheduleRows.value,
      globalConfig: draftGlobalConfig.value
    });

    if (success) {
      hasUnpublishedChanges.value = true;
      console.log('✅ BORRADOR GUARDADO EXITOSAMENTE');
      
      // Esperar 2 segundos y luego permitir publicar
      console.log('⏱️ Esperando 2 segundos antes de permitir publicar...');
      setTimeout(() => {
        canPublish.value = true;
        console.log('✅ PUBLICACIÓN HABILITADA');
      }, 2000);
    } else {
      console.log('❌ Error al guardar borrador');
      canPublish.value = false;
    }

    return success;
  } catch (error) {
    console.error('❌ Error al guardar borrador:', error);
    canPublish.value = false;
    return false;
  } finally {
    isSaving.value = false;
    isProcessing.value = false;
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
  canPublish.value = false; // Resetear cuando hay cambios sin guardar
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
  console.log('🗑️ deleteEvent - Iniciando eliminación:', {
    rowId,
    day,
    eventId
  });

  const rows = [...draftScheduleRows.value];
  const rowIndex = rows.findIndex(row => row.id === rowId);
  
  if (rowIndex !== -1) {
    const row = rows[rowIndex];
    const events = row.events[day] || [];
    
    console.log('🗑️ deleteEvent - Eventos antes de eliminar:', {
      totalEvents: events.length,
      eventIds: events.map(e => e.id),
      eventTitles: events.map(e => e.title)
    });
    
    const eventToDelete = events.find(e => e.id === eventId);
    
    if (eventToDelete) {
      console.log('🗑️ deleteEvent - Evento encontrado, eliminando:', {
        eventTitle: eventToDelete.title,
        eventId: eventToDelete.id
      });
      
      row.events[day] = events.filter(e => e.id !== eventId);
      rows[rowIndex] = row;
      draftScheduleRows.value = rows;
      markAsDirty();
      
      console.log('✅ deleteEvent - Evento eliminado exitosamente');
      console.log('🗑️ deleteEvent - Eventos después de eliminar:', {
        totalEvents: row.events[day].length,
        eventIds: row.events[day].map(e => e.id),
        eventTitles: row.events[day].map(e => e.title)
      });
    } else {
      console.log('❌ deleteEvent - Evento no encontrado con ID:', eventId);
    }
  } else {
    console.log('❌ deleteEvent - Fila no encontrada con ID:', rowId);
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
  // Generar ID único con timestamp, random y counter para evitar duplicados
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  const counter = Math.floor(Math.random() * 1000); // Número aleatorio adicional
  
  const newInstructor: Instructor = {
    id: `instructor-${timestamp}-${randomId}-${counter}`,
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

  console.log('➕ addInstructor - Creando instructor:', {
    id: newInstructor.id,
    name: name,
    city: city,
    regional: regional
  });

  draftInstructors.value = [...draftInstructors.value, newInstructor];
  draftScheduleRows.value = [...draftScheduleRows.value, newRow];
  markAsDirty();
  
  console.log('✅ addInstructor - Instructor creado correctamente');
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
  console.log('🔍 checkTimeConflict - Iniciando validación:', {
    rowId,
    day,
    startTime,
    endTime,
    excludeEventId
  });

  const row = draftScheduleRows.value.find(r => r.id === rowId);
  if (!row || !row.events[day]) {
    console.log('❌ checkTimeConflict - Fila o día no encontrado');
    return { hasConflict: false };
  }

  const events = row.events[day].filter(e => e.id !== excludeEventId);
  console.log('📋 checkTimeConflict - Eventos a verificar:', events.length);
  
  // Convertir tiempos a minutos para facilitar la comparación
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  console.log('⏰ checkTimeConflict - Nuevo evento:', {
    startTime,
    endTime,
    startMinutes,
    endMinutes
  });

  for (const event of events) {
    if (!event.time) {
      console.log('⚠️ checkTimeConflict - Evento sin tiempo:', event.title);
      continue;
    }

    console.log('🔎 checkTimeConflict - Verificando evento:', {
      id: event.id,
      title: event.title,
      time: event.time
    });

    // Manejar eventos con múltiples sesiones
    const sessions = Array.isArray(event.time) ? event.time : [event.time];
    
    for (const session of sessions) {
      const { start: eventStart, end: eventEnd } = parseEventTime(session);
      const eventStartMinutes = timeToMinutes(eventStart);
      const eventEndMinutes = timeToMinutes(eventEnd);

      console.log('⏰ checkTimeConflict - Comparando con evento existente:', {
        eventStart,
        eventEnd,
        eventStartMinutes,
        eventEndMinutes
      });

      // Verificar solapamiento
      const hasOverlap = (
        (startMinutes >= eventStartMinutes && startMinutes < eventEndMinutes) ||
        (endMinutes > eventStartMinutes && endMinutes <= eventEndMinutes) ||
        (startMinutes <= eventStartMinutes && endMinutes >= eventEndMinutes)
      );

      console.log('🔄 checkTimeConflict - Resultado de comparación:', {
        condition1: `${startMinutes} >= ${eventStartMinutes} && ${startMinutes} < ${eventEndMinutes} = ${startMinutes >= eventStartMinutes && startMinutes < eventEndMinutes}`,
        condition2: `${endMinutes} > ${eventStartMinutes} && ${endMinutes} <= ${eventEndMinutes} = ${endMinutes > eventStartMinutes && endMinutes <= eventEndMinutes}`,
        condition3: `${startMinutes} <= ${eventStartMinutes} && ${endMinutes} >= ${eventEndMinutes} = ${startMinutes <= eventStartMinutes && endMinutes >= eventEndMinutes}`,
        hasOverlap
      });

      if (hasOverlap) {
        console.log('❌ checkTimeConflict - CONFLICTO DETECTADO con evento:', event.title);
        return { hasConflict: true, conflictingEvent: event };
      }
    }
  }

  console.log('✅ checkTimeConflict - Sin conflictos detectados');
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
  // Formato 1: "Presencial/Virtual - HH:mm a.m. a HH:mm p.m."
  let match = timeString.match(/(?:Presencial|Virtual)\s*-\s*(\d{1,2}:\d{2}\s*(?:a\.m\.|p\.m\.))(?:\s*a\s*)(\d{1,2}:\d{2}\s*(?:a\.m\.|p\.m\.))/i);
  
  if (match) {
    const result = { start: match[1], end: match[2] };
    console.log('🕐 parseEventTime - Formato complejo:', timeString, '→', result);
    return result;
  }

  // Formato 2: "HH:mm a.m. a HH:mm p.m." (formato simple)
  match = timeString.match(/(\d{1,2}:\d{2}\s*(?:a\.m\.|p\.m\.))(?:\s*a\s*)(\d{1,2}:\d{2}\s*(?:a\.m\.|p\.m\.))/i);
  
  if (match) {
    const result = { start: match[1], end: match[2] };
    console.log('🕐 parseEventTime - Formato simple:', timeString, '→', result);
    return result;
  }

  // Formato 3: Solo una hora (sin hora de fin)
  match = timeString.match(/(\d{1,2}:\d{2}\s*(?:a\.m\.|p\.m\.))/i);
  
  if (match) {
    // Si solo hay una hora, asumimos que es de 1 hora de duración
    const startMinutes = timeToMinutes(match[1]);
    const endMinutes = startMinutes + 60; // +1 hora
    const endHour = Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    const endPeriod = endHour >= 12 ? 'p.m.' : 'a.m.';
    const displayHour = endHour > 12 ? endHour - 12 : (endHour === 0 ? 12 : endHour);
    const endTime = `${displayHour}:${endMin.toString().padStart(2, '0')} ${endPeriod}`;
    
    const result = { start: match[1], end: endTime };
    console.log('🕐 parseEventTime - Solo inicio:', timeString, '→', result);
    return result;
  }

  console.log('⚠️ parseEventTime - Formato no reconocido:', timeString);
  return { start: '8:00 a.m.', end: '5:00 p.m.' }; // Valores por defecto
}

export function navigateWeek(direction: 'prev' | 'next'): { startDate: string; endDate: string } {
  const isAdminUser = isAdmin.value;
  const currentWeek = isAdminUser ? draftGlobalConfig.value.currentWeek : selectedWeek.value;
  
  // Crear fechas locales evitando el desfase de zona horaria
  const [startYear, startMonth, startDay] = currentWeek.startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = currentWeek.endDate.split('-').map(Number);
  
  const startDate = new Date(startYear, startMonth - 1, startDay); // month es 0-based
  const endDate = new Date(endYear, endMonth - 1, endDay);

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
  // Crear fecha local evitando el desfase de zona horaria
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month es 0-based
  
  const dayNumber = date.getDate();
  const monthName = date.toLocaleString('es', { month: 'long' });
  const yearNumber = date.getFullYear();
  return `${dayNumber} de ${monthName} de ${yearNumber}`;
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
    console.log('=== FUNCIÓN MOVEEVENT INICIADA ===');
    console.log('📋 Parámetros:', { eventId, fromRowId, fromDay, toRowId, toDay });
    
    // Validar parámetros
    if (!eventId || !fromRowId || !fromDay || !toRowId || !toDay) {
      console.error('❌ Parámetros inválidos para moveEvent');
      return;
    }

    const rows = [...draftScheduleRows.value];
    const fromRowIndex = rows.findIndex(row => row.id === fromRowId);
    const toRowIndex = rows.findIndex(row => row.id === toRowId);

    console.log('📊 Índices encontrados:', { fromRowIndex, toRowIndex });

    if (fromRowIndex === -1) {
      console.error('❌ Fila de origen no encontrada:', fromRowId);
      return;
    }

    if (toRowIndex === -1) {
      console.error('❌ Fila de destino no encontrada:', toRowId);
      return;
    }

    // Buscar el evento en la fila de origen
    const fromRow = { ...rows[fromRowIndex], events: { ...rows[fromRowIndex].events } };
    const fromEvents = [...(fromRow.events[fromDay] || [])];
    const eventIndex = fromEvents.findIndex(e => e.id === eventId);

    if (eventIndex === -1) {
      console.error('❌ Evento no encontrado en la fila de origen');
      console.log('Eventos disponibles en la fila de origen:', fromEvents.map(e => ({ id: e.id, title: e.title })));
      return;
    }

    const event = fromEvents[eventIndex];
    console.log('📄 Evento encontrado:', {
      id: event.id,
      title: event.title,
      location: event.location
    });

    // Crear copia de la fila destino
    const toRow = { ...rows[toRowIndex], events: { ...rows[toRowIndex].events } };
    const toEvents = [...(toRow.events[toDay] || [])];

    // Verificar que no exista ya el evento en el destino (prevenir duplicados)
    const existsInDestination = toEvents.some(e => e.id === eventId);
    if (existsInDestination) {
      console.warn('⚠️ El evento ya existe en el destino, omitiendo movimiento');
      return;
    }

    // Remover el evento de la fila de origen
    fromEvents.splice(eventIndex, 1);
    fromRow.events[fromDay] = fromEvents;

    // Agregar el evento a la fila destino
    toEvents.push(event);
    toRow.events[toDay] = toEvents;

    // Actualizar las filas en el array principal
    rows[fromRowIndex] = fromRow;
    rows[toRowIndex] = toRow;

    console.log('📊 Estado después del movimiento:', {
      fromEventsCount: fromRow.events[fromDay]?.length || 0,
      toEventsCount: toRow.events[toDay]?.length || 0,
      movedEventId: event.id
    });

    // Actualizar el estado con el nuevo array
    draftScheduleRows.value = rows;
    markAsDirty();
    
    console.log('✅ Estado actualizado, agregando guardado a la cola...');
    
    // Agregar guardado a la cola de operaciones para evitar race conditions
    addToOperationQueue(async () => {
      if (!isSaving.value && !isPublishing.value && !isProcessing.value) {
        await saveDraftChanges();
        console.log('✅ EVENTO MOVIDO Y GUARDADO EN FIREBASE');
      } else {
        console.log('ℹ️ Operación ya en curso, omitiendo guardado automático');
      }
    }).catch(error => {
      console.error('❌ Error al guardar en Firebase:', error);
    });

    console.log('=== FUNCIÓN MOVEEVENT COMPLETADA ===');
  } catch (error) {
    console.error('❌ Error al mover el evento:', error);
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
    console.log('=== FUNCIÓN COPYEVENT INICIADA ===');
    console.log('📋 Parámetros:', { eventId, fromRowId, fromDay, toRowId, toDay });
    
    // Validar parámetros
    if (!eventId || !fromRowId || !fromDay || !toRowId || !toDay) {
      console.error('❌ Parámetros inválidos para copyEvent');
      return { success: false, error: 'Parámetros inválidos' };
    }

    // Generar ID único garantizando que no exista
    const existingIds = new Set<string>();
    draftScheduleRows.value.forEach(row => {
      Object.values(row.events).forEach(events => {
        events.forEach(event => existingIds.add(event.id));
      });
    });

    let newEventId: string;
    do {
      newEventId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    } while (existingIds.has(newEventId));

    const rows = [...draftScheduleRows.value];
    const fromRowIndex = rows.findIndex(row => row.id === fromRowId);
    const toRowIndex = rows.findIndex(row => row.id === toRowId);

    console.log('📊 Índices encontrados:', { fromRowIndex, toRowIndex });

    if (fromRowIndex === -1) {
      console.error('❌ Fila de origen no encontrada:', fromRowId);
      return { success: false, error: 'Fila de origen no encontrada' };
    }

    if (toRowIndex === -1) {
      console.error('❌ Fila de destino no encontrada:', toRowId);
      return { success: false, error: 'Fila de destino no encontrada' };
    }

    // Encontrar el evento en la fila de origen
    const fromEvents = rows[fromRowIndex].events[fromDay] || [];
    const originalEvent = fromEvents.find(e => e.id === eventId);

    if (!originalEvent) {
      console.error('❌ Evento no encontrado en la fila de origen');
      return { success: false, error: 'Evento no encontrado' };
    }

    console.log('📄 Evento a copiar:', {
      id: originalEvent.id,
      title: originalEvent.title,
      location: originalEvent.location
    });

    // Crear copia del evento con ID único
    const newEvent: Event = {
      id: newEventId,
      title: originalEvent.title,
      details: Array.isArray(originalEvent.details) 
        ? [...originalEvent.details] 
        : originalEvent.details,
      time: originalEvent.time,
      location: originalEvent.location,
      color: originalEvent.color
    };

    console.log('🆕 Nuevo evento creado:', {
      id: newEvent.id,
      title: newEvent.title,
      location: newEvent.location
    });

    // Crear copia de la fila destino
    const toRow = { ...rows[toRowIndex], events: { ...rows[toRowIndex].events } };
    
    // Crear copia del array de eventos del día destino
    const toEvents = [...(toRow.events[toDay] || [])];
    
    // Agregar la copia del evento
    toEvents.push(newEvent);
    
    // Actualizar el array de eventos del día destino
    toRow.events[toDay] = toEvents;

    // Actualizar la fila en el array principal
    rows[toRowIndex] = toRow;

    console.log('📊 Estado actualizado:', {
      toEventsCount: toRow.events[toDay]?.length || 0,
      newEventId: newEvent.id
    });

    // Actualizar el estado con el nuevo array
    draftScheduleRows.value = rows;
    markAsDirty();
    
    console.log('💾 Agregando guardado a la cola...');
    
    // Agregar guardado a la cola de operaciones para evitar race conditions
    addToOperationQueue(async () => {
      if (!isSaving.value && !isPublishing.value && !isProcessing.value) {
        await saveDraftChanges();
        console.log('✅ EVENTO COPIADO Y GUARDADO EN FIREBASE');
      } else {
        console.log('ℹ️ Operación ya en curso, omitiendo guardado automático');
      }
    }).catch(error => {
      console.error('❌ Error al guardar copia en Firebase:', error);
    });

    console.log('=== FUNCIÓN COPYEVENT COMPLETADA ===');
    
    return { 
      success: true, 
      newEventId: newEvent.id,
      message: `Evento copiado exitosamente: ${newEvent.title}`
    };
  } catch (error) {
    console.error('❌ Error al copiar el evento:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

// Función específica para copiar un evento en la misma celda
export function copyEventInSameCell(eventId: string, rowId: string, day: string) {
  console.log('📋 Copiando evento en la misma celda:', { eventId, rowId, day });
  
  // Usar la función copyEvent existente, copiando en la misma ubicación
  return copyEvent(eventId, rowId, day, rowId, day);
}

// --- FUNCIONES DE ADMINISTRACIÓN ---
export const isAdmin = signal<boolean>(false);

// Función temporal para debuggear integridad de datos
export function debugDataIntegrity() {
  const data = {
    instructors: draftInstructors.value,
    scheduleRows: draftScheduleRows.value,
    globalConfig: draftGlobalConfig.value
  };

  console.log('=== DEBUG INTEGRIDAD DE DATOS ===');
  console.log(`🔍 Estado del sistema: Guardando=${isSaving.value}, Publicando=${isPublishing.value}, Procesando=${isProcessing.value}`);
  console.log(`📊 Cola de operaciones: ${operationQueue.length} pendientes, Procesando=${isProcessingQueue}`);
  console.log('Instructores:', data.instructors.length);
  console.log('Filas de cronograma:', data.scheduleRows.length);

  // Verificar instructores vs filas
  const instructorIds = new Set(data.instructors.map(i => i.id));
  const rowIds = new Set(data.scheduleRows.map(r => r.id));
  
  console.log('IDs de instructores:', Array.from(instructorIds));
  console.log('IDs de filas:', Array.from(rowIds));

  const missingRows = Array.from(instructorIds).filter(id => !rowIds.has(id));
  const extraRows = Array.from(rowIds).filter(id => !instructorIds.has(id));

  if (missingRows.length > 0) {
    console.error('❌ Instructores sin filas:', missingRows);
  }
  if (extraRows.length > 0) {
    console.warn('⚠️ Filas sin instructores:', extraRows);
  }

  // Verificar eventos
  const eventIds = new Set<string>();
  let totalEvents = 0;
  const problematicEvents = [];

  for (const row of data.scheduleRows) {
    console.log(`Fila: ${row.instructor} (${row.id})`);
    
    for (const [day, events] of Object.entries(row.events)) {
      console.log(`  Día ${day}: ${events.length} eventos`);
      
      for (const event of events) {
        totalEvents++;
        console.log(`    Evento: ${event.id} - ${event.title}`);

        // Verificar ID único
        if (eventIds.has(event.id)) {
          console.error(`❌ ID duplicado: ${event.id}`);
          problematicEvents.push({ issue: 'duplicate_id', event, row: row.id, day });
        }
        eventIds.add(event.id);

        // Verificar formato de ID
        if (!event.id.startsWith('evt-')) {
          console.error(`❌ ID inválido: ${event.id}`);
          problematicEvents.push({ issue: 'invalid_id', event, row: row.id, day });
        }

        // Verificar propiedades requeridas
        if (!event.title || !event.location || !event.color) {
          console.error(`❌ Evento incompleto: ${event.id}`, event);
          problematicEvents.push({ issue: 'incomplete_event', event, row: row.id, day });
        }
      }
    }
  }

  console.log(`Total de eventos: ${totalEvents}`);
  console.log(`Eventos problemáticos: ${problematicEvents.length}`);
  
  if (problematicEvents.length > 0) {
    console.error('Eventos con problemas:', problematicEvents);
    
    // Si hay operaciones en curso, ser más tolerante
    if (isProcessingQueue || isSaving.value || isProcessing.value) {
      console.warn('⚠️ Hay operaciones en curso, algunos problemas pueden ser temporales');
    }
  }

  const isValid = missingRows.length === 0 && problematicEvents.length === 0;
  
  // Durante operaciones activas, ser más tolerante con problemas menores
  const isOperating = isProcessingQueue || isSaving.value || isProcessing.value || operationQueue.length > 0;
  if (isOperating && problematicEvents.length > 0) {
    const seriousProblems = problematicEvents.filter(p => p.issue === 'duplicate_id');
    const minorProblems = problematicEvents.filter(p => p.issue !== 'duplicate_id');
    
    if (seriousProblems.length === 0 && minorProblems.length > 0) {
      console.warn(`⚠️ Problemas menores durante operaciones activas (${minorProblems.length}), pueden ser temporales`);
    }
  }
  
  console.log(isValid ? '✅ Datos válidos' : (isOperating ? '⚠️ Datos en proceso' : '❌ Datos inválidos'));
  
  return {
    isValid: isValid || (isOperating && problematicEvents.filter(p => p.issue === 'duplicate_id').length === 0),
    missingRows,
    extraRows,
    problematicEvents,
    totalEvents,
    isOperating
  };
}

export function removeDuplicateEvents() {
  console.log('=== INICIANDO LIMPIEZA DE EVENTOS DUPLICADOS ===');
  const rows = [...draftScheduleRows.value];
  const globalEventIds = new Set<string>();
  let duplicatesRemoved = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = { ...rows[i], events: { ...rows[i].events } };
    
    for (const [day, events] of Object.entries(row.events)) {
      const cleanedEvents = [];
      
      for (const event of events) {
        if (globalEventIds.has(event.id)) {
          console.log(`🗑️ Removiendo evento duplicado: ${event.id} - ${event.title}`);
          duplicatesRemoved++;
        } else {
          globalEventIds.add(event.id);
          cleanedEvents.push(event);
        }
      }
      
      row.events[day] = cleanedEvents;
    }
    
    rows[i] = row;
  }

  console.log(`✅ Eventos duplicados removidos: ${duplicatesRemoved}`);
  
  if (duplicatesRemoved > 0) {
    draftScheduleRows.value = rows;
    markAsDirty();
    saveDraftChanges().then(() => {
      console.log('✅ Datos limpiados guardados en Firebase');
    }).catch(error => {
      console.error('Error al guardar datos limpiados:', error);
    });
  }
  
  return duplicatesRemoved;
}

export function fixIncompleteEvents(problematicEvents: any[]) {
  console.log('=== INICIANDO CORRECCIÓN DE EVENTOS INCOMPLETOS ===');
  const rows = [...draftScheduleRows.value];
  let eventsFixed = 0;

  for (const problematicEvent of problematicEvents) {
    const { event, row: rowId, day } = problematicEvent;
    
    // Encontrar la fila y el evento
    const rowIndex = rows.findIndex(r => r.id === rowId);
    if (rowIndex === -1) continue;
    
    const row = { ...rows[rowIndex], events: { ...rows[rowIndex].events } };
    const events = [...(row.events[day] || [])];
    const eventIndex = events.findIndex(e => e.id === event.id);
    
    if (eventIndex === -1) continue;
    
    // Corregir el evento
    const correctedEvent = { ...events[eventIndex] };
    let wasFixed = false;
    
    if (!correctedEvent.title) {
      correctedEvent.title = 'Evento Sin Título';
      wasFixed = true;
    }
    
    if (!correctedEvent.location) {
      correctedEvent.location = 'Ubicación por definir';
      wasFixed = true;
    }
    
    if (!correctedEvent.color) {
      correctedEvent.color = 'bg-blue-600';
      wasFixed = true;
    }
    
    if (!correctedEvent.details) {
      correctedEvent.details = 'Detalles por definir';
      wasFixed = true;
    }
    
    if (wasFixed) {
      console.log(`🔧 Corrigiendo evento incompleto: ${event.id} - ${correctedEvent.title}`);
      events[eventIndex] = correctedEvent;
      row.events[day] = events;
      rows[rowIndex] = row;
      eventsFixed++;
    }
  }
  
  console.log(`✅ Eventos incompletos corregidos: ${eventsFixed}`);
  
  if (eventsFixed > 0) {
    draftScheduleRows.value = rows;
    markAsDirty();
  }
  
  return eventsFixed;
}

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

// Función para debug del estado de publicación
export function debugPublishState() {
  console.log('🔍 DEBUG: Estado de publicación:', {
    hasUnpublishedChanges: hasUnpublishedChanges.value,
    canPublish: canPublish.value,
    isSaving: isSaving.value,
    isPublishing: isPublishing.value,
    isProcessing: isProcessing.value
  });
}

// Función para debug de la cola de operaciones
export function debugOperationQueue() {
  console.log('🚦 DEBUG: Cola de operaciones:', {
    queueLength: operationQueue.length,
    isProcessingQueue,
    status: isProcessingQueue ? 'Procesando' : (operationQueue.length > 0 ? 'Pendiente' : 'Vacía')
  });
  return {
    queueLength: operationQueue.length,
    isProcessingQueue,
    status: isProcessingQueue ? 'Procesando' : (operationQueue.length > 0 ? 'Pendiente' : 'Vacía')
  };
}