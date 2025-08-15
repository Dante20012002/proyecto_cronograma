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
import { isAdmin } from '../lib/auth';

// --- INTERFACES ---
export interface Event {
  id: string;
  title: string;
  details: string | string[];
  time?: string;
  location: string;
  color: string;
  modalidad?: string; // Nueva propiedad para modalidad (Presencial, Virtual)
  confirmed?: boolean; // Nueva propiedad para indicar si el evento está confirmado
}

export interface Instructor {
  id: string;
  name: string;
  regional: string;
}

export interface ScheduleRow {
  id: string;
  instructor: string;
  regional: string;
  events: {
    [day: string]: Event[];
  };
}

export interface GlobalConfig {
  title: string; // Este será el título por defecto
  weekTitles: {
    [weekKey: string]: string; // weekKey será "YYYY-MM-DD" del lunes de la semana
  };
  currentWeek: {
    startDate: string;
    endDate: string;
  };
  viewMode: 'weekly' | 'monthly'; // Nuevo campo para el modo de vista
}

export interface FilterState {
  instructors: string[];
  regionales: string[];
  modalidades: string[];
  programas: string[];  // Filtro por título/programa
  modulos: string[];    // Filtro por detalles/módulo
}

// --- DATOS DE HORARIOS ---

// Horarios predefinidos para inicio de eventos
export const startTimes = [
  '6:00 a.m.',
  '6:30 a.m.',
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
  '6:00 p.m.',
  '6:30 p.m.',
  '7:00 p.m.',
  '7:30 p.m.',
  '8:00 p.m.',
  '8:30 p.m.',
  '9:00 p.m.',
  '9:30 p.m.',
];

// Horarios predefinidos para fin de eventos
export const endTimes = [
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
  '6:00 p.m.',
  '6:30 p.m.',
  '7:00 p.m.',
  '7:30 p.m.',
  '8:00 p.m.',
  '8:30 p.m.',
  '9:00 p.m.',
  '9:30 p.m.',
  '10:00 p.m.'
];

// --- FUNCIONES DE VALIDACIÓN DE HORARIOS ---

/**
 * Convierte un horario en formato string a minutos desde medianoche
 * @param timeStr - Horario en formato "8:00 a.m." o "2:00 p.m."
 * @returns Número de minutos desde medianoche
 */
function timeToMinutes(timeStr: string): number {
  const parts = timeStr.toLowerCase().replace(/\s+/g, ' ').split(' ');
  if (parts.length < 2) return 0;
  
  const [time, period] = parts;
  const [hours, minutes] = time.split(':').map(Number);
  
  let totalMinutes = (hours % 12) * 60 + (minutes || 0);
  if (period === 'p.m.' && hours !== 12) {
    totalMinutes += 12 * 60;
  } else if (period === 'a.m.' && hours === 12) {
    totalMinutes = minutes || 0;
  }
  
  return totalMinutes;
}

/**
 * Verifica si dos rangos de tiempo se superponen
 * @param start1 - Hora de inicio del primer evento
 * @param end1 - Hora de fin del primer evento
 * @param start2 - Hora de inicio del segundo evento
 * @param end2 - Hora de fin del segundo evento
 * @returns true si hay superposición, false en caso contrario
 */
function timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);
  
  // Verificar si hay superposición
  return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
}

/**
 * Verifica si hay conflictos de horario para un evento
 * @param rowId - ID del instructor/fila
 * @param day - Día del mes
 * @param startTime - Hora de inicio del evento
 * @param endTime - Hora de fin del evento
 * @param excludeEventId - ID del evento a excluir de la verificación (para edición)
 * @returns Objeto con información sobre el conflicto
 */
export function checkTimeConflict(
  rowId: string,
  day: string,
  startTime: string,
  endTime: string,
  excludeEventId?: string
): { hasConflict: boolean; conflictingEvent?: Event } {
  try {
    // Validar horarios
    if (!startTime || !endTime) {
      return { hasConflict: false };
    }
    
    // Buscar la fila del instructor
    const row = draftScheduleRows.value.find(r => r.id === rowId);
    if (!row) {
      return { hasConflict: false };
    }
    
    // Obtener la fecha completa
    const fullDate = getFullDateFromDay(day);
    
    // Obtener eventos del día (considerar ambos formatos)
    const dayEvents = [
      ...(row.events[day] || []),
      ...(row.events[fullDate] || [])
    ];
    
    // Verificar conflictos con otros eventos del mismo día
    for (const event of dayEvents) {
      // Excluir el evento actual si estamos editando
      if (excludeEventId && event.id === excludeEventId) {
        continue;
      }
      
      // Verificar si el evento tiene horario definido
      if (!event.time) {
        continue;
      }
      
      // Parsear el horario del evento existente
      const timeParts = event.time.split(' a ');
      if (timeParts.length === 2) {
        const [eventStart, eventEnd] = timeParts;
        
        // Verificar superposición
        if (timesOverlap(startTime, endTime, eventStart, eventEnd)) {
          return {
            hasConflict: true,
            conflictingEvent: event
          };
        }
      }
    }
    
    return { hasConflict: false };
  } catch (error) {
    console.error('Error al verificar conflictos de horario:', error);
    return { hasConflict: false };
  }
}

// --- DATOS INICIALES ---
const initialInstructors: Instructor[] = [
  { id: 'instructor-1', name: 'JUAN PABLO HERNANDEZ', regional: 'BUCARAMANGA' },
  { id: 'instructor-2', name: 'ZULAY VERA', regional: 'NORTE' },
];

