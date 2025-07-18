import { useState, useEffect } from 'preact/hooks';
import { isConnected, initializeFirebase, cleanupFirebase, debugDataIntegrity, removeDuplicateEvents, clearAllDraftEvents, fixIncompleteEvents, debugPublishState, copyEventInSameCell, debugOperationQueue, migrateAllEventsToNewFormat, cleanupLegacyEvents, resetToCurrentWeek, updateWeekTitle, getWeekTitle, getCurrentWeekTitle } from '../stores/schedule';
import { isAdmin, currentUser, hasPermission, exposeDebugTools } from '../lib/auth';
import type { JSX } from 'preact';
import AdminToolbar from './AdminToolbar';
import UserToolbar from './UserToolbar';
import ScheduleGrid from './ScheduleGrid';
import { LoginForm } from './LoginForm';
import GlobalConfig from './GlobalConfig';
import InstructorManager from './InstructorManager';
import AdminDebugPanel from './AdminDebugPanel';
import AdminManager from './AdminManager';

/**
 * Componente principal que envuelve toda la funcionalidad del cronograma.
 * Maneja la inicialización de Firebase y la lógica de autenticación.
 * 
 * @component
 * @returns {JSX.Element} Componente CronogramaWrapper
 * 
 * @example
 * ```tsx
 * <CronogramaWrapper />
 * ```
 */
