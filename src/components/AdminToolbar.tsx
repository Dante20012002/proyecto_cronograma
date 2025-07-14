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
  canPublish
} from '../stores/schedule';
import { isAdmin, currentUser, logout } from '../lib/auth';
import GlobalConfig from './GlobalConfig';
import InstructorManager from './InstructorManager';
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

    if (confirm('¿Estás seguro de que quieres publicar todos los cambios? Esta acción no se puede deshacer.')) {
      try {
        setNotificationMessage('📦 Publicando cambios...');
        setNotificationType('info');
        
        const success = await publishChanges();
        
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
      
      setTimeout(() => setNotificationMessage(null), 5000);
    }
  };

  const handleSaveDraft = async () => {
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
        setNotificationMessage('✅ Borrador guardado. Ahora puedes publicar los cambios cuando quieras.');
        setNotificationType('success');
      } else {
        setNotificationMessage('❌ Error al guardar. Revisa la consola para más detalles.');
        setNotificationType('error');
      }
    } catch (error) {
      console.error('Error en handleSaveDraft:', error);
      setNotificationMessage('❌ Error inesperado al guardar.');
      setNotificationType('error');
    }
    
    setTimeout(() => setNotificationMessage(null), 5000);
  };

  const handleClearEvents = () => {
    if (confirm('¿Estás seguro de que quieres eliminar TODAS las actividades del borrador? Los instructores no se verán afectados. Esta acción no se puede deshacer.')) {
      clearAllDraftEvents();
      alert('Todas las actividades del borrador han sido eliminadas. Guarda el borrador para persistir esta eliminación y luego publica los cambios.');
    }
  };

  const handleFixDuplicates = () => {
    console.log('🔍 Verificando integridad de datos...');
    const result = debugDataIntegrity();
    
    if (!result.isValid && result.problematicEvents.length > 0) {
      const duplicateEvents = result.problematicEvents.filter(p => p.issue === 'duplicate_id');
      if (duplicateEvents.length > 0) {
        if (confirm(`Se encontraron ${duplicateEvents.length} eventos duplicados. ¿Quieres eliminar automáticamente los duplicados?`)) {
          const removed = removeDuplicateEvents();
          if (removed > 0) {
            setNotificationMessage(`✅ Se eliminaron ${removed} eventos duplicados. Los cambios se guardarán automáticamente.`);
            setNotificationType('success');
          } else {
            setNotificationMessage('ℹ️ No se encontraron eventos duplicados para eliminar.');
            setNotificationType('info');
          }
        }
      } else {
        setNotificationMessage('ℹ️ Se encontraron otros problemas de integridad, pero no eventos duplicados. Revisa la consola para más detalles.');
        setNotificationType('info');
      }
    } else {
      setNotificationMessage('✅ No se encontraron problemas de integridad en los datos.');
      setNotificationType('success');
    }
    
    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setNotificationMessage(null);
    }, 5000);
  };

  const handleLogout = async () => {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      await logout();
      if (onClose) onClose();
    }
  };

  if (!user.value || !isAdminUser.value) {
    return <LoginForm />;
  }

  return (
    <div class="space-y-4">
      <div class="bg-white rounded-lg shadow-md p-3 sm:p-4 relative">
        {/* Notificación flotante */}
        {notificationMessage && (
          <div class={`absolute top-2 right-2 z-50 px-4 py-2 rounded-lg shadow-lg text-sm max-w-xs ${
            notificationType === 'success' ? 'bg-green-500 text-white' :
            notificationType === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            {notificationMessage}
          </div>
        )}
        
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <div class="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <h2 class="text-lg font-bold text-gray-900">Panel de Administración</h2>
          <div class="text-sm text-gray-600">
            {user.value?.email}
          </div>
        </div>
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <button
            onClick={handleSaveDraft}
            disabled={!dirty.value || processing.value}
            class={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
              dirty.value && !processing.value
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving.value ? '💾 Guardando...' : 'Guardar'}
          </button>
          <button
            onClick={handlePublish}
            disabled={!allowPublish.value || processing.value}
            class={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
              allowPublish.value && !processing.value
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={!allowPublish.value ? 'Guarda primero y espera 2 segundos' : 'Publicar cambios'}
          >
            {publishing.value ? '📦 Publicando...' : 'Publicar'}
          </button>
          <button
            onClick={() => setShowExcelUploader(true)}
            disabled={processing.value}
            class={`flex-1 sm:flex-none flex items-center justify-center px-3 py-2 rounded-md transition-colors text-sm ${
              processing.value
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
            title="Cargar eventos desde Excel"
          >
            📊 Excel
          </button>
          <button
            onClick={handleFixDuplicates}
            disabled={processing.value}
            class={`flex-1 sm:flex-none flex items-center justify-center px-3 py-2 rounded-md transition-colors text-sm ${
              processing.value
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-yellow-600 text-white hover:bg-yellow-700'
            }`}
            title="Reparar eventos duplicados"
          >
            🔧 Reparar
          </button>
          <button
            onClick={handleClearEvents}
            disabled={processing.value}
            class={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
              processing.value
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            Limpiar
          </button>
          <button
            onClick={handleLogout}
            disabled={processing.value}
            class={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
              processing.value
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
        
        {/* Modal de carga masiva de Excel */}
        {showExcelUploader && (
          <ExcelUploader onClose={() => setShowExcelUploader(false)} />
        )}
      </div>
      
      {/* Filtros */}
      <FilterBar isAdmin={true} />
    </div>
  );
} 