const initialScheduleRows: ScheduleRow[] = [
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
  weekTitles: {}, // Inicialmente vacío
  currentWeek: getCurrentWeek(),
  viewMode: 'weekly' // Por defecto vista semanal
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

// Estado para el modo de vista de usuarios no admin
export const userViewMode = signal<'weekly' | 'monthly'>('weekly');

// --- ESTADO DE FILTROS ---
export const activeFilters = signal<FilterState>({
  instructors: [],
  regionales: [],
  modalidades: [],
  programas: [],
  modulos: []
});

// --- INICIALIZACIÓN DE FIREBASE ---
let unsubscribeDraft: (() => void) | null = null;
let unsubscribePublished: (() => void) | null = null;
let hasInitializedWeek = false; // Flag para controlar el reset automático

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
      
      // Resetear a la semana actual SOLO en la primera carga para admins
      if (!hasInitializedWeek) {
        setTimeout(() => {
          if (isAdmin.value && isWeekOutdated()) {
            console.log('📅 Reseteando automáticamente a la semana actual para admin (primera carga)');
            resetToCurrentWeek();
          }
          hasInitializedWeek = true; // Marcar como inicializado
        }, 1000);
      }
    });

    unsubscribePublished = subscribeToFirestorePublished((data) => {
      publishedInstructors.value = data.instructors;
      publishedScheduleRows.value = data.scheduleRows;
      publishedGlobalConfig.value = data.globalConfig;
      isConnected.value = true;
    });

    console.log('Firebase inicializado correctamente');
    
    // Ejecutar migración automática después de la inicialización
    setTimeout(() => {
      console.log('🔄 Ejecutando migración automática al nuevo formato de fechas...');
      const migrated = migrateAllEventsToNewFormat();
      
      if (migrated > 0) {
        console.log(`✅ Migración completada: ${migrated} instructores migrados`);
        // Guardar automáticamente después de migrar
        saveDraftChanges().then(() => {
          console.log('✅ Datos migrados guardados en Firebase');
        }).catch(error => {
          console.error('❌ Error al guardar datos migrados:', error);
        });
      }
      
      // Verificar y limpiar duplicados automáticamente después de la migración
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
  // Resetear el flag para permitir el reset automático en la próxima carga
  hasInitializedWeek = false;
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
    let currentDraftInstructors = draftInstructors.value;
    let currentDraftScheduleRows = [...draftScheduleRows.value];
    const currentDraftGlobalConfig = draftGlobalConfig.value;

    // MIGRAR DATOS AL NUEVO FORMATO ANTES DE PUBLICAR
    console.log('🔄 Migrando datos al nuevo formato antes de publicar...');
    let migratedRows = currentDraftScheduleRows.map(row => {
      const migratedRow = migrateEventsToFullDate(row);
      return migratedRow;
    });

    // Verificar si hubo cambios en la migración
    const migrationHadChanges = JSON.stringify(currentDraftScheduleRows) !== JSON.stringify(migratedRows);
    if (migrationHadChanges) {
      console.log('✅ Datos migrados al nuevo formato para publicación');
      currentDraftScheduleRows = migratedRows;
      
      // Actualizar el estado draft con los datos migrados
      draftScheduleRows.value = currentDraftScheduleRows;
      markAsDirty();
      
      // Guardar los datos migrados en draft primero
      console.log('💾 Guardando datos migrados en draft...');
      await saveDraftChanges();
    }

    console.log('📦 Publicando datos en Firebase...');
    // Intentar publicar los cambios (ahora con datos migrados)
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

    console.log('✅ CAMBIOS PUBLICADOS EXITOSAMENTE (con migración automática)');
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

export function clearAllDraftEvents(currentWeekOnly: boolean = false) {
  if (currentWeekOnly) {
    // Si es solo semana actual, mantener los eventos de otras semanas
    const currentWeek = draftGlobalConfig.value.currentWeek;
    
    const updatedRows = draftScheduleRows.value.map(row => {
      const eventsToKeep = { ...row.events };
      
      // Eliminar solo los eventos de la semana actual
      Object.keys(eventsToKeep).forEach(dateStr => {
        // Las fechas están en formato YYYY-MM-DD, así que podemos compararlas directamente
        if (dateStr >= currentWeek.startDate && dateStr <= currentWeek.endDate) {
          console.log(`🗑️ Eliminando eventos del día ${dateStr} (dentro de la semana actual)`);
          delete eventsToKeep[dateStr];
        } else {
          console.log(`✅ Manteniendo eventos del día ${dateStr} (fuera de la semana actual)`);
        }
      });
      
      return {
        ...row,
        events: eventsToKeep
      };
    });
    
    console.log('📅 Resumen de limpieza:');
    console.log(`  Semana actual: ${currentWeek.startDate} a ${currentWeek.endDate}`);
    
    draftScheduleRows.value = updatedRows;
  } else {
    // Si es borrado total, limpiar todos los eventos
    const updatedRows = draftScheduleRows.value.map(row => ({
      ...row,
      events: {}
    }));
    
    draftScheduleRows.value = updatedRows;
  }
  
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

// --- FUNCIONES AUXILIARES PARA FECHAS COMPLETAS ---

/**
 * Genera la fecha completa (YYYY-MM-DD) basada en la semana actual y el día del mes
 * @param dayOfMonth - Día del mes (1-31)
 * @returns Fecha completa en formato YYYY-MM-DD
 */
function getFullDateFromDay(dayOfMonth: string): string {
  const currentWeek = draftGlobalConfig.value.currentWeek;
  return getFullDateFromDayWithWeek(dayOfMonth, currentWeek);
}

/**
 * Genera la fecha completa (YYYY-MM-DD) basada en una semana específica y el día del mes
 * @param dayOfMonth - Día del mes (1-31)
 * @param week - Semana específica con startDate y endDate
 * @returns Fecha completa en formato YYYY-MM-DD
 */
function getFullDateFromDayWithWeek(dayOfMonth: string, week: { startDate: string; endDate: string }): string {
  const [year, month, day] = week.startDate.split('-').map(Number);
  const startDate = new Date(year, month - 1, day);
  
  // Buscar el día en la semana específica (lunes a viernes)
  for (let i = 0; i < 5; i++) {
    const checkDate = new Date(startDate);
    checkDate.setDate(startDate.getDate() + i);
    
    if (checkDate.getDate().toString() === dayOfMonth) {
      return checkDate.toISOString().split('T')[0];
    }
  }
  
  // Si no se encuentra en la semana específica, usar la fecha del mes actual
  const today = new Date();
  const fullDate = new Date(today.getFullYear(), today.getMonth(), parseInt(dayOfMonth));
  return fullDate.toISOString().split('T')[0];
}

/**
 * Migra eventos del formato anterior (solo día) al nuevo formato (fecha completa)
 * @param row - Fila de eventos a migrar
 * @returns Fila con eventos migrados
 */
function migrateEventsToFullDate(row: ScheduleRow): ScheduleRow {
  const newEvents: { [key: string]: Event[] } = {};
  
  // Copiar eventos existentes
  Object.entries(row.events).forEach(([key, events]) => {
    if (key.includes('-')) {
      // Ya está en formato de fecha completa
      newEvents[key] = events;
    } else {
      // Formato anterior (solo día), migrar a fecha completa
      const fullDate = getFullDateFromDay(key);
      if (!newEvents[fullDate]) {
        newEvents[fullDate] = [];
      }
      newEvents[fullDate].push(...events);
    }
  });
  
  return {
    ...row,
    events: newEvents
  };
}

/**
 * Obtiene eventos tanto del formato anterior como del nuevo formato
 * @param row - Fila de eventos
 * @param dayOfMonth - Día del mes
 * @returns Array de eventos para ese día
 */
function getEventsForDay(row: ScheduleRow, dayOfMonth: string): Event[] {
  const fullDate = getFullDateFromDay(dayOfMonth);
  
  // Obtener eventos del nuevo formato (fecha completa)
  const eventsByFullDate = row.events[fullDate] || [];
  
  // Obtener eventos del formato anterior (solo día) para compatibilidad
  const eventsByDay = row.events[dayOfMonth] || [];
  
  // Combinar y deduplicar
  const allEvents = [...eventsByFullDate, ...eventsByDay];
  const uniqueEvents = allEvents.filter((event, index, self) => 
    index === self.findIndex(e => e.id === event.id)
  );
  
  return uniqueEvents;
}

// --- OPERACIONES DE EVENTOS ACTUALIZADAS ---

export function updateEvent(rowId: string, day: string, updatedEvent: Event) {
  const rows = [...draftScheduleRows.value];
  const rowIndex = rows.findIndex(row => row.id === rowId);
  
  if (rowIndex !== -1) {
    const row = rows[rowIndex];
    const fullDate = getFullDateFromDay(day);
    
    // Buscar el evento en el nuevo formato primero
    let events = row.events[fullDate] || [];
    let eventIndex = events.findIndex(e => e.id === updatedEvent.id);
    
    if (eventIndex === -1) {
      // Buscar en el formato anterior si no se encuentra en el nuevo
      events = row.events[day] || [];
      eventIndex = events.findIndex(e => e.id === updatedEvent.id);
      
      if (eventIndex !== -1) {
        // Migrar evento al nuevo formato
        events.splice(eventIndex, 1);
        row.events[day] = events;
        
        // Agregar al nuevo formato
        if (!row.events[fullDate]) {
          row.events[fullDate] = [];
        }
        row.events[fullDate].push(updatedEvent);
      }
    } else {
      // Actualizar en el nuevo formato
      events[eventIndex] = updatedEvent;
      row.events[fullDate] = events;
    }
    
    rows[rowIndex] = row;
    draftScheduleRows.value = rows;
    markAsDirty();
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
    const fullDate = getFullDateFromDay(day);
    
    // Buscar y eliminar del nuevo formato
    let events = row.events[fullDate] || [];
    let eventIndex = events.findIndex(e => e.id === eventId);
    
    if (eventIndex !== -1) {
      console.log('🗑️ deleteEvent - Eliminando del nuevo formato (fecha completa)');
      events.splice(eventIndex, 1);
      row.events[fullDate] = events;
    } else {
      // Buscar y eliminar del formato anterior
      events = row.events[day] || [];
      eventIndex = events.findIndex(e => e.id === eventId);
      
      if (eventIndex !== -1) {
        console.log('🗑️ deleteEvent - Eliminando del formato anterior (solo día)');
        events.splice(eventIndex, 1);
        row.events[day] = events;
      }
    }
    
    if (eventIndex !== -1) {
      rows[rowIndex] = row;
      draftScheduleRows.value = rows;
      markAsDirty();
      console.log('✅ deleteEvent - Evento eliminado exitosamente');
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
    const fullDate = getFullDateFromDay(day);
    
    // Usar el nuevo formato (fecha completa)
    if (!row.events[fullDate]) {
      row.events[fullDate] = [];
    }
    row.events[fullDate].push(newEvent);
    
    rows[rowIndex] = row;
    draftScheduleRows.value = rows;
    markAsDirty();
    
    console.log('✅ addEvent - Evento agregado con fecha completa:', {
      eventId: newEvent.id,
      day: day,
      fullDate: fullDate
    });
  }
}

// --- OPERACIONES DE INSTRUCTORES ---
export function addInstructor(name: string, regional: string) {
  // Generar ID único con timestamp, random y counter para evitar duplicados
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  const counter = Math.floor(Math.random() * 1000); // Número aleatorio adicional
  
  const newInstructor: Instructor = {
    id: `instructor-${timestamp}-${randomId}-${counter}`,
    name,
    regional
  };

  const newRow: ScheduleRow = {
    id: newInstructor.id,
    instructor: name,
    regional,
    events: {}
  };

  console.log('➕ addInstructor - Creando instructor:', {
    id: newInstructor.id,
    name: name,
    regional: regional
  });

  draftInstructors.value = [...draftInstructors.value, newInstructor];
  draftScheduleRows.value = [...draftScheduleRows.value, newRow];
  markAsDirty();
  
  console.log('✅ addInstructor - Instructor creado correctamente');
}

export function updateInstructor(id: string, name: string, regional: string) {
  const instructors = [...draftInstructors.value];
  const rows = [...draftScheduleRows.value];
  
  const instructorIndex = instructors.findIndex(i => i.id === id);
  const rowIndex = rows.findIndex(r => r.id === id);
  
  if (instructorIndex !== -1 && rowIndex !== -1) {
    const currentInstructor = instructors[instructorIndex];
    const currentRow = rows[rowIndex];
    
    // Verificar si cambió la ubicación
    const locationChanged = currentRow.regional !== regional;
    
    if (locationChanged) {
      console.log(`📍 Actualizando ubicación de ${currentInstructor.name}:`);
      console.log(`  📍 Anterior: ${currentRow.regional}`);
      console.log(`  📍 Nueva: ${regional}`);
      console.log(`  ℹ️ NOTA: Esta actualización afecta la información principal del instructor.`);
      console.log(`  ℹ️ Los eventos históricos mantienen sus ubicaciones originales por semana.`);
      
      // Verificar si tiene eventos en múltiples ubicaciones
      const uniqueLocations = new Set<string>();
      Object.values(currentRow.events).forEach(dayEvents => {
        dayEvents.forEach(event => {
          if (event.location) {
            uniqueLocations.add(event.location);
          }
        });
      });
      
      if (uniqueLocations.size > 1) {
        console.log(`  📊 Este instructor tiene eventos históricos en ${uniqueLocations.size} ubicaciones diferentes:`);
        uniqueLocations.forEach(location => {
          console.log(`    - ${location}`);
        });
      }
    }
    
    instructors[instructorIndex] = { ...instructors[instructorIndex], name, regional };
    rows[rowIndex] = { ...rows[rowIndex], instructor: name, regional };
    
    draftInstructors.value = instructors;
    draftScheduleRows.value = rows;
    markAsDirty();
    
    console.log(`✅ Instructor actualizado: ${name} (${regional})`);
  }
}

export function deleteInstructor(id: string) {
  // Contar eventos históricos antes de eliminar
  const instructorRow = draftScheduleRows.value.find(r => r.id === id);
  const instructor = draftInstructors.value.find(i => i.id === id);
  
  if (!instructorRow || !instructor) {
    console.warn('❌ Instructor no encontrado para eliminar');
    return;
  }
  
  // Contar total de eventos históricos
  const totalEvents = Object.values(instructorRow.events).reduce((total, dayEvents) => {
    return total + dayEvents.length;
  }, 0);
  
  const eventDays = Object.keys(instructorRow.events).filter(day => 
    instructorRow.events[day].length > 0
  ).length;
  
  console.log(`🗑️ Eliminando instructor: ${instructor.name}`);
  console.log(`📊 Eventos históricos que se eliminarán: ${totalEvents} eventos en ${eventDays} días`);
  
  // Mostrar detalles de eventos por día para referencia
  Object.entries(instructorRow.events).forEach(([day, events]) => {
    if (events.length > 0) {
      console.log(`  📅 ${day}: ${events.length} eventos`);
    }
  });
  
  // Proceder con la eliminación
  draftInstructors.value = draftInstructors.value.filter(i => i.id !== id);
  draftScheduleRows.value = draftScheduleRows.value.filter(r => r.id !== id);
  markAsDirty();
  
  console.log(`✅ Instructor ${instructor.name} eliminado junto con ${totalEvents} eventos históricos`);
}

// --- OPERACIONES DE CONFIGURACIÓN ---
export function updateTitle(newTitle: string) {
  draftGlobalConfig.value = { ...draftGlobalConfig.value, title: newTitle };
  markAsDirty();
}

// --- FUNCIONES DE TÍTULOS POR SEMANA ---

/**
 * Genera la clave de semana basada en la fecha de inicio (lunes)
 * @param startDate - Fecha de inicio en formato YYYY-MM-DD
 * @returns Clave de semana
 */
function getWeekKey(startDate: string): string {
  return startDate;
}

/**
 * Obtiene el título de una semana específica
 * @param startDate - Fecha de inicio de la semana
 * @param endDate - Fecha de fin de la semana
 * @returns Título de la semana o título por defecto
 */
export function getWeekTitle(startDate: string, endDate: string): string {
  const weekKey = getWeekKey(startDate);
  const weekTitles = draftGlobalConfig.value.weekTitles || {};
  
  if (weekTitles[weekKey]) {
    return weekTitles[weekKey];
  }
  
  // Usar título por defecto si no hay título específico para esta semana
  return draftGlobalConfig.value.title;
}

/**
 * Actualiza el título de una semana específica
 * @param startDate - Fecha de inicio de la semana
 * @param endDate - Fecha de fin de la semana
 * @param title - Nuevo título para la semana
 */
export function updateWeekTitle(startDate: string, endDate: string, title: string) {
  const weekKey = getWeekKey(startDate);
  const currentWeekTitles = draftGlobalConfig.value.weekTitles || {};
  
  const updatedWeekTitles = {
    ...currentWeekTitles,
    [weekKey]: title
  };
  
  draftGlobalConfig.value = {
    ...draftGlobalConfig.value,
    weekTitles: updatedWeekTitles
  };
  
  markAsDirty();
  
  console.log(`📝 Título actualizado para semana ${startDate}: "${title}"`);
}

/**
 * Obtiene el título de la semana actual (para admins)
 * @returns Título de la semana actual
 */
export function getCurrentWeekTitle(): string {
  const currentWeek = draftGlobalConfig.value.currentWeek;
  return getWeekTitle(currentWeek.startDate, currentWeek.endDate);
}

/**
 * Obtiene el título de la semana publicada (para usuarios externos)
 * @returns Título de la semana publicada
 */
export function getPublishedWeekTitle(): string {
  const currentWeek = selectedWeek.value;
  const publishedConfig = publishedGlobalConfig.value;
  const weekKey = getWeekKey(currentWeek.startDate);
  const weekTitles = publishedConfig.weekTitles || {};
  
  if (weekTitles[weekKey]) {
    return weekTitles[weekKey];
  }
  
  return publishedConfig.title;
}

export function updateWeek(startDate: string, endDate: string) {
  draftGlobalConfig.value = {
    ...draftGlobalConfig.value,
    currentWeek: { startDate, endDate }
  };
  markAsDirty();
}

// --- NUEVA FUNCIÓN PARA RESETEAR A LA SEMANA ACTUAL ---

/**
 * Resetea la semana del draft a la semana actual (para admins)
 */
export function resetToCurrentWeek() {
  const currentWeek = getCurrentWeek();
  console.log('📅 Reseteando a la semana actual:', currentWeek);
  
  draftGlobalConfig.value = {
    ...draftGlobalConfig.value,
    currentWeek: currentWeek
  };
  
  // Guardar el cambio automáticamente
  markAsDirty();
  
  return currentWeek;
}

/**
 * Verifica si la semana actual del draft es diferente a la semana actual del calendario
 */
export function isWeekOutdated(): boolean {
  const currentWeek = getCurrentWeek();
  const draftWeek = draftGlobalConfig.value.currentWeek;
  
  return currentWeek.startDate !== draftWeek.startDate || 
         currentWeek.endDate !== draftWeek.endDate;
}

// --- FUNCIONES DE NAVEGACIÓN ---

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

// --- FUNCIONES DE MANIPULACIÓN DE EVENTOS ACTUALIZADAS ---

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

    if (fromRowIndex === -1 || toRowIndex === -1) {
      console.error('❌ Fila no encontrada');
      return;
    }

    const fromRow = { ...rows[fromRowIndex], events: { ...rows[fromRowIndex].events } };
    const toRow = { ...rows[toRowIndex], events: { ...rows[toRowIndex].events } };
    
    const fromFullDate = getFullDateFromDay(fromDay);
    const toFullDate = getFullDateFromDay(toDay);
    
    // Buscar evento en el formato nuevo primero
    let fromEvents = fromRow.events[fromFullDate] || [];
    let eventIndex = fromEvents.findIndex(e => e.id === eventId);
    
    if (eventIndex === -1) {
      // Buscar en formato anterior
      fromEvents = fromRow.events[fromDay] || [];
      eventIndex = fromEvents.findIndex(e => e.id === eventId);
      
      if (eventIndex !== -1) {
        // Migrar al mover
        const event = fromEvents[eventIndex];
        fromEvents.splice(eventIndex, 1);
        fromRow.events[fromDay] = fromEvents;
        
        // Agregar al destino en nuevo formato
        if (!toRow.events[toFullDate]) {
          toRow.events[toFullDate] = [];
        }
        toRow.events[toFullDate].push(event);
      }
    } else {
      // Mover en nuevo formato
      const event = fromEvents[eventIndex];
      fromEvents.splice(eventIndex, 1);
      fromRow.events[fromFullDate] = fromEvents;
      
      if (!toRow.events[toFullDate]) {
        toRow.events[toFullDate] = [];
      }
      toRow.events[toFullDate].push(event);
    }

    if (eventIndex !== -1) {
      rows[fromRowIndex] = fromRow;
      rows[toRowIndex] = toRow;
      draftScheduleRows.value = rows;
      markAsDirty();
      
      console.log('✅ EVENTO MOVIDO CORRECTAMENTE');
      
      // Agregar guardado a la cola
      addToOperationQueue(async () => {
        if (!isSaving.value && !isPublishing.value && !isProcessing.value) {
          await saveDraftChanges();
          console.log('✅ EVENTO MOVIDO Y GUARDADO EN FIREBASE');
        }
      }).catch(error => {
        console.error('❌ Error al guardar en Firebase:', error);
      });
    }
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

    // Generar ID único
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

    if (fromRowIndex === -1 || toRowIndex === -1) {
      return { success: false, error: 'Fila no encontrada' };
    }

    const fromRow = rows[fromRowIndex];
    const toRow = { ...rows[toRowIndex], events: { ...rows[toRowIndex].events } };
    
    const fromFullDate = getFullDateFromDay(fromDay);
    const toFullDate = getFullDateFromDay(toDay);
    
    // Buscar evento original
    let fromEvents = fromRow.events[fromFullDate] || [];
    let originalEvent = fromEvents.find(e => e.id === eventId);
    
    if (!originalEvent) {
      // Buscar en formato anterior
      fromEvents = fromRow.events[fromDay] || [];
      originalEvent = fromEvents.find(e => e.id === eventId);
    }

    if (!originalEvent) {
      return { success: false, error: 'Evento no encontrado' };
    }

    // Crear copia del evento
    const newEvent: Event = {
      id: newEventId,
      title: originalEvent.title,
      details: Array.isArray(originalEvent.details) 
        ? [...originalEvent.details] 
        : originalEvent.details,
      time: originalEvent.time,
      location: originalEvent.location,
      color: originalEvent.color,
      modalidad: originalEvent.modalidad
    };

    // Agregar copia al destino usando nuevo formato
    if (!toRow.events[toFullDate]) {
      toRow.events[toFullDate] = [];
    }
    toRow.events[toFullDate].push(newEvent);

    rows[toRowIndex] = toRow;
    draftScheduleRows.value = rows;
    markAsDirty();
    
    console.log('✅ EVENTO COPIADO CORRECTAMENTE');
    
    // Agregar guardado a la cola
    addToOperationQueue(async () => {
      if (!isSaving.value && !isPublishing.value && !isProcessing.value) {
        await saveDraftChanges();
        console.log('✅ EVENTO COPIADO Y GUARDADO EN FIREBASE');
      }
    }).catch(error => {
      console.error('❌ Error al guardar copia en Firebase:', error);
    });

    return { success: true, message: 'Evento copiado exitosamente' };
  } catch (error) {
    console.error('❌ Error al copiar el evento:', error);
    return { success: false, error: 'Error interno' };
  }
}

// --- FUNCIONES DE UTILIDAD ACTUALIZADAS ---

// Función específica para copiar un evento en la misma celda
export function copyEventInSameCell(eventId: string, rowId: string, day: string) {
  console.log('📋 Copiando evento en la misma celda:', { eventId, rowId, day });
  
  // Usar la función copyEvent existente, copiando en la misma ubicación
  return copyEvent(eventId, rowId, day, rowId, day);
}

// --- FUNCIONES DE ADMINISTRACIÓN ---
// isAdmin se importa desde ../lib/auth

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
  console.log('=== ESTADO DE PUBLICACIÓN ===');
  
  const draft = {
    instructors: draftInstructors.value.length,
    scheduleRows: draftScheduleRows.value.length,
    globalConfig: draftGlobalConfig.value.title,
    hasChanges: hasUnpublishedChanges.value,
    canPublish: canPublish.value,
    isSaving: isSaving.value,
    isPublishing: isPublishing.value,
    isProcessing: isProcessing.value
  };
  
  const published = {
    instructors: publishedInstructors.value.length,
    scheduleRows: publishedScheduleRows.value.length,
    globalConfig: publishedGlobalConfig.value.title
  };
  
  console.log('📝 Estado Draft:', draft);
  console.log('📤 Estado Published:', published);
  
  // Verificar formato de eventos en published
  console.log('\n=== ANÁLISIS DE FORMATO DE EVENTOS PUBLISHED ===');
  publishedScheduleRows.value.forEach(row => {
    const eventKeys = Object.keys(row.events);
    const hasNewFormat = eventKeys.some(key => key.includes('-'));
    const hasOldFormat = eventKeys.some(key => !key.includes('-'));
    const totalEvents = Object.values(row.events).flat().length;
    
    console.log(`Instructor: ${row.instructor}`);
    console.log(`  - Formato nuevo (fechas completas): ${hasNewFormat ? '✅' : '❌'}`);
    console.log(`  - Formato anterior (solo días): ${hasOldFormat ? '⚠️' : '✅'}`);
    console.log(`  - Total eventos: ${totalEvents}`);
    console.log(`  - Claves de eventos:`, eventKeys);
  });
  
  return { draft, published };
}

// Función para debug de la cola de operaciones
export function debugOperationQueue() {
  console.log('=== ESTADO DE LA COLA DE OPERACIONES ===');
  console.log('Cola en procesamiento:', isProcessingQueue);
  console.log('Operaciones pendientes:', operationQueue.length);
  console.log('Estado de guardado:', isSaving.value);
  console.log('Estado de publicación:', isPublishing.value);
  console.log('Estado de procesamiento:', isProcessing.value);
  
  return {
    isProcessingQueue,
    pendingOperations: operationQueue.length,
    isSaving: isSaving.value,
    isPublishing: isPublishing.value,
    isProcessing: isProcessing.value
  };
}

// --- FUNCIONES DE MIGRACIÓN ---

/**
 * Migra todos los eventos del formato anterior al nuevo formato
 */
export function migrateAllEventsToNewFormat() {
  console.log('🔄 Migrando todos los eventos al nuevo formato...');
  
  const rows = [...draftScheduleRows.value];
  let migratedCount = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const originalRow = rows[i];
    const migratedRow = migrateEventsToFullDate(originalRow);
    
    if (JSON.stringify(originalRow.events) !== JSON.stringify(migratedRow.events)) {
      rows[i] = migratedRow;
      migratedCount++;
    }
  }
  
  if (migratedCount > 0) {
    draftScheduleRows.value = rows;
    markAsDirty();
    console.log(`✅ Migrados ${migratedCount} instructores al nuevo formato`);
  } else {
    console.log('ℹ️ No se requirió migración');
  }
  
  return migratedCount;
}

