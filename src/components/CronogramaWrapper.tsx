import { useState, useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { isConnected, initializeFirebase, cleanupFirebase, debugDataIntegrity, removeDuplicateEvents, clearAllDraftEvents, fixIncompleteEvents, debugPublishState, copyEventInSameCell, debugOperationQueue, migrateAllEventsToNewFormat, cleanupLegacyEvents, resetToCurrentWeek, updateWeekTitle, getWeekTitle, getCurrentWeekTitle, draftGlobalConfig, publishedGlobalConfig, userViewMode } from '../stores/schedule';
import { isAdmin, currentUser, exposeDebugTools } from '../lib/auth';
import type { JSX } from 'preact';
import AdminToolbar from './AdminToolbar';
import UserToolbar from './UserToolbar';
import ScheduleGrid from './ScheduleGrid';
import MonthlyScheduleGrid from './MonthlyScheduleGrid';
import { LoginForm } from './LoginForm';
import FloatingAdminPanel from './FloatingAdminPanel';

/**
 * Componente interno para renderizar la vista correcta según el modo
 */
function ViewRenderer(): JSX.Element {
  // Usar signals reactivos para que el componente se actualice automáticamente
  const adminViewMode = useSignal(draftGlobalConfig.value.viewMode);
  const userViewModeSignal = useSignal(userViewMode.value);
  const isAdminSignal = useSignal(isAdmin.value);

  // Actualizar cuando cambien los valores
  useEffect(() => {
    adminViewMode.value = draftGlobalConfig.value.viewMode;
  }, [draftGlobalConfig.value.viewMode]);

  useEffect(() => {
    userViewModeSignal.value = userViewMode.value;
  }, [userViewMode.value]);

  useEffect(() => {
    isAdminSignal.value = isAdmin.value;
  }, [isAdmin.value]);

  const currentViewMode = isAdminSignal.value ? adminViewMode.value : userViewModeSignal.value;
  
  return currentViewMode === 'monthly' 
    ? <MonthlyScheduleGrid isAdmin={isAdminSignal.value} />
    : <ScheduleGrid isAdmin={isAdminSignal.value} />;
}

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
  const [showLogin, setShowLogin] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Marcar que estamos en el cliente
    setIsClient(true);

    // Inicializar Firebase al montar el componente
    initializeFirebase().catch(err => {
      setError('Error al conectar con el servidor. Por favor, recarga la página.');
    });

    // Exponer herramientas de debugging de auth (SSR-safe)
    exposeDebugTools();

    // Solo en modo desarrollo: exponer funciones de debugging de forma controlada
    // Este código se ejecuta solo en el cliente después del montaje
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
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
        
        //HERRAMIENTAS PELIGROSAS
        DANGER: {
          clearAllDrafts: () => {
            // ADVERTENCIA: Esta función eliminará TODOS los eventos en borrador
            // Para continuar, ejecuta: debugTools.DANGER.confirmClearAllDrafts()
          },
          confirmClearAllDrafts: () => {
            // Verificar que confirm está disponible (client-side)
            if (typeof window !== 'undefined' && window.confirm) {
              if (window.confirm('ÚLTIMA ADVERTENCIA: Esto eliminará TODOS los eventos en borrador. ¿Continuar?')) {
                return clearAllDraftEvents();
              }
            }
          }
        },
        
        // Ayuda
        help: () => {
          // HERRAMIENTAS DE DEBUGGING DISPONIBLES
          // DIAGNÓSTICO:
          // debugTools.checkIntegrity()     - Verificar integridad de datos
          // debugTools.checkPublishState()  - Estado de publicación
          // debugTools.checkOperationQueue() - Cola de operaciones
          // LIMPIEZA:
          // debugTools.removeDuplicates()   - Limpiar eventos duplicados
          // debugTools.fixIncomplete()      - Corregir eventos incompletos
          // debugTools.cleanupLegacy()      - Limpiar formato anterior
          // MIGRACIÓN:
          // debugTools.migrateFormat()      - Migrar al nuevo formato
          // debugTools.resetWeek()          - Resetear a semana actual
          // GESTIÓN:
          // debugTools.copyEvent(id, row, day) - Copiar evento
          // debugTools.updateWeekTitle(...)    - Actualizar título
          // PELIGROSAS:
          // debugTools.DANGER.clearAllDrafts() - Ver advertencia
          // Usa debugTools.help() para ver esta ayuda nuevamente
        }
      };

      // Exponer herramientas de debugging de forma controlada
      (window as any).debugTools = debugTools;
    }

    // Limpiar recursos al desmontar
    return () => {
      cleanupFirebase();
    };
  }, []);

  if (error) {
    return (
      <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <span class="text-red-600 text-2xl"></span>
            </div>
            <div>
              <h3 class="text-lg font-medium text-red-800">Error de Conexión</h3>
              <p class="text-red-600 text-sm mt-1">{error}</p>
              <button
                onClick={() => window.location.reload()}
                class="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
              >
                Recargar Página
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected.value) {
    return (
      <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-md p-6 max-w-md w-full text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 class="text-lg font-medium text-gray-900">Conectando...</h3>
          <p class="text-gray-600 text-sm mt-1">Por favor espera mientras establecemos la conexión.</p>
        </div>
      </div>
    );
  }

  const handleLoginSuccess = () => {
    setShowLogin(false);
  };

  return (
    <div class="min-h-screen bg-gray-100 p-2 sm:p-4">
      <div class="max-w-7xl mx-auto space-y-2 sm:space-y-4">
        {isAdmin.value ? (
          <>
            <AdminToolbar />
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
        
        {/* Renderizar vista según el modo seleccionado */}
        <ViewRenderer />
        
        {/* Panel flotante de administración - solo para admins */}
        {isAdmin.value && <FloatingAdminPanel />}
        
        {/* Modal de login */}
        {showLogin && (
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-lg max-w-md w-full">
              <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                  <h2 class="text-lg font-semibold text-gray-900">🔐 Acceso Administrador</h2>
                  <button
                    onClick={() => setShowLogin(false)}
                    class="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
                <LoginForm onSuccess={handleLoginSuccess} />
              </div>
            </div>
          </div>
        )}
        
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