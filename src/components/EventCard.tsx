import { useState, useEffect } from 'preact/hooks';
import { updateEvent, deleteEvent, checkTimeConflict, startTimes, endTimes } from '../stores/schedule';
import type { Event } from '../stores/schedule';

interface EventCardProps {
  event: Event;
  rowId: string;
  day: string;
  onClose: () => void;
}

export default function EventCard({ event, rowId, day, onClose }: EventCardProps) {
  const [formData, setFormData] = useState({
    title: event.title,
    details: Array.isArray(event.details) ? event.details.join('\n') : event.details,
    startTime: '',
    endTime: '',
    location: event.location,
    color: event.color
  });

  const [hasConflict, setHasConflict] = useState(false);
  const [conflictingEvent, setConflictingEvent] = useState<Event | undefined>(undefined);

  // Parsear el tiempo existente al cargar
  useEffect(() => {
    if (event.time) {
      const timeParts = event.time.split(' a ');
      if (timeParts.length === 2) {
        setFormData(prev => ({ ...prev, startTime: timeParts[0], endTime: timeParts[1] }));
      } else {
        setFormData(prev => ({ ...prev, startTime: event.time || '' }));
      }
    }
  }, [event.time]);

  useEffect(() => {
    // Construir el string de tiempo combinado para la validación
    let timeString = '';
    if (formData.startTime && formData.endTime) {
      timeString = `${formData.startTime} a ${formData.endTime}`;
    } else if (formData.startTime) {
      timeString = formData.startTime;
    } else if (formData.endTime) {
      timeString = formData.endTime;
    }

    const conflict = checkTimeConflict(event.id, rowId, day, timeString);
    setHasConflict(conflict.hasConflict);
    setConflictingEvent(conflict.conflictingEvent);
  }, [formData.startTime, formData.endTime, event.id, rowId, day]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (hasConflict) {
      alert('No se puede guardar: hay un conflicto de horarios.');
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

    const updatedEventData: Event = {
      ...event,
      title: formData.title,
      details: formData.details.includes('\n') ? formData.details.split('\n') : formData.details,
      time: timeString || undefined,
      location: formData.location,
      color: formData.color
    };
    
    updateEvent(rowId, day, updatedEventData);
    onClose();
  };

  const handleDelete = () => {
    if (confirm('¿Estás seguro de que quieres eliminar este evento del borrador?')) {
      deleteEvent(event.id, rowId, day);
      onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleDelete();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white text-gray-900 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Editar Evento</h3>
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
              />
            </div>

            {/* Time Selectors */}
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Hora de Inicio</label>
                <select
                  value={formData.startTime}
                  onInput={(e) => handleInputChange('startTime', (e.target as HTMLSelectElement).value)}
                  class={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white ${
                    hasConflict ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
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
                  class={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white ${
                    hasConflict ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  {endTimes.map((time) => (
                    <option key={time.value} value={time.value} class="text-gray-900 bg-white">
                      {time.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {hasConflict && (
              <div class="text-sm text-red-600">
                ⚠️ Conflicto de horarios con: {conflictingEvent?.title}
              </div>
            )}

            {/* Location */}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
              <input
                type="text"
                value={formData.location}
                onInput={(e) => handleInputChange('location', (e.target as HTMLInputElement).value)}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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

          <div class="flex justify-between mt-6">
            <button onClick={handleDelete} class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
              Eliminar
            </button>
            <div class="space-x-2">
              <button onClick={onClose} class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={hasConflict || !formData.title.trim()}
                class={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 ${
                  hasConflict || !formData.title.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                }`}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 