/**
 * Limpia eventos del formato anterior después de una migración exitosa
 */
export function cleanupLegacyEvents() {
  console.log('🧹 Limpiando eventos del formato anterior...');
  
  const rows = [...draftScheduleRows.value];
  let cleanedCount = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = { ...rows[i], events: { ...rows[i].events } };
    const originalEventsCount = Object.keys(row.events).length;
    
    // Mantener solo eventos con fechas completas (formato YYYY-MM-DD)
    const cleanedEvents: { [key: string]: Event[] } = {};
    
    Object.entries(row.events).forEach(([key, events]) => {
      if (key.includes('-') && key.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Mantener eventos con formato de fecha completa
        cleanedEvents[key] = events;
      } else {
        console.log(`🗑️ Removiendo eventos del formato anterior: ${key}`);
      }
    });
    
    const cleanedEventsCount = Object.keys(cleanedEvents).length;
    
    if (cleanedEventsCount !== originalEventsCount) {
      row.events = cleanedEvents;
      rows[i] = row;
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    draftScheduleRows.value = rows;
    markAsDirty();
    console.log(`✅ Limpiados ${cleanedCount} instructores del formato anterior`);
  } else {
    console.log('ℹ️ No se requirió limpieza');
  }
  
  return cleanedCount;
}

