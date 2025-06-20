import { useStore } from '@nanostores/preact';
import { hasUnpublishedChanges, publishChanges, clearAllDraftEvents, saveDraftChanges } from '../stores/schedule';

export default function AdminToolbar() {
  const dirty = useStore(hasUnpublishedChanges);

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

  return (
    <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg shadow-md mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h3 class="font-bold">Modo Administrador</h3>
          <p class="text-sm">
            {dirty
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
            disabled={!dirty}
            class={`px-6 py-2 text-white font-semibold rounded-md transition-colors ${
              !dirty
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 animate-pulse'
            }`}
            title={!dirty ? 'No hay cambios para publicar' : 'Publicar todos los cambios'}
          >
            Publicar Cambios
          </button>
        </div>
      </div>
    </div>
  );
} 