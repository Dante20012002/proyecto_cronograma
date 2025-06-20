import { useState } from 'preact/hooks';
import { addEvent, startTimes, endTimes } from '../stores/schedule';
import type { Event } from '../stores/schedule';

interface AddEventCardProps {
  rowId: string;
  day: string;
  onClose: () => void;
}

export default function AddEventCard({ rowId, day, onClose }: AddEventCardProps) {
  const [formData, setFormData] = useState({
    title: '',
    details: '',
    startTime: '',
    endTime: '',
    location: '',
    color: 'bg-blue-600'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      alert('Por favor ingresa un título para el evento.');
      return;
    }

    // Construir el string de tiempo combinado
    let timeString = '';
    if (formData.startTime && formData.endTime) {
      timeString = `${formData.startTime} a ${formData.endTime}`;
    } else if (formData.startTime) {
      timeString = formData.startTime;
    } else if (formData.endTime) {
      timeString = formData.endTime;
    }

    const newEvent: Event = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: formData.title,
      details: formData.details.includes('\n') ? formData.details.split('\n') : formData.details,
      time: timeString || undefined,
      location: formData.location || 'Sin ubicación',
      color: formData.color
    };
    
    addEvent(rowId, day, newEvent);
    onClose();
  };

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white text-gray-900 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Agregar Nuevo Evento</h3>
            <button onClick={onClose} class="text-gray-400 hover:text-gray-600 text-xl font-bold">
              ×
            </button>
          </div>

          <div class="space-y-4">
            {/* Title */}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input
                type="text"
                value={formData.title}
                onInput={(e) => handleInputChange('title', (e.target as HTMLInputElement).value)}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Título del evento"
              />
            </div>

            {/* Details */}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Detalles</label>
              <textarea
                value={formData.details}
                onInput={(e) => handleInputChange('details', (e.target as HTMLTextAreaElement).value)}
                rows={3}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Detalles del evento (una línea por detalle)"
              />
            </div>

            {/* Time Selectors */}
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Hora de Inicio</label>
                <select
                  value={formData.startTime}
                  onInput={(e) => handleInputChange('startTime', (e.target as HTMLSelectElement).value)}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  {startTimes.map((time) => (
                    <option key={time.value} value={time.value} class="text-gray-900 bg-white">
                      {time.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Hora de Fin</label>
                <select
                  value={formData.endTime}
                  onInput={(e) => handleInputChange('endTime', (e.target as HTMLSelectElement).value)}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  {endTimes.map((time) => (
                    <option key={time.value} value={time.value} class="text-gray-900 bg-white">
                      {time.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location */}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
              <input
                type="text"
                value={formData.location}
                onInput={(e) => handleInputChange('location', (e.target as HTMLInputElement).value)}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Ubicación del evento"
              />
            </div>

            {/* Color Picker */}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <div class="grid grid-cols-6 gap-2">
                {['bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-yellow-500', 'bg-purple-600', 'bg-pink-600', 'bg-indigo-600', 'bg-gray-600', 'bg-rose-500', 'bg-orange-500', 'bg-teal-500', 'bg-cyan-500'].map((color) => (
                  <button
                    key={color}
                    onClick={() => handleInputChange('color', color)}
                    class={`w-8 h-8 rounded-full border-2 ${formData.color === color ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-800' : 'border-gray-300'} ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div class="flex justify-end space-x-2 mt-6">
            <button onClick={onClose} class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.title.trim()}
              class={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 ${
                !formData.title.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              Agregar Evento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 