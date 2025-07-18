/**
 * Utilidades para manejo seguro de APIs del navegador durante SSR
 */

/**
 * Función helper para mostrar diálogos de confirmación de forma segura
 * Verifica que estemos en el navegador antes de llamar a confirm()
 * 
 * @param message - Mensaje a mostrar en el diálogo
 * @returns boolean - true si el usuario confirma, false en caso contrario
 */
export const safeConfirm = (message: string): boolean => {
  // Verificar que estamos en el navegador
  if (typeof window !== 'undefined' && window.confirm) {
    return window.confirm(message);
  }
  
  // Fallback para SSR - registrar en consola
  console.warn('⚠️ safeConfirm llamado durante SSR:', message);
  return false;
};

/**
 * Función helper para alertas de forma segura
 * 
 * @param message - Mensaje a mostrar
 */
export const safeAlert = (message: string): void => {
  if (typeof window !== 'undefined' && window.alert) {
    window.alert(message);
  } else {
    console.warn('⚠️ safeAlert llamado durante SSR:', message);
  }
};

/**
 * Función helper para recargar la página de forma segura
 */
export const safeReload = (): void => {
  if (typeof window !== 'undefined' && window.location) {
    window.location.reload();
  } else {
    console.warn('⚠️ safeReload llamado durante SSR');
  }
};

/**
 * Verificar si estamos en el cliente (navegador)
 * 
 * @returns boolean - true si estamos en el navegador
 */
export const isClient = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * Ejecutar función solo en el cliente
 * 
 * @param fn - Función a ejecutar
 * @param fallback - Función alternativa para SSR (opcional)
 */
export const clientOnly = <T>(fn: () => T, fallback?: () => T): T | undefined => {
  if (isClient()) {
    return fn();
  } else if (fallback) {
    return fallback();
  }
  return undefined;
}; 