export default function CronogramaWrapper(): JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showInstructors, setShowInstructors] = useState(false);
  const [showAdminManager, setShowAdminManager] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Marcar que estamos en el cliente
    setIsClient(true);

    // Inicializar Firebase al montar el componente
    initializeFirebase().catch(err => {
      console.error('Error al inicializar Firebase:', err);
      setError('Error al conectar con el servidor. Por favor, recarga la página.');
    });

    // Exponer herramientas de debugging de auth (SSR-safe)
    exposeDebugTools();

    // Solo en modo desarrollo: exponer funciones de debugging de forma controlada
    // Este código se ejecuta solo en el cliente después del montaje
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      console.log('%c=== MODO DESARROLLO - DEBUGGING DISPONIBLE ===', 'color: #ff6600; font-weight: bold; font-size: 14px;');
      
      // Crear objeto de debugging encapsulado
      const debugTools = {
        // Herramientas de diagnóstico
        checkIntegrity: debugDataIntegrity,
        checkPublishState: debugPublishState,
        checkOperationQueue: debugOperationQueue,
        
        // Herramientas de limpieza
        removeDuplicates: removeDuplicateEvents,
        fixIncomplete: fixIncompleteEvents,
        cleanupLegacy: cleanupLegacyEvents,
        
        // Herramientas de migración
        migrateFormat: migrateAllEventsToNewFormat,
        resetWeek: resetToCurrentWeek,
        
        // Herramientas de gestión
        updateWeekTitle: updateWeekTitle,
        getWeekTitle: getWeekTitle,
        getCurrentWeekTitle: getCurrentWeekTitle,
        copyEvent: copyEventInSameCell,
        
        // ⚠️ HERRAMIENTAS PELIGROSAS
        DANGER: {
          clearAllDrafts: () => {
            console.warn('⚠️ ADVERTENCIA: Esta función eliminará TODOS los eventos en borrador');
            console.log('Para continuar, ejecuta: debugTools.DANGER.confirmClearAllDrafts()');
          },
          confirmClearAllDrafts: () => {
            // Verificar que confirm está disponible (client-side)
            if (typeof window !== 'undefined' && window.confirm) {
              if (window.confirm('⚠️ ÚLTIMA ADVERTENCIA: Esto eliminará TODOS los eventos en borrador. ¿Continuar?')) {
                return clearAllDraftEvents();
              }
            } else {
              console.error('⚠️ Esta función solo está disponible en el navegador');
            }
          }
        },
        
        // Ayuda
        help: () => {
          console.log('%c=== HERRAMIENTAS DE DEBUGGING DISPONIBLES ===', 'color: #00ff00; font-weight: bold;');
          console.log('%c🔍 DIAGNÓSTICO:', 'color: #00bfff; font-weight: bold;');
          console.log('debugTools.checkIntegrity()     - Verificar integridad de datos');
          console.log('debugTools.checkPublishState()  - Estado de publicación');
          console.log('debugTools.checkOperationQueue() - Cola de operaciones');
          console.log('%c🧹 LIMPIEZA:', 'color: #00bfff; font-weight: bold;');
          console.log('debugTools.removeDuplicates()   - Limpiar eventos duplicados');
          console.log('debugTools.fixIncomplete()      - Corregir eventos incompletos');
          console.log('debugTools.cleanupLegacy()      - Limpiar formato anterior');
          console.log('%c🔄 MIGRACIÓN:', 'color: #00bfff; font-weight: bold;');
          console.log('debugTools.migrateFormat()      - Migrar al nuevo formato');
          console.log('debugTools.resetWeek()          - Resetear a semana actual');
          console.log('%c📋 GESTIÓN:', 'color: #00bfff; font-weight: bold;');
          console.log('debugTools.copyEvent(id, row, day) - Copiar evento');
          console.log('debugTools.updateWeekTitle(...)    - Actualizar título');
          console.log('%c⚠️ PELIGROSAS:', 'color: #ff6600; font-weight: bold;');
          console.log('debugTools.DANGER.clearAllDrafts() - Ver advertencia');
          console.log('%c', 'color: #ffffff;');
          console.log('%cUsa debugTools.help() para ver esta ayuda nuevamente', 'color: #888888;');
        }
      };

      // Exponer herramientas de debugging de forma controlada
      (window as any).debugTools = debugTools;
      
      console.log('%cUsa debugTools.help() para ver todas las herramientas disponibles', 'color: #00ff00;');
      console.log('%cEjemplo: debugTools.checkIntegrity()', 'color: #ffff00;');
    } else {
      // En producción, solo mostrar información básica
      console.log('%c🔒 Modo Producción - Herramientas de debugging no disponibles', 'color: #888888;');
    }

    // Limpiar funciones al desmontar
    return () => {
      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        delete (window as any).debugTools;
      }
    };
  }, []);

  // Mostrar error si hay problemas de conexión
  if (error) {
    return (
      <div class="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div class="flex items-center space-x-3 mb-4">
            <span class="text-red-600 text-2xl">⚠️</span>
            <h2 class="text-lg font-semibold text-red-800">Error de Conexión</h2>
          </div>
          <p class="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
            class="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
          >
            Recargar Página
          </button>
        </div>
      </div>
    );
  }

  // Mostrar formulario de login si no está autenticado y se solicita
  if (showLogin) {
    return (
      <div class="min-h-screen bg-gray-100 p-4">
        <div class="max-w-md mx-auto">
          <LoginForm 
            onCancel={() => setShowLogin(false)} 
            onSuccess={() => setShowLogin(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-gray-100 p-2 sm:p-4">
      <div class="max-w-7xl mx-auto space-y-2 sm:space-y-4">
        {isAdmin.value ? (
          <>
            <AdminToolbar />
            <div class="bg-white rounded-lg shadow-md p-3 sm:p-4">
              <div class="flex flex-col space-y-2">
                {/* Primera fila de botones principales */}
                <div class="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    onClick={() => setShowConfig(!showConfig)}
                    class="w-full sm:w-auto px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    {showConfig ? 'Ocultar Configuración' : '⚙️ Configuración Global'}
                  </button>
                  <button
                    onClick={() => setShowInstructors(!showInstructors)}
                    class="w-full sm:w-auto px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
                  >
                    {showInstructors ? 'Ocultar Instructores' : '👨‍🏫 Gestionar Instructores'}
                  </button>
                </div>

                {/* Segunda fila de botones administrativos */}
                <div class="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                  {hasPermission('canManageAdmins') && (
                    <button
                      onClick={() => setShowAdminManager(!showAdminManager)}
                      class="w-full sm:w-auto px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                    >
                      {showAdminManager ? 'Ocultar Gestión Admin' : '👥 Gestionar Administradores'}
                    </button>
                  )}
                  
                  {hasPermission('canAccessDebugPanel') && (
                    <button
                      onClick={() => setShowDebugPanel(!showDebugPanel)}
                      class="w-full sm:w-auto px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 transition-colors"
                    >
                      {showDebugPanel ? 'Ocultar Debug Panel' : '🛠️ Panel de Debugging'}
                    </button>
                  )}
                </div>
              </div>

              {/* Paneles administrativos */}
              {showConfig && (
                <div class="mt-4 border-t border-gray-200 pt-4">
                  <h3 class="text-lg font-semibold text-gray-900 mb-3">⚙️ Configuración Global</h3>
                  <GlobalConfig />
                </div>
              )}
              
              {showInstructors && (
                <div class="mt-4 border-t border-gray-200 pt-4">
                  <h3 class="text-lg font-semibold text-gray-900 mb-3">👨‍🏫 Gestión de Instructores</h3>
                  <InstructorManager />
                </div>
              )}
              
              {showAdminManager && hasPermission('canManageAdmins') && (
                <div class="mt-4 border-t border-gray-200 pt-4">
                  <AdminManager />
                </div>
              )}
              
              {showDebugPanel && hasPermission('canAccessDebugPanel') && (
                <div class="mt-4 border-t border-gray-200 pt-4">
                  <AdminDebugPanel />
                </div>
              )}
            </div>
          </>
        ) : (
          <div class="flex flex-col sm:flex-row justify-between items-center bg-white rounded-lg shadow-md p-3 sm:p-4 space-y-2 sm:space-y-0">
            <UserToolbar />
            <div class="w-full sm:w-auto sm:ml-8 flex justify-center sm:justify-end">
              <button
                onClick={() => setShowLogin(true)}
                class="w-full sm:w-auto px-3 py-1.5 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
              >
                🔐 Acceso Administrador
              </button>
            </div>
          </div>
        )}
        
        <ScheduleGrid isAdmin={isAdmin.value} />
        
        {/* Información de desarrollo - solo mostrar en cliente */}
        {isClient && import.meta.env.DEV && (
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
            <div class="flex items-center space-x-2">
              <span class="text-yellow-600">⚠️</span>
              <span class="text-yellow-800 font-medium">Modo Desarrollo</span>
            </div>
            <p class="text-yellow-700 mt-1">
              Usuario: {currentUser.value?.email || 'No autenticado'} | 
              Admin: {isAdmin.value ? '✅' : '❌'} | 
              Herramientas: Usa <code class="bg-yellow-200 px-1 rounded">debugTools.help()</code> en consola
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 