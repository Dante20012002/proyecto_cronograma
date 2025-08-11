/**
 * Datos predefinidos centralizados para eventos del cronograma
 * Este archivo contiene todas las listas predefinidas que se usan en múltiples componentes
 * para evitar duplicación y facilitar el mantenimiento.
 */

/**
 * Lista de títulos/programas predefinidos para eventos.
 * Usados en: AddEventCard, EventCard, ExcelUploader
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
  '-'
];

/**
 * Lista de detalles/módulos predefinidos para eventos.
 * Usados en: AddEventCard, EventCard, ExcelUploader
 * Estos detalles tienen colores automáticos asignados en colors.ts
 */
export const PREDEFINED_DETAILS = [
  'Módulo Protagonistas del Servicio',
  'Módulo Formativo GNV',
  'Módulo Formativo Líquidos',
  'Módulo Formativo Lubricantes',
  'Protocolo de Servicio EDS',
  'Gestión Ambiental, Seguridad y Salud en el Trabajo',
  'Módulo Escuela de Industria',
  'Excelencia Administrativa',
  'Vive PITS',
  'La Toma Vive Terpel & Vive PITS',
  'Formación Inicial Terpel POS Operativo',
  'Facturación Electrónica Operativa',
  'Facturación Electrónica Administrativa',
  'Canastilla',
  'Entrenamiento Terpel POS Operativo',
  'Entrenamiento Terpel POS Administrativo',
  'Formación Inicial Terpel POS Administrativo',
  'Clientes Propios Administrativo',
  'Masterlub Operativo',
  'Masterlub Administrativo',
  'EDS Confiable',
  'Campo de Entrenamiento de Industria Limpia',
  'Caravana Rumbo PITS',
  'App Terpel',
  'Módulo Rollos',
  'Módulo Historia y Masa',
  'Módulo Strombolis',
  'Módulo Perros y Más Perros',
  'Módulo Sánduches',
  'Módulo Sbarro',
  'Módulo Bebidas Calientes',
  'UDVA P',
  'Construyendo Equipos Altamente Efectivos',
  'Taller EDS Confiable',
  'Festivo',
  'Gestión Administrativa',
  'Actualización de Contenidos',
  'Vacaciones',
  'Traslado',
  'Acompañamiento'
];

/**
 * Lista de modalidades predefinidas para eventos.
 * Usados en: AddEventCard, EventCard, ExcelUploader
 */
export const PREDEFINED_MODALITIES = [
  'Presencial',
  'Virtual',
];

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