// --- FUNCIONES DE MANTENIMIENTO ---

// --- FUNCIONES DE FILTROS ---

/**
 * Actualiza los filtros activos
 */
export function updateFilters(newFilters: Partial<FilterState>) {
  activeFilters.value = {
    ...activeFilters.value,
    ...newFilters
  };
}

/**
 * Limpia todos los filtros
 */
export function clearFilters() {
  activeFilters.value = {
    instructors: [],
    regionales: [],
    modalidades: [],
    programas: [],
    modulos: []
  };
}

/**
 * Obtiene todos los valores únicos para un campo específico
 */
export function getUniqueValues(field: 'instructors' | 'regionales' | 'modalidades', isAdmin: boolean): string[] {
  const rows = isAdmin ? draftScheduleRows.value : publishedScheduleRows.value;
  const values = new Set<string>();

  rows.forEach(row => {
    if (field === 'instructors') {
      values.add(row.instructor);
    } else if (field === 'regionales') {
      values.add(row.regional);
    } else if (field === 'modalidades') {
      // Obtener modalidades de todos los eventos
      Object.values(row.events).forEach(events => {
        events.forEach(event => {
          if (event.modalidad) {
            values.add(event.modalidad);
          }
        });
      });
    }
  });

  return Array.from(values).sort();
}

