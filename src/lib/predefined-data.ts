/**
 * Datos predefinidos centralizados para eventos del cronograma
 * Este archivo contiene todas las listas predefinidas que se usan en múltiples componentes
 * para evitar duplicación y facilitar el mantenimiento.
 * 
 * NOTA: Los datos ahora se cargan dinámicamente desde Firestore.
 * Los valores por defecto aquí sirven como fallback si Firestore no está disponible.
 */

import { getActivePrograms, getActiveModules, getActiveModalities, getModuleColor } from './firestore';

/**
 * Lista de títulos/programas predefinidos para eventos.
 * Usados en: AddEventCard, EventCard, ExcelUploader
 * NOTA: Valores por defecto, se reemplazarán con datos de Firestore
 */
export const PREDEFINED_TITLES = [
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

/**
 * Cache para los títulos dinámicos cargados desde Firestore
 */
let cachedTitles: string[] = [];
let titlesLoaded = false;

/**
 * Obtiene los títulos/programas desde Firestore o usa el cache
 */
export async function getPredefinedTitles(): Promise<string[]> {
  if (titlesLoaded && cachedTitles.length > 0) {
    return cachedTitles;
  }
  
  try {
    const titles = await getActivePrograms();
    if (titles.length > 0) {
      cachedTitles = titles;
      titlesLoaded = true;
      return titles;
    }
    return PREDEFINED_TITLES;
  } catch (error) {
    console.error('Error cargando títulos desde Firestore:', error);
    return PREDEFINED_TITLES;
  }
}

/**
 * Invalida el cache de títulos para forzar recarga
 */
export function invalidateTitlesCache() {
  titlesLoaded = false;
  cachedTitles = [];
}

/**
 * Lista de detalles/módulos predefinidos para eventos.
 * Usados en: AddEventCard, EventCard, ExcelUploader
 * Estos detalles tienen colores automáticos asignados en colors.ts
 * NOTA: Valores por defecto, se reemplazarán con datos de Firestore
 */
export const PREDEFINED_DETAILS = [
  'Acompañamiento',
  'Actualización de Contenidos',
  'App Terpel',
  'Campo de Entrenamiento de Industria Limpia',
  'Canastilla',
  'Caravana Rumbo PITS',
  'Capacitación Bucaros',
  'Clientes Propios Administrativo',
  'Construyendo Equipos Altamente Efectivos',
  'EDS Confiable',
  'Entrenamiento Terpel POS Administrativo',
  'Entrenamiento Terpel POS Operativo',
  'Excelencia Administrativa',
  'Facturación Electrónica Administrativa',
  'Facturación Electrónica Operativa',
  'Festivo',
  'Formación Inicial Terpel POS Administrativo',
  'Formación Inicial Terpel POS Operativo',
  'Gestión Administrativa',
  'Gestión Ambiental, Seguridad y Salud en el Trabajo',
  'La Toma Vive Terpel & Vive PITS',
  'Masterlub Administrativo',
  'Masterlub Operativo',
  'Módulo Bebidas Calientes',
  'Módulo Escuela de Industria',
  'Módulo Formativo GNV',
  'Módulo Formativo Líquidos',
  'Módulo Formativo Lubricantes',
  'Módulo Historia y Masa',
  'Módulo Perros y Más Perros',
  'Módulo Protagonistas del Servicio',
  'Módulo Rollos',
  'Módulo Sánduches',
  'Módulo Sbarro',
  'Módulo Strombolis',
  'Protocolo de Servicio EDS',
  'Taller EDS Confiable',
  'Traslado',
  'Vacaciones',
  'Vive PITS',
  'UDVA P',
  'Módulo Elementos ambientalmente sensibles',
  'Módulo Control de derrames y atención de emergencias',
  'Módulo Control de calidad',
  'Módulo Medida exacta',
  'Módulo Control de incendios',
  'Módulo Comportamiento seguro',
  'Módulo Primeros auxilios',
  'Módulo Investigación de accidentes',
  'Bogotá',
  'Barranquilla',
  'Empleados Terpel',
  'Seguimiento Apertura',
  'Entrenamiento Tienda',
  'Preparación de Formación'
];

/**
 * Cache para los módulos dinámicos cargados desde Firestore
 */
let cachedDetails: string[] = [];
let detailsLoaded = false;

/**
 * Obtiene los detalles/módulos desde Firestore o usa el cache
 */
export async function getPredefinedDetails(): Promise<string[]> {
  if (detailsLoaded && cachedDetails.length > 0) {
    return cachedDetails;
  }
  
  try {
    const details = await getActiveModules();
    if (details.length > 0) {
      cachedDetails = details;
      detailsLoaded = true;
      return details;
    }
    return PREDEFINED_DETAILS;
  } catch (error) {
    console.error('Error cargando módulos desde Firestore:', error);
    return PREDEFINED_DETAILS;
  }
}

/**
 * Invalida el cache de módulos para forzar recarga
 */
export function invalidateDetailsCache() {
  detailsLoaded = false;
  cachedDetails = [];
}

/**
 * Obtiene el color de un módulo específico desde Firestore
 */
export async function getDetailColor(detailName: string): Promise<string> {
  try {
    return await getModuleColor(detailName);
  } catch (error) {
    console.error('Error obteniendo color del módulo:', error);
    return 'bg-blue-600';
  }
}

/**
 * Lista de modalidades predefinidas para eventos.
 * Usados en: AddEventCard, EventCard, ExcelUploader
 * NOTA: Valores por defecto, se reemplazarán con datos de Firestore
 */
export const PREDEFINED_MODALITIES = [
  'Presencial',
  'Virtual',
];

/**
 * Cache para las modalidades dinámicas cargadas desde Firestore
 */
let cachedModalities: string[] = [];
let modalitiesLoaded = false;

/**
 * Obtiene las modalidades desde Firestore o usa el cache
 */
export async function getPredefinedModalities(): Promise<string[]> {
  if (modalitiesLoaded && cachedModalities.length > 0) {
    return cachedModalities;
  }
  
  try {
    const modalities = await getActiveModalities();
    if (modalities.length > 0) {
      cachedModalities = modalities;
      modalitiesLoaded = true;
      return modalities;
    }
    return PREDEFINED_MODALITIES;
  } catch (error) {
    console.error('Error cargando modalidades desde Firestore:', error);
    return PREDEFINED_MODALITIES;
  }
}

/**
 * Invalida el cache de modalidades para forzar recarga
 */
export function invalidateModalitiesCache() {
  modalitiesLoaded = false;
  cachedModalities = [];
}

/**
 * Invalida todos los caches para forzar recarga completa
 */
export function invalidateAllCaches() {
  invalidateTitlesCache();
  invalidateDetailsCache();
  invalidateModalitiesCache();
}

/**
 * Lista de días válidos para eventos (lunes a viernes).
 * Usados en: ExcelUploader para validación
 */
export const VALID_DAYS = [
  'lunes',
  'martes',
  'miercoles',
  'miércoles',
  'jueves',
  'viernes'
];

/**
 * Ejemplos de horarios para plantillas y documentación.
 * Usados en: ExcelUploader para generar plantillas
 */
export const TIME_EXAMPLES = [
  '7:00 a.m.', '7:30 a.m.', '8:00 a.m.', '8:30 a.m.', '9:00 a.m.',
  '9:30 a.m.', '10:00 a.m.', '10:30 a.m.', '11:00 a.m.', '11:30 a.m.',
  '12:00 p.m.', '12:30 p.m.', '1:00 p.m.', '1:30 p.m.', '2:00 p.m.',
  '2:30 p.m.', '3:00 p.m.', '3:30 p.m.', '4:00 p.m.', '4:30 p.m.', 
  '5:00 p.m.', '5:30 p.m.', '6:00 p.m.', '6:30 p.m.', '7:00 p.m.', 
  '7:30 p.m.', '8:00 p.m.', '8:30 p.m.', '9:00 p.m.', '9:30 p.m.', 
  '10:00 p.m.'
];

/**
 * Configuración de campos requeridos para validación de Excel.
 * Usados en: ExcelUploader para validación
 */
export const REQUIRED_FIELDS = ['instructor', 'regional', 'titulo', 'dia'];

/**
 * Configuración de campos opcionales con valores por defecto.
 * Usados en: ExcelUploader para procesamiento de datos
 */
export const OPTIONAL_FIELD_DEFAULTS = {
  detalles: 'Sin detalles especificados',
  ubicacion: 'Por definir',
  modalidad: '',
  horaInicio: '',
  horaFin: ''
};
