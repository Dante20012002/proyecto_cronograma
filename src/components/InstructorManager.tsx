import { useState } from 'preact/hooks';
import { draftInstructors, draftScheduleRows, addInstructor, updateInstructor, deleteInstructor } from '../stores/schedule';
import { safeConfirm } from '../lib/utils';
import type { JSX } from 'preact';
import type { Instructor, ScheduleEvent } from '../types/schedule';

/**
 * Componente para gestionar instructores.
 * Permite agregar, editar y eliminar instructores.
 * 
 * @component
 * @returns {JSX.Element} Componente InstructorManager
 * 
 * @example
 * ```tsx
 * <InstructorManager />
 * ```
 */
export default function InstructorManager(): JSX.Element {
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    regional: ''
  });

  const currentInstructors = draftInstructors.value;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSubmit = async (e: Event) => {
    e.preventDefault();
    if (!formData.name || !formData.city || !formData.regional) {
      alert('Por favor completa todos los campos.');
      return;
    }

    await addInstructor(formData.name, formData.city, formData.regional);
    setFormData({ name: '', city: '', regional: '' });
    setShowAddForm(false);
  };

  const handleEditSubmit = async (e: Event) => {
    e.preventDefault();
    if (!editingInstructor || !formData.name || !formData.city || !formData.regional) {
      alert('Por favor completa todos los campos.');
      return;
    }

    await updateInstructor(editingInstructor.id, formData.name, formData.city, formData.regional);
    setEditingInstructor(null);
    setFormData({ name: '', city: '', regional: '' });
  };

  const handleDelete = async (instructor: Instructor) => {
    // Obtener información detallada antes de eliminar
    const instructorRow = draftScheduleRows.value.find(r => r.id === instructor.id);
    
    if (!instructorRow) {
      alert('Error: No se encontró la información del instructor.');
      return;
    }
    
         // Contar eventos históricos
     const totalEvents = Object.values(instructorRow.events).reduce((total: number, dayEvents: ScheduleEvent[]) => {
       return total + dayEvents.length;
     }, 0);
     
     const eventDays = Object.keys(instructorRow.events).filter((day: string) => 
       instructorRow.events[day].length > 0
     ).length;
    
    // Crear mensaje de advertencia detallado
    let warningMessage = `⚠️ ADVERTENCIA: Vas a eliminar permanentemente a:\n\n`;
    warningMessage += `👤 Instructor: ${instructor.name}\n`;
    warningMessage += `📍 Ubicación: ${instructor.city} - ${instructor.regional}\n\n`;
    
    if (totalEvents > 0) {
      warningMessage += `📊 DATOS HISTÓRICOS QUE SE ELIMINARÁN:\n`;
      warningMessage += `• ${totalEvents} eventos históricos\n`;
      warningMessage += `• Datos de ${eventDays} días diferentes\n\n`;
      
             // Mostrar algunos detalles de eventos
       const eventSamples: string[] = [];
       for (const [day, events] of Object.entries(instructorRow.events)) {
         if ((events as ScheduleEvent[]).length > 0 && eventSamples.length < 3) {
           eventSamples.push(`${day}: ${(events as ScheduleEvent[]).length} evento(s)`);
         }
       }
      
      if (eventSamples.length > 0) {
        warningMessage += `📅 Ejemplos de días con eventos:\n`;
        eventSamples.forEach(sample => {
          warningMessage += `• ${sample}\n`;
        });
        if (eventDays > eventSamples.length) {
          warningMessage += `• ... y ${eventDays - eventSamples.length} días más\n`;
        }
        warningMessage += `\n`;
      }
      
      warningMessage += `❗ ESTA ACCIÓN NO SE PUEDE DESHACER ❗\n\n`;
      warningMessage += `¿Estás COMPLETAMENTE SEGURO de que quieres eliminar a ${instructor.name} y todos sus datos históricos?`;
    } else {
      warningMessage += `ℹ️ Este instructor no tiene eventos históricos.\n\n`;
      warningMessage += `¿Estás seguro de que quieres eliminar a ${instructor.name}?`;
    }
    
    if (safeConfirm(warningMessage)) {
      await deleteInstructor(instructor.id);
    }
  };

  const handleEdit = (instructor: Instructor) => {
    setEditingInstructor(instructor);
    setFormData({
      name: instructor.name,
      city: instructor.city,
      regional: instructor.regional
    });
  };

  return (
    <div class="space-y-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-gray-900">Gestión de Instructores</h2>
        <button
          onClick={() => setShowAddForm(true)}
          class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Agregar Instructor
        </button>
      </div>

      {/* Lista de instructores */}
      <div class="space-y-4">
        {currentInstructors.map(instructor => (
          <div
            key={instructor.id}
            class="flex items-center justify-between bg-gray-50 p-4 rounded-lg"
          >
            <div>
              <h3 class="font-semibold text-gray-900">{instructor.name}</h3>
              <p class="text-sm text-gray-600">
                {instructor.city} - {instructor.regional}
              </p>
            </div>
            <div class="flex space-x-2">
              <button
                onClick={() => handleEdit(instructor)}
                class="text-blue-600 hover:text-blue-800"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(instructor)}
                class="text-red-600 hover:text-red-800"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de agregar/editar */}
      {(showAddForm || editingInstructor) && (
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 class="text-lg font-semibold mb-4">
              {editingInstructor ? 'Editar Instructor' : 'Agregar Nuevo Instructor'}
            </h3>
            <form onSubmit={editingInstructor ? handleEditSubmit : handleAddSubmit}>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700">Nombre</label>
                  <input
                    type="text"
                    value={formData.name}
                    onInput={(e) => handleInputChange('name', (e.target as HTMLInputElement).value)}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">Ciudad</label>
                  <input
                    type="text"
                    value={formData.city}
                    onInput={(e) => handleInputChange('city', (e.target as HTMLInputElement).value)}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">Regional</label>
                  <input
                    type="text"
                    value={formData.regional}
                    onInput={(e) => handleInputChange('regional', (e.target as HTMLInputElement).value)}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div class="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingInstructor(null);
                    setFormData({ name: '', city: '', regional: '' });
                  }}
                  class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingInstructor ? 'Guardar Cambios' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 