/**
 * Obtiene eventos únicos de la semana seleccionada
 * @param isAdmin - Determina si usar datos de admin o publicados
 * @returns Array de eventos únicos de la semana actual
 */
function getEventsFromCurrentWeek(isAdmin: boolean): Event[] {
  const rows = isAdmin ? draftScheduleRows.value : publishedScheduleRows.value;
  const currentWeek = isAdmin ? draftGlobalConfig.value.currentWeek : selectedWeek.value;
  const events: Event[] = [];

  console.log('🔍 getEventsFromCurrentWeek - Filtrando eventos para semana:', {
    isAdmin,
    currentWeek,
    totalRows: rows.length
  });

  // Generar array de fechas de la semana actual
  const weekDates: string[] = [];
  const startDate = new Date(currentWeek.startDate);
  
  for (let i = 0; i < 5; i++) { // Lunes a Viernes
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    weekDates.push(date.toISOString().split('T')[0]);
  }

  console.log('📅 getEventsFromCurrentWeek - Fechas de la semana:', weekDates);

  rows.forEach(row => {
    // Buscar eventos en las fechas de la semana actual
    weekDates.forEach(dateStr => {
      const dayEvents = row.events[dateStr] || [];
      if (dayEvents.length > 0) {
        console.log(`📋 Encontrados ${dayEvents.length} eventos en ${dateStr} para ${row.instructor}`);
      }
      events.push(...dayEvents);
    });

    // También buscar en formato anterior (solo día) para compatibilidad
    Object.entries(row.events).forEach(([key, dayEvents]) => {
      if (!key.includes('-')) { // Formato anterior (solo día)
        const fullDate = getFullDateFromDayWithWeek(key, currentWeek);
        if (weekDates.includes(fullDate)) {
          console.log(`📋 Migrando ${dayEvents.length} eventos del día ${key} (${fullDate}) para ${row.instructor}`);
          events.push(...dayEvents);
        } else {
          console.log(`🚫 Excluyendo ${dayEvents.length} eventos del día ${key} (${fullDate}) - fuera de la semana actual`);
        }
      }
    });
  });

  // Deduplicar eventos por ID
  const uniqueEvents = events.filter((event, index, self) => 
    index === self.findIndex(e => e.id === event.id)
  );

  return uniqueEvents;
}

