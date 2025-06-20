import { useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { draftInstructors, addInstructor, updateInstructor, deleteInstructor, regionalOptions } from '../stores/schedule';

interface InstructorFormData {
  name: string;
  city: string;
  regional: string;
}

export default function InstructorManager() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<any>(null);
  const [formData, setFormData] = useState<InstructorFormData>({ name: '', city: '', regional: '' });
  const [isEditing, setIsEditing] = useState(false);
  
  const currentInstructors = useStore(draftInstructors);

  const handleOpenModal = (instructor?: any) => {
    if (instructor) {
      setFormData({ name: instructor.name, city: instructor.city, regional: instructor.regional });
      setEditingInstructor(instructor);
      setIsEditing(true);
    } else {
      setFormData({ name: '', city: '', regional: '' });
      setEditingInstructor(null);
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ name: '', city: '', regional: '' });
    setEditingInstructor(null);
    setIsEditing(false);
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.city.trim() || !formData.regional.trim()) {
      alert('Por favor completa todos los campos');
      return;
    }

    if (isEditing && editingInstructor) {
      updateInstructor(editingInstructor.id, formData.name, formData.city, formData.regional);
    } else {
      addInstructor(formData.name, formData.city, formData.regional);
    }

    handleCloseModal();
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que quieres eliminar al instructor "${name}"? Esta acción se guardará en el borrador.`)) {
      deleteInstructor(id);
    }
  };

  return (
    <>
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gray-900">Gestión de Instructores</h2>
          <button
            onClick={() => handleOpenModal()}
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + Agregar Instructor
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Instructor
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ciudad
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Regional
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {currentInstructors.map((instructor) => (
                <tr key={instructor.id} class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {instructor.name}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {instructor.city}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {instructor.regional}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenModal(instructor)}
                      class="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(instructor.id, instructor.name)}
                      class="text-red-600 hover:text-red-900"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para agregar/editar instructor */}
      {isModalOpen && (
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div class="p-6">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-900">
                  {isEditing ? 'Editar Instructor' : 'Agregar Instructor'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  class="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ×
                </button>
              </div>

              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onInput={(e) => setFormData({ ...formData, name: (e.target as HTMLInputElement).value })}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nombre del instructor"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onInput={(e) => setFormData({ ...formData, city: (e.target as HTMLInputElement).value })}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ciudad del instructor"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Regional *
                  </label>
                  <select
                    value={formData.regional}
                    onInput={(e) => setFormData({ ...formData, regional: (e.target as HTMLSelectElement).value })}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar regional</option>
                    {regionalOptions.map((regional) => (
                      <option key={regional} value={regional}>
                        {regional}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div class="flex justify-end space-x-2 mt-6">
                <button
                  onClick={handleCloseModal}
                  class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!formData.name.trim() || !formData.city.trim() || !formData.regional.trim()}
                  class={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 ${
                    !formData.name.trim() || !formData.city.trim() || !formData.regional.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                  }`}
                >
                  {isEditing ? 'Actualizar' : 'Agregar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 