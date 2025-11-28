import { useState } from 'preact/hooks';
import { addEvent, startTimes, endTimes, checkTimeConflict } from '../stores/schedule';
import { isAdmin } from '../lib/auth';
import type { Event } from '../stores/schedule';
import { EVENT_COLORS, getColorForDetail, getRandomEventColor, hexToStyle, getContrastTextColor } from '../lib/colors';
import { PREDEFINED_DETAILS, PREDEFINED_TITLES, PREDEFINED_MODALITIES } from '../lib/predefined-data';



/**
 * Props para el componente AddEventCard
 * @interface AddEventCardProps
 */
interface AddEventCardProps {
  /** ID del instructor/fila donde se agregará el evento */
  rowId: string;
  /** Día del mes donde se agregará el evento */
  day: string;
  /** Función para cerrar el modal */
  onClose: () => void;
}

/**
 * Componente modal para agregar nuevos eventos al cronograma.
 * 
 * @component
 * @param {AddEventCardProps} props - Props del componente
 * @returns {JSX.Element} Componente AddEventCard
 * 
 * @example
 * ```tsx
 * <AddEventCard
 *   rowId="instructor-1"
 *   day="25"
 *   onClose={() => setShowModal(false)}
 * />
 * ```
 */
export default function AddEventCard({ rowId, day, onClose }: AddEventCardProps) {
  const [formData, setFormData] = useState({
    title: '',
    details: '',
    startTime: '',
    endTime: '',
    location: '',
    color: EVENT_COLORS[0], // Usar el primer color de la nueva paleta
    modalidad: '',
    confirmed: false
  });
  const [useCustomTitle, setUseCustomTitle] = useState(false);
  const [useCustomDetails, setUseCustomDetails] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTitleSelect = (title: string) => {
    if (title === 'custom') {
      setUseCustomTitle(true);
      setFormData(prev => ({ ...prev, title: '' }));
    } else {
      setUseCustomTitle(false);
      setFormData(prev => ({ ...prev, title }));
    }
  };

  const handleDetailsSelect = (details: string) => {
    if (details === 'custom') {
      setUseCustomDetails(true);
      setFormData(prev => ({ ...prev, details: '' }));
    } else {
      setUseCustomDetails(false);
      // Asignar color automáticamente basado en el detalle seleccionado
      const autoColor = getColorForDetail(details);
      setFormData(prev => ({ 
        ...prev, 
        details,
        color: autoColor || prev.color // Mantener color actual si no hay mapeo
      }));
    }
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      alert('El título del programa es obligatorio. Puedes seleccionar uno de la lista o escribir uno personalizado.');
      return;
    }

    // Validar conflictos de horario
    if (formData.startTime && formData.endTime) {
      const { hasConflict, conflictingEvent } = checkTimeConflict(
        rowId,
        day,
        formData.startTime,
        formData.endTime
      );

      if (hasConflict && conflictingEvent) {
        const conflictMessage = conflictingEvent.time 
          ? `"${conflictingEvent.title}" programado de ${conflictingEvent.time}`
          : `"${conflictingEvent.title}"`;

        alert(`No se puede crear el evento porque existe un conflicto de horario con el evento ${conflictMessage}.`);
        return;
      }
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
      details: formData.details ? (formData.details.includes('\n') ? formData.details.split('\n') : formData.details) : 'Sin detalles especificados',
      time: timeString || null,
      location: formData.location || 'Sin ubicación',
      color: formData.color,
      modalidad: formData.modalidad || null,
      confirmed: formData.confirmed
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
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Programa * 
                <span class="text-xs text-gray-500 font-normal ml-1">(obligatorio - puedes usar cualquier título)</span>
              </label>
              
              {/* Selector de títulos predefinidos */}
              {!useCustomTitle && (
                <select
                  value={formData.title}
                  onInput={(e) => handleTitleSelect((e.target as HTMLSelectElement).value)}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white mb-2"
                >
                  <option value="">Selecciona un programa o escribe uno personalizado...</option>
                  {PREDEFINED_TITLES.map((title) => (
                    <option key={title} value={title} class="text-gray-900 bg-white">
                      {title}
                    </option>
                  ))}
                  <option value="custom" class="text-blue-600 bg-blue-50 font-semibold">
                    ✏️ Escribir título personalizado
                  </option>
                </select>
              )}

              {/* Campo de texto personalizado para título */}
              {(useCustomTitle || formData.title) && (
                <div class="flex items-center space-x-2">
                  <input
                    type="text"
                    value={formData.title}
                    onInput={(e) => handleInputChange('title', (e.target as HTMLInputElement).value)}
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Escribe el título personalizado"
                  />
                  {useCustomTitle && (
                    <button
                      onClick={() => {
                        setUseCustomTitle(false);
                        setFormData(prev => ({ ...prev, title: '' }));
                      }}
                      class="px-2 py-2 text-gray-500 hover:text-gray-700"
                      title="Volver a opciones predefinidas"
                    >
                      ↶
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Details */}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Módulo</label>
              
              {/* Selector de descripciones predefinidas */}
              {!useCustomDetails && (
                <select
                  value={formData.details}
                  onInput={(e) => handleDetailsSelect((e.target as HTMLSelectElement).value)}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white mb-2"
                >
                  <option value="">Selecciona un módulo...</option>
                  {PREDEFINED_DETAILS.map((description) => (
                    <option key={description} value={description} class="text-gray-900 bg-white">
                      {description}
                    </option>
                  ))}
                  <option value="custom" class="text-gray-900 bg-white font-semibold">
                    ✏️ Escribir descripción personalizada
                  </option>
                </select>
              )}

              {/* Campo de texto personalizado para detalles */}
              {(useCustomDetails || formData.details) && (
                <div class="flex items-center space-x-2">
                  <textarea
                    value={formData.details}
                    onInput={(e) => handleInputChange('details', (e.target as HTMLTextAreaElement).value)}
                    rows={3}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Detalles del evento (una línea por detalle)"
                  />
                  {useCustomDetails && (
                    <button
                      onClick={() => {
                        setUseCustomDetails(false);
                        setFormData(prev => ({ ...prev, details: '' }));
                      }}
                      class="px-2 py-2 text-gray-500 hover:text-gray-700"
                      title="Volver a opciones predefinidas"
                    >
                      ↶
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Mostrar información del color automático */}
            {formData.details && !useCustomDetails && (
              <div class="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div class="flex items-center space-x-2">
                  <div class="w-4 h-4 rounded-full border border-gray-300" style={hexToStyle(formData.color)}></div>
                  <span class="text-sm text-blue-800">
                    Color asignado automáticamente para este detalle
                  </span>
                </div>
              </div>
            )}

            {/* Color Picker - Solo mostrar para detalles personalizados */}
            {useCustomDetails && (
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Color del Evento</label>
                <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {EVENT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleInputChange('color', color)}
                      class={`w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform ${formData.color === color ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-800' : 'border-gray-300'}`}
                      style={hexToStyle(color)}
                      title={`Seleccionar color ${color}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Time Selectors */}
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Hora de Inicio</label>
                <select
                  value={formData.startTime}
                  onInput={(e) => handleInputChange('startTime', (e.target as HTMLSelectElement).value)}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
                >
                  <option value="">Seleccionar hora...</option>
                  {startTimes.map((time) => (
                    <option key={time} value={time} class="text-black bg-white">
                      {time}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Hora de Fin</label>
                <select
                  value={formData.endTime}
                  onInput={(e) => handleInputChange('endTime', (e.target as HTMLSelectElement).value)}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
                >
                  <option value="">Seleccionar hora...</option>
                  {endTimes.map((time) => (
                    <option key={time} value={time} class="text-black bg-white">
                      {time}
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

            {/* Modalidad */}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Modalidad</label>
              <select
                value={formData.modalidad}
                onInput={(e) => handleInputChange('modalidad', (e.target as HTMLSelectElement).value)}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              >
                <option value="">Seleccionar modalidad...</option>
                {PREDEFINED_MODALITIES.map((modality) => (
                  <option key={modality} value={modality} class="text-gray-900 bg-white">
                    {modality}
                  </option>
                ))}
              </select>
            </div>

            {/* Estado de Confirmación */}
            <div class="border-t pt-4">
              <label class="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.confirmed}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmed: (e.target as HTMLInputElement).checked }))}
                  disabled={!isAdmin.value}
                  class={`w-5 h-5 rounded border-2 focus:ring-2 focus:ring-green-500 ${
                    isAdmin.value 
                      ? 'text-green-600 border-gray-300 cursor-pointer' 
                      : 'text-green-600 border-gray-300 cursor-not-allowed opacity-60'
                  }`}
                />
                <span class={`text-sm font-medium ${formData.confirmed ? 'text-green-700' : 'text-gray-600'}`}>
                  {formData.confirmed ? '✅ Evento Confirmado' : '⏳ Pendiente de Confirmación'}
                </span>
                {!isAdmin.value && (
                  <span class="text-xs text-gray-400">(Solo administradores pueden modificar)</span>
                )}
              </label>
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