/**
 * Obtiene valores únicos de programas (títulos) de la semana seleccionada
 * @param isAdmin - Determinar si usar datos de admin o publicados
 * @returns Array de títulos únicos
 */
export function getUniqueProgramsFromWeek(isAdmin: boolean): string[] {
  const weekEvents = getEventsFromCurrentWeek(isAdmin);
  const programs = new Set<string>();

  weekEvents.forEach(event => {
    if (event.title && event.title.trim()) {
      programs.add(event.title.trim());
    }
  });

  return Array.from(programs).sort();
}

/**
 * Obtiene valores únicos de módulos (detalles) de la semana seleccionada
 * @param isAdmin - Determinar si usar datos de admin o publicados
 * @returns Array de detalles únicos
 */
export function getUniqueModulesFromWeek(isAdmin: boolean): string[] {
  const weekEvents = getEventsFromCurrentWeek(isAdmin);
  const modules = new Set<string>();

  console.log(`🧩 getUniqueModulesFromWeek - Procesando ${weekEvents.length} eventos de la semana`);

  weekEvents.forEach(event => {
    if (event.details) {
      if (Array.isArray(event.details)) {
        // Si details es un array, agregar cada elemento
        event.details.forEach(detail => {
          if (detail && detail.trim()) {
            console.log(`  ➕ Agregando módulo: "${detail.trim()}" del evento: "${event.title}"`);
            modules.add(detail.trim());
          }
        });
      } else {
        // Si details es un string, agregarlo directamente
        if (event.details.trim()) {
          console.log(`  ➕ Agregando módulo: "${event.details.trim()}" del evento: "${event.title}"`);
          modules.add(event.details.trim());
        }
      }
    }
  });

  const result = Array.from(modules).sort();
  console.log(`✅ getUniqueModulesFromWeek - Módulos únicos encontrados:`, result);
  return result;
}

/**
 * Filtra las filas del cronograma según los filtros activos
 * Para modalidades, programas y módulos, filtra eventos individuales en lugar de filas completas
 * Para usuarios externos, oculta automáticamente instructores sin eventos en la semana actual
 */
