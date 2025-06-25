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
    <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg shadow-md mb-6">
      <div class="flex justify-between items-center">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-bold">Modo Administrador</h3>
            <span class="text-sm">({user.value.email})</span>
            <button
              onClick={handleLogout}
              class="text-sm text-red-600 hover:text-red-800"
            >
              Cerrar sesión
            </button>
          </div>
          <p class="text-sm">
            {dirty.value
              ? 'Tienes cambios guardados sin publicar. Los usuarios no verán tus modificaciones hasta que las publiques.'
              : 'Realiza cambios y guárdalos. El cronograma público no se actualizará hasta que publiques.'}
          </p>
        </div>
        <div class="flex items-center space-x-2">
          <button
            onClick={handleClearEvents}
            class="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors"
            title="Eliminar todas las actividades del borrador actual. Los instructores no se verán afectados."
          >
            Limpiar Actividades
          </button>
          <button
            onClick={handleSaveDraft}
            class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
            title="Guarda todos los cambios actuales en un borrador persistente."
          >
            Guardar Borrador
          </button>
          <button
            onClick={handlePublish}
            disabled={!dirty.value}
            class={`px-6 py-2 text-white font-semibold rounded-md transition-colors ${
              !dirty.value
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 animate-pulse'
            }`}
            title={!dirty.value ? 'No hay cambios para publicar' : 'Publicar todos los cambios'}
          >
            Publicar Cambios
          </button>
        </div>
      </div>
    </div>
  );
} 