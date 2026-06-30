/**
 * Archivo centralizado para el manejo de colores de eventos
 * Contiene la paleta completa de colores disponibles y las funciones para su gestión
 *
 * 🔄 FLUJO DE COLORES (Prioridad):
 *
 * 1. getColorForDetail() busca PRIMERO en Firebase por módulos asignados
 * 2. Si no encuentra en Firebase, usa detailColorMap como fallback
 * 3. Si no existe en ninguno, genera color aleatorio
 *
 * 💡 RECOMENDACIÓN: Mantén sincronizados los colores entre Firebase y detailColorMap
 * para consistencia, pero Firebase tiene prioridad para módulos asignados.
 *
 * Ejemplo:
 *   Firebase: { name: 'Módulo Formativo GNV', color: '#9bcb48' }
 *   detailColorMap: { 'Módulo Formativo GNV': '#9bcb48' }
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

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
  'Módulo Elementos ambientalmente sensibles': '#EC447C',
  'Módulo Control de derrames y atención de emergencias': '#EC447C',
  'Módulo Control de calidad': '#EC447C',
  'Módulo Medida exacta': '#EC447C',
  'Módulo Control de incendios': '#EC447C',
  'Módulo Comportamiento seguro': '#EC447C',
  'Módulo Primeros auxilios': '#EC447C',
  'Módulo Investigación de accidentes': '#EC447C',
  'Bogotá': '#12b19f',
  'Barranquilla': '#12b19f',
  'Empleados Terpel': '#C48E35',
};

/**
 * Mapeo de colores Tailwind a HEX para normalización
 * Usado para convertir colores antiguos a formato HEX
 */
const tailwindColorMap: { [key: string]: string } = {
  'bg-blue-600': '#2563eb',
  'bg-green-600': '#16a34a',
  'bg-red-600': '#dc2626',
  'bg-yellow-600': '#ca8a04',
  'bg-purple-600': '#9333ea',
  'bg-pink-600': '#db2777',
  'bg-indigo-600': '#4f46e5',
  'bg-orange-600': '#ea580c',
  'bg-teal-600': '#0d9488',
  'bg-cyan-600': '#0891b2',
};

/**
 * Normaliza un color de cualquier formato (Tailwind o HEX) a HEX
 * 
 * @param color - Color en formato Tailwind (ej: 'bg-blue-600') o HEX (ej: '#2563eb')
 * @returns string - Color en formato HEX
 */
export const normalizeColorToHex = (color: string): string => {
  // Si ya es HEX, devolverlo
  if (color.startsWith('#')) {
    return color;
  }
  
  // Si es Tailwind, convertir
  const hexColor = tailwindColorMap[color];
  if (hexColor) {
    return hexColor;
  }
  
  // Si no se encuentra, retornar el primer color de la paleta como fallback
  return EVENT_COLORS[0];
};

/**
 * Función para obtener el color sugerido para un módulo basándose en su nombre.
 * Si el módulo existe en detailColorMap, devuelve ese color.
 * Si no, devuelve un color aleatorio de la paleta.
 *
 * @param moduleName - Nombre del módulo
 * @returns Color HEX sugerido
 */
export const getSuggestedColorForModule = (moduleName: string): string => {
  const mappedColor = detailColorMap[moduleName];
  if (mappedColor) {
    return mappedColor;
  }
  return getRandomEventColor();
};

/**
 * Función para obtener el color asociado a un detalle específico.
 * Ahora busca primero en Firebase los módulos y sus colores asignados,
 * y solo usa detailColorMap como fallback.
 *
 * @param detail - El detalle del evento
 * @returns Promise<string> - El color HEX asociado al detalle
 */
export const getColorForDetail = async (detail: string): Promise<string> => {
  try {
    // Primero buscar en Firebase si existe un módulo con ese nombre
    const modulesCollection = collection(db, 'modules');
    const q = query(modulesCollection, where('name', '==', detail), where('active', '==', true));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // Encontró el módulo en Firebase, usar su color asignado
      const moduleDoc = snapshot.docs[0];
      const moduleData = moduleDoc.data();
      if (moduleData.color && moduleData.color.startsWith('#')) {
        return moduleData.color;
      }
    }

    // Si no encontró en Firebase, usar detailColorMap como fallback
    const mappedColor = detailColorMap[detail];
    if (mappedColor) {
      return mappedColor;
    }

    // Último recurso: color aleatorio
    return getRandomEventColor();
  } catch (error) {
    console.warn(`Error obteniendo color para "${detail}":`, error);
    // En caso de error, usar fallback
    return detailColorMap[detail] || getRandomEventColor();
  }
};

/**
 * Función para validar si un módulo está correctamente sincronizado con detailColorMap.
 * Esto ayuda a detectar inconsistencias que causan que los eventos reciban colores aleatorios.
 *
 * @param moduleName - Nombre del módulo a verificar
 * @param moduleColor - Color HEX del módulo en Firestore
 * @returns { synced: boolean, expected: string | null, message: string }
 */
export const validateModuleColorSync = (moduleName: string, moduleColor: string): {
  synced: boolean;
  expected: string | null;
  message: string;
} => {
  const expectedColor = detailColorMap[moduleName];

  if (!expectedColor) {
    return {
      synced: false,
      expected: null,
      message: `⚠️ Módulo "${moduleName}" NO está en detailColorMap. Eventos usarán color aleatorio.`
    };
  }

  if (expectedColor.toLowerCase() !== moduleColor.toLowerCase()) {
    return {
      synced: false,
      expected: expectedColor,
      message: `❌ MISMATCH: Módulo "${moduleName}" tiene color ${moduleColor} en Firebase, pero detailColorMap espera ${expectedColor}`
    };
  }

  return {
    synced: true,
    expected: expectedColor,
    message: `✅ Módulo "${moduleName}" está correctamente sincronizado.`
  };
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