export function getFilteredRows(rows: ScheduleRow[]): ScheduleRow[] {
  const filters = activeFilters.value;
  
  // Determinar el contexto (admin vs usuario externo)
  const isAdminContext = rows === draftScheduleRows.value;
  
  // Determinar la semana actual según el contexto (admin vs usuario)
  const currentWeek = isAdminContext ? draftGlobalConfig.value.currentWeek : selectedWeek.value;
  
  // Para usuarios externos, siempre ocultar instructores sin eventos
  // Para administradores, solo aplicar filtros cuando hay filtros activos
  const hasActiveFilters = filters.instructors.length > 0 || 
      filters.regionales.length > 0 || 
      filters.modalidades.length > 0 ||
      filters.programas.length > 0 ||
      filters.modulos.length > 0;
      
  const shouldFilterEmptyInstructors = !isAdminContext || hasActiveFilters;
  
  console.log('🔍 getFilteredRows - Filtros activos:', {
    instructors: filters.instructors,
    regionales: filters.regionales,
    modalidades: filters.modalidades,
    programas: filters.programas,
    modulos: filters.modulos,
    totalRows: rows.length,
    isAdminContext,
    shouldFilterEmptyInstructors,
    currentWeek
  });
  
  // Debug adicional para usuarios externos
  if (!isAdminContext) {
    console.log('👤 Usuario externo detectado - se ocultarán instructores sin eventos en la semana actual');
    console.log('📅 Semana actual:', currentWeek);
  }
  
  if (!hasActiveFilters && isAdminContext) {
    console.log('ℹ️ Admin sin filtros activos, devolviendo todas las filas');
    return rows;
  }
  
  console.log('📅 getFilteredRows - Usando semana:', currentWeek, 'isAdmin:', isAdminContext);

  // Generar fechas de la semana actual para filtrar eventos
  const weekDates: string[] = [];
  const startDate = new Date(currentWeek.startDate);
  
  for (let i = 0; i < 5; i++) { // Lunes a Viernes
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    weekDates.push(date.toISOString().split('T')[0]);
  }
  
  console.log('📅 getFilteredRows - Fechas de la semana a considerar:', weekDates);

  return rows
    .filter(row => {
      // Filtro por instructor
      if (filters.instructors.length > 0 && !filters.instructors.includes(row.instructor)) {
        return false;
      }

      // Filtro por regional
      if (filters.regionales.length > 0 && !filters.regionales.includes(row.regional)) {
        return false;
      }

      return true;
    })
    .map(row => {
      // Si no hay filtros de eventos, devolver la fila tal como está
      if (filters.modalidades.length === 0 && 
          filters.programas.length === 0 && 
          filters.modulos.length === 0) {
        return row;
      }

      // Filtrar eventos por modalidad, programa y módulo
      const filteredEvents: { [day: string]: Event[] } = {};
      let totalMatchingEvents = 0;
      
      Object.entries(row.events).forEach(([day, events]) => {
        // Solo considerar eventos de la semana actual
        let isCurrentWeekDay = false;
        
        if (day.includes('-')) {
          // Formato nuevo (fecha completa): verificar directamente
          isCurrentWeekDay = weekDates.includes(day);
        } else {
          // Formato anterior (solo día): convertir a fecha completa
          const fullDate = getFullDateFromDayWithWeek(day, currentWeek);
          isCurrentWeekDay = weekDates.includes(fullDate);
        }
        
        if (!isCurrentWeekDay) {
          console.log(`⏭️ Saltando eventos del día ${day} (fuera de la semana actual)`);
          return; // Saltar eventos que no son de la semana actual
        }
        
        console.log(`📅 Procesando ${events.length} eventos del día ${day} (semana actual)`);
        
        const matchingEvents = events.filter(event => {
          // Filtro por modalidad
          if (filters.modalidades.length > 0) {
            if (!event.modalidad || !filters.modalidades.includes(event.modalidad)) {
              return false;
            }
          }

          // Filtro por programa (título)
          if (filters.programas.length > 0) {
            if (!event.title || !filters.programas.includes(event.title.trim())) {
              return false;
            }
          }

          // Filtro por módulo (detalles)
          if (filters.modulos.length > 0) {
            if (!event.details) {
              return false;
            }

            let hasMatchingDetail = false;
            if (Array.isArray(event.details)) {
              // Si details es un array, verificar si alguno coincide
              hasMatchingDetail = event.details.some(detail => 
                detail && filters.modulos.includes(detail.trim())
              );
            } else {
              // Si details es un string, verificar coincidencia directa
              hasMatchingDetail = filters.modulos.includes(event.details.trim());
            }

            if (!hasMatchingDetail) {
              return false;
            }
          }

          return true;
        });
        
        // Solo agregar el día si tiene eventos que coinciden
        if (matchingEvents.length > 0) {
          filteredEvents[day] = matchingEvents;
          totalMatchingEvents += matchingEvents.length;
        }
      });

      console.log(`📊 ${row.instructor}: ${totalMatchingEvents} eventos coincidentes en ${Object.keys(filteredEvents).length} días`);

      // Devolver la fila con eventos filtrados
      return {
        ...row,
        events: filteredEvents
      };
    })
    .filter(row => {
      // Para usuarios externos, siempre ocultar instructores sin eventos en la semana actual
      // Para administradores, solo ocultar cuando hay filtros de eventos activos
      if (shouldFilterEmptyInstructors) {
        // Si hay filtros de eventos activos, usar los eventos ya filtrados
        if (hasActiveFilters && (filters.modalidades.length > 0 || filters.programas.length > 0 || filters.modulos.length > 0)) {
          const hasEventsAfterFiltering = Object.keys(row.events).length > 0;
          if (!hasEventsAfterFiltering) {
            console.log(`🚫 Ocultando instructor sin eventos coincidentes con filtros: ${row.instructor}`);
            return false;
          } else {
            const totalEvents = Object.values(row.events).reduce((sum, events) => sum + events.length, 0);
            console.log(`✅ Mostrando instructor con eventos filtrados: ${row.instructor} (${totalEvents} eventos)`);
            return true;
          }
        }
        
        // Para usuarios externos sin filtros de eventos, verificar eventos en la semana actual
        // Necesitamos verificar en los datos originales de la fila antes del filtrado
        const originalRow = rows.find(originalRow => originalRow.id === row.id);
        if (!originalRow) return false;
        
        let hasEventsInCurrentWeek = false;
        let totalEventsInWeek = 0;
        let daysWithEvents = 0;
        
        // Contar eventos en las fechas de la semana actual
        weekDates.forEach(dateStr => {
          const eventsInDate = originalRow.events[dateStr] || [];
          if (eventsInDate.length > 0) {
            hasEventsInCurrentWeek = true;
            totalEventsInWeek += eventsInDate.length;
            daysWithEvents++;
          }
        });
        
        // También verificar formato anterior (solo día) para compatibilidad
        if (!hasEventsInCurrentWeek) {
          Object.entries(originalRow.events).forEach(([key, dayEvents]) => {
            if (!key.includes('-')) { // Formato anterior (solo día)
              const fullDate = getFullDateFromDayWithWeek(key, currentWeek);
              if (weekDates.includes(fullDate) && dayEvents.length > 0) {
                hasEventsInCurrentWeek = true;
                totalEventsInWeek += dayEvents.length;
                daysWithEvents++;
              }
            }
          });
        }
        
        if (!hasEventsInCurrentWeek) {
          const reason = !isAdminContext ? 'usuario externo' : 'sin eventos en semana actual';
          console.log(`🚫 Ocultando instructor sin eventos en semana actual (${reason}): ${row.instructor}`);
          return false;
        } else {
          console.log(`✅ Mostrando instructor con eventos en semana actual: ${row.instructor} (${totalEventsInWeek} eventos en ${daysWithEvents} días)`);
          return true;
        }
      }
      
      return true;
    });
}

