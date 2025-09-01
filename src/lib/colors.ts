/**
 * Archivo centralizado para el manejo de colores de eventos
 * Contiene la paleta completa de colores disponibles y las funciones para su gestión
 */

// Paleta completa de colores para eventos (74 colores únicos)
export const EVENT_COLORS = [
  '#34b45c', '#d42639', '#6cb444', '#b41c4c', '#ec449c', '#44449c', '#f464a4', '#23a6c4', 
  '#7cc444', '#945ca4', '#93c743', '#b41c5c', '#34a4dc', '#f8945c', '#d69833', '#906cac', 
  '#acd46c', '#f4ec47', '#f16f2e', '#f46780', '#43c7ec', '#ec342c', '#74c48c', '#544c9c', 
  '#ec4c3b', '#5fbc6b', '#3c4c9c', '#5e56a6', '#dccc34', '#63c6bb', '#14b493', '#1cc4f4', 
  '#43b3e7', '#88509c', '#1783b0', '#1c449c', '#54c4bc', '#ec2473', '#34bc94', '#dc146c', 
  '#84449c', '#74c4b4', '#2c60ac', '#485ba7', '#5cc49c', '#cc6424', '#44bc64', '#5c84c4', 
  '#f4f46c', '#ec447c', '#1c50a4', '#1c5ca4', '#3c6cb4', '#3454a4', '#3cb840', '#dcd4b4', 
  '#9898d0', '#4c2ccc', '#FF0818', '#F3FFFF', '#FFE500', '#FDB913', '#B50000', '#7C0000', 
  '#EDF9F9', '#C9D6D7', '#A9BBBD', '#638287', '#46646B', '#1A3A42'
];

// Función para generar estilos CSS inline para los colores
export const getColorStyle = (color: string): { backgroundColor: string } => ({
  backgroundColor: color
});

// Función para obtener un color aleatorio de la paleta
export const getRandomEventColor = (): string => {
  return EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)];
};

// Función para validar si un color está en la paleta
export const isValidEventColor = (color: string): boolean => {
  return EVENT_COLORS.includes(color.toUpperCase()) || EVENT_COLORS.includes(color.toLowerCase());
};

/**
 * Mapeo de detalles predefinidos a colores específicos de la nueva paleta.
 * Cada detalle tiene un color único asociado para facilitar la identificación visual.
 */
export const detailColorMap: { [key: string]: string } = {
  // Módulos formativos - Tonos azules de la nueva paleta
  'Módulo Protagonistas del Servicio': '#b01a4e',
  'Módulo Formativo GNV': '#9bcb48',
  'Módulo Formativo Líquidos': '#f7f06d',
  'Módulo Formativo Lubricantes': '#1ac0f2',
  'Módulo Escuela de Industria': '#e96f24',
  
  // Protocolos y gestión - Tonos verdes de la nueva paleta
  'Protocolo de Servicio EDS': '#FF0818',
  'Gestión Ambiental, Seguridad y Salud en el Trabajo': '#e96f24',
  'Acompañamiento': '#EDF9F9',
  
  // Programas VIVE - Tonos púrpuras de la nueva paleta
  'La Toma Vive Terpel & Vive PITS': '#1f4299',
  'Caravana Rumbo PITS': '#bda42f',
  
  // Formación TERPEL POS - Tonos naranjas de la nueva paleta
  'Formación Inicial Terpel POS Operativo': '#68b645',
  'Formación Inicial Terpel POS Administrativo': '#68b645',
  'Entrenamiento Terpel POS Operativo': '#68b645',
  'Entrenamiento Terpel POS Administrativo': '#68b645',
  
  // Facturación - Tonos rosados/rojos de la nueva paleta
  'Facturación Electrónica Operativa': '#68b645',
  'Facturación Electrónica Administrativa': '#68b645',
  
  // Productos específicos - Tonos diversos de la nueva paleta
  'Canastilla': '#68b645',
  'Clientes Propios Administrativo': '#68b645',
  'App Terpel': '#68b645',
  
  // MASTERLUB - Tonos verdes-azules de la nueva paleta
  'Masterlub Operativo': '#68b645',
  'Masterlub Administrativo': '#68b645',
  
  // EDS - Tonos amarillos de la nueva paleta
  'EDS Confiable': '#12b19f',
  'Taller EDS Confiable': '#12b19f',
  
  // Campos y entrenamientos - Tonos verdes de la nueva paleta
  'Campo de Entrenamiento de Industria Limpia': '#74C48C',
  'Excelencia Administrativa': '#638287',
  'Construyendo Equipos Altamente Efectivos': '#638287',
  
  // Módulos de comida
  'Módulo Rollos': '#f8945c',
  'Módulo Historia y Masa': '#f8945c',
  'Módulo Strombolis': '#f8945c',
  'Módulo Perros y Más Perros': '#f8945c',
  'Módulo Sánduches': '#f8945c',
  'Módulo Sbarro': '#f8945c',
  'Módulo Bebidas Calientes': '#f8945c',
  'Entrenamiento Tienda': '#f8945c',
  'Seguimiento Apertura': '#f8945c',

  // Proyectos
  'UDVA P': '#dcd4b4',

  // Otras categorías
  'Festivo': '#46646B',
  'Gestión Administrativa': '#46646B',
  'Actualización de Contenidos': '#46646B',
  'Vacaciones': '#46646B',
  'Traslado': '#46646B',
  'Preparación de Formación': '#46646B',

  // Módulos de EDS Confiable
  'Módulo Elementos ambientalmente sensibles': '#187BA6',
  'Módulo Control de derrames y atención de emergencias': '#187BA6',
  'Módulo Control de calidad': '#187BA6', 
  'Módulo Medida exacta': '#187BA6',
  'Módulo Control de incendios': '#187BA6',
  'Módulo Comportamiento seguro': '#187BA6',
  'Módulo Primeros auxilios': '#187BA6',
  'Módulo Investigación de accidentes': '#187BA6',
  'Bogotá': '#88589B',
  'Barranquilla': '#88589B',
  'Empleados Terpel': '#C48E35',
};

/**
 * Función para obtener el color asociado a un detalle específico.
 * @param detail - El detalle del evento
 * @returns El color asociado al detalle o un color aleatorio si no está mapeado
 */
export const getColorForDetail = (detail: string): string => {
  return detailColorMap[detail] || getRandomEventColor();
};

/**
 * Función para convertir un color hex a un estilo CSS
 * @param hexColor - Color en formato hexadecimal
 * @returns Objeto con el estilo CSS
 */
export const hexToStyle = (hexColor: string): { backgroundColor: string } => ({
  backgroundColor: hexColor
});

/**
 * Función para generar un color de contraste apropiado para texto
 * @param hexColor - Color de fondo en formato hexadecimal
 * @returns Color de texto apropiado (blanco o negro)
 */
export const getContrastTextColor = (hexColor: string): string => {
  // Remover el # si está presente
  const hex = hexColor.replace('#', '');
  
  // Convertir a RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calcular luminancia
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Retornar color de texto apropiado
  return luminance > 0.5 ? '#000000' : '#ffffff';
}; 