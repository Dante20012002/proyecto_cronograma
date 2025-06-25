import { useState, useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { 
  hasUnpublishedChanges, 
  publishChanges, 
  clearAllDraftEvents, 
  saveDraftChanges,
  draftGlobalConfig
} from '../stores/schedule';
import { isAdmin, currentUser, logout } from '../lib/auth';
import GlobalConfig from './GlobalConfig';
import InstructorManager from './InstructorManager';
import { LoginForm } from './LoginForm';
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

  useEffect(() => {
    dirty.value = hasUnpublishedChanges.value;
  }, [hasUnpublishedChanges.value]);

  const handlePublish = () => {
    if (confirm('¿Estás seguro de que quieres publicar todos los cambios? Esta acción no se puede deshacer.')) {
      publishChanges();
      alert('¡Cronograma publicado exitosamente!');
    }
  };

  const handleSaveDraft = () => {
    saveDraftChanges();
    alert('Borrador guardado. Ahora puedes publicar los cambios cuando quieras.');
  };

  const handleClearEvents = () => {
    if (confirm('¿Estás seguro de que quieres eliminar TODAS las actividades del borrador? Los instructores no se verán afectados. Esta acción no se puede deshacer.')) {
      clearAllDraftEvents();
      alert('Todas las actividades del borrador han sido eliminadas. Guarda el borrador para persistir esta eliminación y luego publica los cambios.');
    }
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
    <div class="bg-white rounded-lg shadow-md p-3 sm:p-4">
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
            disabled={!dirty.value}
            class={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
              dirty.value
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Guardar
          </button>
          <button
            onClick={handlePublish}
            disabled={!dirty.value}
            class={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
              dirty.value
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Publicar
          </button>
          <button
            onClick={handleClearEvents}
            class="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Limpiar
          </button>
          <button
            onClick={handleLogout}
            class="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
} 