import { useState, useEffect } from 'preact/hooks';
import { isConnected, initializeFirebase, cleanupFirebase, debugDataIntegrity, removeDuplicateEvents, clearAllDraftEvents, fixIncompleteEvents, debugPublishState, copyEventInSameCell, debugOperationQueue, migrateAllEventsToNewFormat, cleanupLegacyEvents, resetToCurrentWeek, updateWeekTitle, getWeekTitle, getCurrentWeekTitle } from '../stores/schedule';
import { isAdmin, currentUser } from '../lib/auth';
import type { JSX } from 'preact';
import AdminToolbar from './AdminToolbar';
import UserToolbar from './UserToolbar';
import ScheduleGrid from './ScheduleGrid';
import { LoginForm } from './LoginForm';
import GlobalConfig from './GlobalConfig';
import InstructorManager from './InstructorManager';

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
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // Inicializar Firebase al montar el componente
    initializeFirebase().catch(err => {
      console.error('Error al inicializar Firebase:', err);
      setError('Error al conectar con el servidor. Por favor, recarga la página.');
    });

    // Exponer funciones de debugging globalmente
    (window as any).debugDataIntegrity = debugDataIntegrity;
    (window as any).removeDuplicateEvents = removeDuplicateEvents;
    (window as any).fixIncompleteEvents = fixIncompleteEvents;
    (window as any).clearAllDraftEvents = clearAllDraftEvents;
    (window as any).debugPublishState = debugPublishState;
    (window as any).copyEventInSameCell = copyEventInSameCell;
    (window as any).debugOperationQueue = debugOperationQueue;
    (window as any).migrateAllEventsToNewFormat = migrateAllEventsToNewFormat;
    (window as any).cleanupLegacyEvents = cleanupLegacyEvents;
    (window as any).resetToCurrentWeek = resetToCurrentWeek;
    (window as any).updateWeekTitle = updateWeekTitle;
    (window as any).getWeekTitle = getWeekTitle;
    (window as any).getCurrentWeekTitle = getCurrentWeekTitle;

    // Mostrar instrucciones de debugging en la consola
    console.log('%c=== HERRAMIENTAS DE DEBUGGING DISPONIBLES ===', 'color: #00ff00; font-weight: bold; font-size: 14px;');
    console.log('%cPara resolver problemas de integridad:', 'color: #00bfff; font-weight: bold;');
    console.log('%c1. debugDataIntegrity()   - Verificar la integridad de los datos', 'color: #ffff00;');
    console.log('%c2. removeDuplicateEvents() - Limpiar eventos duplicados', 'color: #ffff00;');
    console.log('%c3. fixIncompleteEvents()   - Corregir eventos incompletos', 'color: #ffff00;');
    console.log('%c4. debugPublishState()     - Ver estado de publicación y formato de eventos', 'color: #ffff00;');
    console.log('%c5. debugOperationQueue()   - Ver estado de la cola de operaciones', 'color: #ffff00;');
    console.log('%c6. copyEventInSameCell()   - Copiar evento (eventId, rowId, day)', 'color: #ffff00;');
    console.log('%c7. migrateAllEventsToNewFormat() - Migrar eventos al nuevo formato de fechas', 'color: #ffff00;');
    console.log('%c8. cleanupLegacyEvents()   - Limpiar eventos del formato anterior', 'color: #ffff00;');
    console.log('%c9. resetToCurrentWeek()    - Resetear a la semana actual (solo admin)', 'color: #ffff00;');
    console.log('%c10. clearAllDraftEvents()  - Borrar todos los eventos (⚠️ CUIDADO)', 'color: #ff6600;');
    console.log('%c11. updateWeekTitle()     - Actualizar el título de la semana (solo admin)', 'color: #ffff00;');
    console.log('%c12. getWeekTitle()        - Obtener el título de una semana por ID (solo admin)', 'color: #ffff00;');
    console.log('%c13. getCurrentWeekTitle() - Obtener el título de la semana actual', 'color: #ffff00;');
    console.log('%c', 'color: #ffffff;');
    console.log('%cPara usuarios externos (verificar datos published):', 'color: #00bfff; font-weight: bold;');
    console.log('%cdebugPublishState() // Ver si los datos están migrados correctamente', 'color: #ffff00;');
    console.log('%c', 'color: #ffffff;');
    console.log('%cEjemplo de uso:', 'color: #00bfff; font-weight: bold;');
    console.log('%cdebugDataIntegrity() // Verificar problemas', 'color: #ffff00;');
    console.log('%cmigrateAllEventsToNewFormat() // Migrar eventos manualmente', 'color: #ffff00;');
    console.log('%ccleanupLegacyEvents() // Limpiar formato anterior', 'color: #ffff00;');
    console.log('%c', 'color: #ffffff;');
    console.log('%c💡 NOTA: Los eventos ahora se publican automáticamente con migración', 'color: #00ff88; font-weight: bold;');

    // Ejecutar verificación automática
    setTimeout(() => {
      console.log('%c🔍 Ejecutando verificación automática...', 'color: #00bfff; font-weight: bold;');
      const result = debugDataIntegrity();
      if (!result.isValid) {
        const duplicates = result.problematicEvents.filter(p => p.issue === 'duplicate_id');
        const incompleteEvents = result.problematicEvents.filter(p => p.issue === 'incomplete_event');
        
        if (duplicates.length > 0) {
          console.log('%c⚠️ Se encontraron eventos duplicados. Limpiando automáticamente...', 'color: #ff6600; font-weight: bold;');
          const removed = removeDuplicateEvents();
          console.log(`%c✅ Se eliminaron ${removed} eventos duplicados automáticamente.`, 'color: #00ff00; font-weight: bold;');
        }
        
        if (incompleteEvents.length > 0) {
          console.log('%c⚠️ Se encontraron eventos incompletos. Corrigiendo automáticamente...', 'color: #ff6600; font-weight: bold;');
          const fixed = fixIncompleteEvents(incompleteEvents);
          console.log(`%c✅ Se corrigieron ${fixed} eventos incompletos automáticamente.`, 'color: #00ff00; font-weight: bold;');
        }
        
        if (duplicates.length === 0 && incompleteEvents.length === 0) {
          console.log('%c⚠️ Se encontraron otros problemas en los datos. Revisa los logs para más detalles.', 'color: #ff6600; font-weight: bold;');
        }
      } else {
        console.log('%c✅ Todos los datos están íntegros.', 'color: #00ff00; font-weight: bold;');
      }
    }, 2000);

    // Limpiar suscripciones al desmontar
    return () => {
      cleanupFirebase();
    };
  }, []);

  if (error) {
    return (
      <div class="min-h-screen bg-gray-100 p-4">
        <div class="max-w-7xl mx-auto">
          <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md">
            <p class="font-bold">Error</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected.value) {
    return (
      <div class="min-h-screen bg-gray-100 p-4">
        <div class="max-w-7xl mx-auto">
          <div class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-lg shadow-md">
            <p class="font-bold">Conectando...</p>
            <p>Estableciendo conexión con el servidor. Por favor, espera un momento.</p>
          </div>
        </div>
      </div>
    );
  }

  // Si el usuario está intentando acceder como admin pero no está autenticado
  if (showLogin && !currentUser.value) {
    return (
      <div class="min-h-screen bg-gray-100 p-4">
        <div class="max-w-7xl mx-auto">
          <LoginForm onCancel={() => setShowLogin(false)} />
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
              <div class="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  class="w-full sm:w-auto px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors"
                >
                  {showConfig ? 'Ocultar Configuración' : 'Configuración Global'}
                </button>
                <button
                  onClick={() => setShowInstructors(!showInstructors)}
                  class="w-full sm:w-auto px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
                >
                  {showInstructors ? 'Ocultar Instructores' : 'Gestionar Instructores'}
                </button>
              </div>
              {showConfig && <div class="mt-4"><GlobalConfig /></div>}
              {showInstructors && <div class="mt-4"><InstructorManager /></div>}
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
                Acceso Administrador
              </button>
            </div>
          </div>
        )}
        <ScheduleGrid isAdmin={isAdmin.value} />
      </div>
    </div>
  );
} 