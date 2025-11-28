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
  'PROYECTO',
  '-'
];

/**
 * Lista de detalles/módulos predefinidos para eventos.
 * Usados en: AddEventCard, EventCard, ExcelUploader
 * Estos detalles tienen colores automáticos asignados en colors.ts
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