// --- FUNCIONES DE NAVEGACIÓN MENSUAL ---

/**
 * Obtiene el mes actual basado en la semana actual
 */
export function getCurrentMonth(): { year: number; month: number } {
  const currentWeek = draftGlobalConfig.value.currentWeek;
  const date = new Date(currentWeek.startDate);
  return {
    year: date.getFullYear(),
    month: date.getMonth()
  };
}

/**
 * Navega al mes anterior o siguiente
 * Para la vista mensual, actualiza la semana de referencia al primer lunes del nuevo mes
 * Funciona igual que navigateWeek pero navega por meses
 */
export function navigateMonth(direction: 'prev' | 'next'): { startDate: string; endDate: string } {
  const isAdminUser = isAdmin.value;
  const currentWeek = isAdminUser ? draftGlobalConfig.value.currentWeek : selectedWeek.value;
  
  console.log('📅 navigateMonth - Estado inicial:', { 
    direction, 
    isAdminUser, 
    currentWeek 
  });
  
  // Crear fechas locales evitando el desfase de zona horaria (igual que navigateWeek)
  const [startYear, startMonth, startDay] = currentWeek.startDate.split('-').map(Number);
  
  // Para navegación mensual, usamos el día 15 del mes actual como referencia
  // para asegurar que siempre estemos en el mes correcto
  const referenceDate = new Date(startYear, startMonth - 1, 15); // month es 0-based, día 15
  
  console.log('📅 navigateMonth - Fecha de referencia (día 15 del mes actual):', {
    año: referenceDate.getFullYear(),
    mes: referenceDate.getMonth() + 1, // +1 para mostrar mes humano
    día: referenceDate.getDate()
  });
  
  // Calcular el nuevo mes
  if (direction === 'prev') {
    referenceDate.setMonth(referenceDate.getMonth() - 1);
  } else {
    referenceDate.setMonth(referenceDate.getMonth() + 1);
  }
  
  console.log('📅 navigateMonth - Fecha después de cambiar mes:', {
    año: referenceDate.getFullYear(),
    mes: referenceDate.getMonth() + 1, // +1 para mostrar mes humano
    día: referenceDate.getDate()
  });
  
  // Obtener el primer día del nuevo mes
  const firstDayOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  
  console.log('📅 navigateMonth - Primer día del nuevo mes:', {
    fecha: firstDayOfMonth.toISOString().split('T')[0],
    díaSemana: firstDayOfMonth.getDay() // 0=domingo, 1=lunes, etc.
  });
  
  // Para navegación mensual, buscar la primera semana completamente dentro del mes
  // o la segunda semana si la primera cruza meses
  const dayOfWeek = firstDayOfMonth.getDay(); // 0 = domingo, 1 = lunes, etc.
  let mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Ajustar para que 0 (domingo) = -6
  
  let monday = new Date(firstDayOfMonth);
  monday.setDate(firstDayOfMonth.getDate() + mondayOffset);
  
  let friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  
  console.log('📅 navigateMonth - Primera opción de lunes:', monday.toISOString().split('T')[0]);
  console.log('📅 navigateMonth - Primera opción de viernes:', friday.toISOString().split('T')[0]);
  
  // Verificar si esta semana está completamente dentro del nuevo mes
  const mondayMonth = monday.getMonth();
  const fridayMonth = friday.getMonth();
  const targetMonth = referenceDate.getMonth();
  
  console.log('📅 navigateMonth - Análisis de meses:', {
    lunesEnMes: mondayMonth + 1,
    viernesEnMes: fridayMonth + 1,
    mesObjetivo: targetMonth + 1
  });
  
  // Si el lunes está en el mes anterior o el viernes en el mes siguiente,
  // buscar la siguiente semana que esté completamente dentro del mes objetivo
  if (mondayMonth !== targetMonth || fridayMonth !== targetMonth) {
    console.log('📅 navigateMonth - Semana cruza meses, buscando siguiente semana');
    monday.setDate(monday.getDate() + 7);
    friday.setDate(friday.getDate() + 7);
    
    console.log('📅 navigateMonth - Segunda opción de lunes:', monday.toISOString().split('T')[0]);
    console.log('📅 navigateMonth - Segunda opción de viernes:', friday.toISOString().split('T')[0]);
  }
  
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const newDates = {
    startDate: formatDate(monday),
    endDate: formatDate(friday)
  };
  
  console.log('📅 navigateMonth - Nuevas fechas calculadas:', newDates);
  
  // Actualizar el estado según el tipo de usuario (igual que navigateWeek, SIN markAsDirty)
  if (isAdminUser) {
    console.log('📅 navigateMonth - Actualizando draftGlobalConfig para admin');
    draftGlobalConfig.value = {
      ...draftGlobalConfig.value,
      currentWeek: newDates
    };
    console.log('📅 navigateMonth - draftGlobalConfig actualizado:', draftGlobalConfig.value.currentWeek);
  } else {
    console.log('📅 navigateMonth - Actualizando selectedWeek para usuario');
    selectedWeek.value = newDates;
    console.log('📅 navigateMonth - selectedWeek actualizado:', selectedWeek.value);
  }
  
  console.log('📅 navigateMonth - Estado actualizado exitosamente');
  
  return newDates;
}

/**
 * Obtiene el rango de fechas completo de un mes
 */
export function getMonthDateRange(year: number, month: number): { startDate: string; endDate: string } {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return {
    startDate: formatDate(firstDay),
    endDate: formatDate(lastDay)
  };
}

/**
 * Cambia el modo de vista entre semanal y mensual (para admins)
 */
export function setViewMode(mode: 'weekly' | 'monthly') {
  draftGlobalConfig.value = {
    ...draftGlobalConfig.value,
    viewMode: mode
  };
  markAsDirty();
}

/**
 * Cambia el modo de vista para usuarios no admin
 */
export function setUserViewMode(mode: 'weekly' | 'monthly') {
  userViewMode.value = mode;
  console.log('🔄 setUserViewMode - Modo actualizado:', mode);
} 