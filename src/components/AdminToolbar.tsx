import { useState, useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { 
  hasUnpublishedChanges, 
  publishChanges, 
  clearAllDraftEvents, 
  saveDraftChanges,
  draftGlobalConfig,
  removeDuplicateEvents,
  debugDataIntegrity,
  isSaving,
  isPublishing,
  isProcessing,
  canPublish,
  navigateWeek,
  getPublishShrinkCheck
} from '../stores/schedule';
import { isAdmin, currentUser, logout } from '../lib/auth';
import { safeConfirm } from '../lib/utils';
import GlobalConfig from './GlobalConfig';
import InstructorManager from './InstructorManager';
import ViewModeToggle from './ViewModeToggle';
import { LoginForm } from './LoginForm';
import ExcelUploader from './ExcelUploader';
import FilterBar from './FilterBar';
import type { JSX } from 'preact';

/**
 * Props para el componente AdminToolbar
 * @interface AdminToolbarProps
 */
interface AdminToolbarProps {
  /** Función para cerrar la barra de herramientas */
  onClose?: () => void;
}

/**
 * Barra de herramientas para administradores.
 * Proporciona acceso a funciones administrativas como publicación,
 * configuración global y gestión de instructores.
 * 
 * @component
 * @param {AdminToolbarProps} props - Props del componente
 * @returns {JSX.Element} Componente AdminToolbar
 * 
 * @example
 * ```tsx
 * <AdminToolbar onClose={() => setShowToolbar(false)} />
 * ```
 */
export default function AdminToolbar({ onClose }: AdminToolbarProps): JSX.Element {
  const dirty = useSignal(hasUnpublishedChanges.value);
  const isAdminUser = useSignal(isAdmin.value);
  const user = useSignal(currentUser.value);
  const saving = useSignal(isSaving.value);
  const publishing = useSignal(isPublishing.value);
  const processing = useSignal(isProcessing.value);
  const allowPublish = useSignal(canPublish.value);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'info'>('info');
  const [showExcelUploader, setShowExcelUploader] = useState(false);

  useEffect(() => {
    dirty.value = hasUnpublishedChanges.value;
    saving.value = isSaving.value;
    publishing.value = isPublishing.value;
    processing.value = isProcessing.value;
    allowPublish.value = canPublish.value;
  }, [hasUnpublishedChanges.value, isSaving.value, isPublishing.value, isProcessing.value, canPublish.value]);

  const handlePublish = async () => {
    if (!allowPublish.value) {
      setNotificationMessage('⚠️ Debes guardar primero y esperar 2 segundos antes de publicar.');
      setNotificationType('info');
      setTimeout(() => setNotificationMessage(null), 3000);
      return;
    }

    if (processing.value) {
      setNotificationMessage('⚠️ Ya hay una operación en curso. Por favor espera.');
      setNotificationType('info');
      setTimeout(() => setNotificationMessage(null), 3000);
      return;
    }

    // Bloquear si el borrador perdió la mayoría de los eventos publicados
    const shrinkCheck = getPublishShrinkCheck();
    if (shrinkCheck.isSuspicious && !safeConfirm(
      `🚨 PUBLICACIÓN BLOQUEADA\n\n` +
      `El borrador tiene ${shrinkCheck.draftEvents} eventos, pero lo publicado tiene ${shrinkCheck.publishedEvents}.\n` +
      `Publicar reemplazaría el cronograma público y se perderían esos eventos.\n\n` +
      `Si el borrador parece incorrecto, cancela y restaura el borrador desde lo publicado.\n\n` +
      `¿Publicar de todas formas?`
    )) {
      setNotificationMessage(`🚨 Publicación bloqueada: el borrador tiene ${shrinkCheck.draftEvents} de ${shrinkCheck.publishedEvents} eventos publicados.`);
      setNotificationType('error');
      setTimeout(() => setNotificationMessage(null), 6000);
      return;
    }

    if (safeConfirm('¿Estás seguro de que quieres publicar todos los cambios? Esta acción no se puede deshacer.')) {
      try {
        setNotificationMessage('📦 Publicando cambios...');
        setNotificationType('info');

        const success = await publishChanges(shrinkCheck.isSuspicious);
        
        if (success) {
          setNotificationMessage('✅ ¡Cronograma publicado exitosamente!');
          setNotificationType('success');
        } else {
          setNotificationMessage('❌ Error al publicar. Revisa la consola para más detalles.');
          setNotificationType('error');
        }
      } catch (error) {
        console.error('Error en handlePublish:', error);
        setNotificationMessage('❌ Error inesperado al publicar.');
        setNotificationType('error');
      }
      
      setTimeout(() => setNotificationMessage(null), 3000);
    }
  };

  const handleSave = async () => {
    if (processing.value) {
      setNotificationMessage('⚠️ Ya hay una operación en curso. Por favor espera.');
      setNotificationType('info');
      setTimeout(() => setNotificationMessage(null), 3000);
      return;
    }

    try {
      setNotificationMessage('💾 Guardando borrador...');
      setNotificationType('info');

      const success = await saveDraftChanges();
      
      if (success) {
        setNotificationMessage('✅ ¡Borrador guardado exitosamente!');
        setNotificationType('success');
      } else {
        setNotificationMessage('❌ Error al guardar. Revisa la consola para más detalles.');
        setNotificationType('error');
      }
    } catch (error) {
      console.error('Error en handleSave:', error);
      setNotificationMessage('❌ Error inesperado al guardar.');
      setNotificationType('error');
    }
    
    setTimeout(() => setNotificationMessage(null), 3000);
  };

  const handleClearAll = async () => {
    if (safeConfirm('¿Estás seguro de que quieres eliminar todas las actividades de la semana actual? Los instructores y eventos de otras semanas no se verán afectados. Esta acción no se puede deshacer.')) {
      try {
        setNotificationMessage('🗑️ Eliminando eventos de la semana actual...');
        setNotificationType('info');

        await clearAllDraftEvents(true); // true indica que solo limpie la semana actual
        
        setNotificationMessage('✅ ¡Los eventos de la semana actual han sido eliminados!');
        setNotificationType('success');
      } catch (error) {
        console.error('Error eliminando eventos:', error);
        setNotificationMessage('❌ Error al eliminar eventos.');
        setNotificationType('error');
      }
      
      setTimeout(() => setNotificationMessage(null), 3000);
    }
  };

  const handleRemoveDuplicates = async () => {
    if (safeConfirm(`Se encontraron eventos duplicados. ¿Quieres eliminar automáticamente los duplicados?`)) {
      try {
        setNotificationMessage('🔄 Eliminando eventos duplicados...');
        setNotificationType('info');

        const result = await removeDuplicateEvents();
        
        setNotificationMessage(`✅ Duplicados eliminados exitosamente: ${result}`);
        setNotificationType('success');
      } catch (error) {
        console.error('Error eliminando duplicados:', error);
        setNotificationMessage('❌ Error al eliminar duplicados.');
        setNotificationType('error');
      }
      
      setTimeout(() => setNotificationMessage(null), 3000);
    }
  };

  const handleDataIntegrity = async () => {
    try {
      setNotificationMessage('🔍 Verificando integridad de datos...');
      setNotificationType('info');

      await debugDataIntegrity();
      
      setNotificationMessage('✅ Verificación completada. Revisa la consola para detalles.');
      setNotificationType('success');
    } catch (error) {
      console.error('Error en verificación:', error);
      setNotificationMessage('❌ Error en verificación de integridad.');
      setNotificationType('error');
    }
    
    setTimeout(() => setNotificationMessage(null), 3000);
  };

  const handleLogout = async () => {
    if (safeConfirm('¿Estás seguro de que quieres cerrar sesión?')) {
      try {
        await logout();
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        setNotificationMessage('❌ Error al cerrar sesión');
        setNotificationType('error');
        setTimeout(() => setNotificationMessage(null), 3000);
      }
    }
  };

  if (!user.value || !isAdminUser.value) {
    return <LoginForm />;
  }

  return (
    <div class="bg-white rounded-lg shadow-md p-3 sm:p-4">
      {/* Header con información del usuario */}
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
        <div class="text-gray-700">
          <h3 class="font-semibold text-sm">🛠️ Panel de Administración</h3>
          <p class="text-xs">
            👤 {user.value?.email} | 
            📊 {dirty.value ? 'Cambios sin publicar' : 'Todo publicado'}
          </p>
        </div>
        <div class="flex items-center space-x-4">
          <ViewModeToggle isAdmin={true} />
          <button
            onClick={handleLogout}
            class="text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Notificaciones */}
      {notificationMessage && (
        <div class={`mb-4 p-3 rounded-md text-sm ${
          notificationType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          notificationType === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {notificationMessage}
        </div>
      )}

      {/* Controles de filtros */}
      <div class="mb-4">
        <FilterBar isAdmin={true} />
      </div>

      {/* Botones principales */}
      <div class="space-y-3">
        {/* Primera fila: Guardar y Publicar */}
        <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <button
            onClick={handleSave}
            disabled={processing.value}
            class="flex-1 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {saving.value ? '⏳ Guardando...' : '💾 Guardar Borrador'}
          </button>
          
          <button
            onClick={handlePublish}
            disabled={!allowPublish.value || processing.value}
            class="flex-1 px-4 py-3 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {publishing.value ? '⏳ Publicando...' : '📦 Publicar'}
          </button>
        </div>

        {/* Segunda fila: Herramientas - Grid responsive */}
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setShowExcelUploader(true)}
            disabled={processing.value}
            class="px-3 py-3 sm:py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            📊 Excel
          </button>
          
          <button
            onClick={handleDataIntegrity}
            disabled={processing.value}
            class="px-3 py-3 sm:py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            🔍 Verificar
          </button>
          
          <button
            onClick={handleRemoveDuplicates}
            disabled={processing.value}
            class="px-3 py-3 sm:py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            🔄 Duplicados
          </button>
          
          <button
            onClick={handleClearAll}
            disabled={processing.value}
            class="px-3 py-3 sm:py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            🗑️ Limpiar
          </button>
        </div>
      </div>

      {/* Modal del Excel Uploader */}
      {showExcelUploader && (
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ExcelUploader onClose={() => setShowExcelUploader(false)} />
          </div>
        </div>
      )}
    </div>
  );
} 