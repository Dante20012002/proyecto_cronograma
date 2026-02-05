import { useState, useEffect } from 'preact/hooks';
import { updateEvent, deleteEvent, checkTimeConflict, startTimes, endTimes } from '../stores/schedule';
import { safeConfirm } from '../lib/utils';
import { isAdmin } from '../lib/auth';
import type { Event } from '../stores/schedule';
import { EVENT_COLORS, getColorForDetail, getRandomEventColor, hexToStyle, getContrastTextColor } from '../lib/colors';
import { 
  PREDEFINED_DETAILS, 
  PREDEFINED_TITLES, 
  PREDEFINED_MODALITIES,
  getPredefinedTitles,
  getPredefinedDetails,
  getPredefinedModalities
} from '../lib/predefined-data';

/**
 * Props para el componente EventCard
 * @interface EventCardProps
 */
interface EventCardProps {
  /** Datos del evento a editar */
  event: Event;
  /** ID del instructor/fila donde está el evento */
  rowId: string;
  /** Día del mes donde está el evento */
  day: string;
  /** Función para cerrar el modal */
  onClose: () => void;
}



/**
 * Componente modal para editar eventos existentes en el cronograma.
 * Permite editar todos los aspectos de un evento y validar conflictos de horario.
 * 
 * @component
 * @param {EventCardProps} props - Props del componente
 * @returns {JSX.Element} Componente EventCard
 * 
 * @example
 * ```tsx
 * <EventCard
 *   event={eventData}
 *   rowId="instructor-1"
 *   day="25"
 *   onClose={() => setShowModal(false)}
 * />
 * ```
 */
export default function EventCard({ event, rowId, day, onClose }: EventCardProps) {
  const [formData, setFormData] = useState({
    title: event.title,
    details: Array.isArray(event.details) ? event.details.join('\n') : event.details,
    time: event.time || '',
    location: event.location,
    color: event.color,
    modalidad: event.modalidad || '',
    confirmed: event.confirmed || false
  });

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedDetails, setSelectedDetails] = useState('');
  const [customDetails, setCustomDetails] = useState('');
  const [detailsMode, setDetailsMode] = useState<'predefined' | 'custom' | null>(null);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [titleMode, setTitleMode] = useState<'predefined' | 'custom'>('predefined');
  const [hasTimeConflict, setHasTimeConflict] = useState(false);
  
  // Estados para datos dinámicos
  const [availableTitles, setAvailableTitles] = useState(PREDEFINED_TITLES);
  const [availableDetails, setAvailableDetails] = useState(PREDEFINED_DETAILS);
  const [availableModalities, setAvailableModalities] = useState(PREDEFINED_MODALITIES);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Función para extraer horarios del string de tiempo
  const parseTimeString = (timeStr: string) => {
    if (!timeStr) return { start: '', end: '' };
    
    const timeRegex = /(\d{1,2}:\d{2}\s?[ap]\.?m\.?)/gi;
    const matches = timeStr.match(timeRegex);
    
    if (matches && matches.length >= 2) {
      return { start: matches[0], end: matches[1] };
    } else if (matches && matches.length === 1) {
      return { start: matches[0], end: '' };
    }
    
    return { start: '', end: '' };
  };

  // Inicializar campos al cargar el componente
  // Cargar datos dinámicos primero
  useEffect(() => {
    const loadDynamicData = async () => {
      try {
        const [titles, details, modalities] = await Promise.all([
          getPredefinedTitles(),
          getPredefinedDetails(),
          getPredefinedModalities()
        ]);
        
        setAvailableTitles(titles);
        setAvailableDetails(details);
        setAvailableModalities(modalities);
        setDataLoaded(true);
      } catch (error) {
        console.error('Error cargando datos dinámicos:', error);
        setDataLoaded(true); // Continuar con valores por defecto
      }
    };
    
    loadDynamicData();
  }, []);

  useEffect(() => {
    if (!dataLoaded) return;
    
    const { start, end } = parseTimeString(formData.time);
    setStartTime(start);
    setEndTime(end);

    // Verificar si los detalles coinciden con alguna opción predefinida
    const detailsText = Array.isArray(event.details) ? event.details.join('\n') : event.details;
    const trimmedDetails = detailsText.trim();
    
    if (availableDetails.includes(trimmedDetails)) {
      setSelectedDetails(trimmedDetails);
      setDetailsMode('predefined');
    } else {
      setCustomDetails(detailsText);
      setDetailsMode('custom');
    }

    // Verificar si el título coincide con alguna opción predefinida
    if (availableTitles.includes(event.title.trim())) {
      setSelectedTitle(event.title.trim());
      setTitleMode('predefined');
    } else {
      setCustomTitle(event.title.trim());
      setTitleMode('custom');
    }
  }, [dataLoaded, event, formData.time, availableDetails, availableTitles]);

  useEffect(() => {
    // Verificar conflictos cuando cambian los horarios
    if (startTime && endTime) {
      const { hasConflict } = checkTimeConflict(rowId, day, startTime, endTime, event.id);
      setHasTimeConflict(hasConflict);
    } else {
      setHasTimeConflict(false);
    }
  }, [startTime, endTime, rowId, day, event.id]);

  const handleSave = () => {
    // Construir valores finales
    const finalDetails = detailsMode === 'predefined' ? selectedDetails : customDetails;
    const finalTitle = titleMode === 'predefined' ? selectedTitle : customTitle;

    // Verificar campos requeridos
    if (!finalTitle.trim()) {
      alert('El título del programa es obligatorio. Puedes seleccionar uno predefinido o escribir uno personalizado.');
      return;
    }

    // Construir string de tiempo si ambos horarios están presentes
    let timeString = formData.time;
    if (startTime && endTime) {
      timeString = `${startTime} - ${endTime}`;
    } else if (startTime) {
      timeString = startTime;
    }

    // Determinar color automático si se seleccionó un detalle predefinido
    let finalColor = formData.color;
    if (detailsMode === 'predefined' && selectedDetails) {
      const autoColor = getColorForDetail(selectedDetails);
      if (autoColor) {
        finalColor = autoColor;
      }
    }

    const updatedEvent: Event = {
      ...event,
      title: finalTitle.trim() || 'Sin título especificado',
      details: finalDetails.trim() || 'Sin detalles especificados',
      location: formData.location.trim() || 'Sin ubicación',
      time: timeString || null,
      color: finalColor,
      modalidad: formData.modalidad || null,
      confirmed: formData.confirmed
    };

    updateEvent(rowId, day, updatedEvent);
    onClose();
  };

  const handleDelete = () => {
    if (safeConfirm('¿Estás seguro de que quieres eliminar este evento del borrador?')) {
      deleteEvent(rowId, day, event.id);
      onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Permitir eliminar con Ctrl+Delete o Cmd+Backspace
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      handleDelete();
    }
  };

  useEffect(() => {
    // Agregar listener para atajos de teclado
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Array de colores disponibles
  const colorOptions = EVENT_COLORS;

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white text-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-gray-900">Editar Evento</h2>
          <button
            onClick={onClose}
            class="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div class="space-y-4">
          {/* Título */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Programa *
            </label>
            
            {/* Selector de modo para título */}
            <div class="flex space-x-4 mb-3">
              <label class="flex items-center text-gray-700">
                <input
                  type="radio"
                  name="titleMode"
                  checked={titleMode === 'predefined'}
                  onChange={() => setTitleMode('predefined')}
                  class="mr-2"
                />
                Seleccionar predefinido
              </label>
              <label class="flex items-center text-gray-700">
                <input
                  type="radio"
                  name="titleMode"
                  checked={titleMode === 'custom'}
                  onChange={() => setTitleMode('custom')}
                  class="mr-2"
                />
                Escribir personalizado
              </label>
            </div>

            {titleMode === 'predefined' ? (
              <select
                value={selectedTitle}
                onChange={(e) => setSelectedTitle((e.target as HTMLSelectElement).value)}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              >
                <option value="">Selecciona un programa...</option>
                {availableTitles.map(title => (
                  <option key={title} value={title}>{title}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={customTitle}
                onInput={(e) => setCustomTitle((e.target as HTMLInputElement).value)}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="Escribe el título personalizado del programa"
              />
            )}
          </div>

          {/* Detalles */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Módulo
            </label>
            
            {/* Selector de modo */}
            <div class="flex space-x-4 mb-3">
              <label class="flex items-center text-gray-700">
                <input
                  type="radio"
                  name="detailsMode"
                  checked={detailsMode === 'predefined'}
                  onChange={() => setDetailsMode('predefined')}
                  class="mr-2"
                />
                Seleccionar predefinido
              </label>
              <label class="flex items-center text-gray-700">
                <input
                  type="radio"
                  name="detailsMode"
                  checked={detailsMode === 'custom'}
                  onChange={() => setDetailsMode('custom')}
                  class="mr-2"
                />
                Escribir personalizado
              </label>
            </div>

            {detailsMode === 'predefined' ? (
              <select
                value={selectedDetails}
                onChange={(e) => {
                  setSelectedDetails((e.target as HTMLSelectElement).value);
                  // Auto-asignar color si está disponible
                  const autoColor = getColorForDetail((e.target as HTMLSelectElement).value);
                  if (autoColor) {
                    setFormData(prev => ({ ...prev, color: autoColor }));
                  }
                }}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              >
                <option value="">Selecciona una descripción...</option>
                {availableDetails.map(desc => (
                  <option key={desc} value={desc}>{desc}</option>
                ))}
              </select>
            ) : (
              <textarea
                value={customDetails}
                onInput={(e) => setCustomDetails((e.target as HTMLTextAreaElement).value)}
                rows={3}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="Descripción personalizada del evento..."
              />
            )}
          </div>

          {/* Horarios */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Horario
            </label>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-gray-600 mb-1">Hora de inicio</label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime((e.target as HTMLSelectElement).value)}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="">Sin hora específica</option>
                  {startTimes.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-600 mb-1">Hora de fin</label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime((e.target as HTMLSelectElement).value)}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="">Sin hora específica</option>
                  {endTimes.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>
            {hasTimeConflict && (
              <p class="text-red-600 text-sm mt-1">
                ⚠️ Hay un conflicto de horario con otro evento en este día
              </p>
            )}
          </div>

          {/* Ubicación */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Ubicación
            </label>
            <input
              type="text"
              value={formData.location}
              onInput={(e) => setFormData(prev => ({ ...prev, location: (e.target as HTMLInputElement).value }))}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="Ubicación del evento"
            />
          </div>

          {/* Modalidad */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Modalidad
            </label>
            <select
              value={formData.modalidad}
              onChange={(e) => setFormData(prev => ({ ...prev, modalidad: (e.target as HTMLSelectElement).value }))}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              <option value="">Seleccionar modalidad...</option>
              {availableModalities.map((modality) => (
                <option key={modality} value={modality}>
                  {modality}
                </option>
              ))}
            </select>
          </div>



          {/* Mostrar información del color automático para detalles predefinidos */}
          {detailsMode === 'predefined' && selectedDetails && selectedDetails.trim() !== '' && (
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
          {detailsMode === 'custom' && (
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Color del evento
              </label>
              <div class="grid grid-cols-12 gap-2 max-h-32 overflow-y-auto">
                {colorOptions.map(color => (
                  <button
                    key={color}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    class={`w-8 h-8 rounded border-2 hover:scale-110 transition-transform ${
                      formData.color === color ? 'ring-2 ring-gray-400 ring-offset-1' : 'border-gray-300'
                    }`}
                    style={hexToStyle(color)}
                  />
                ))}
              </div>
              <p class="text-xs text-gray-500 mt-2">
                Seleccionado: <span class="inline-block w-4 h-4 rounded border border-gray-300" style={hexToStyle(formData.color)}></span>
              </p>
            </div>
          )}

          {/* Fallback: Si no se ha determinado el modo aún, no mostrar nada */}
          {detailsMode === null && (
            <div class="bg-gray-50 border border-gray-200 rounded-md p-3">
              <span class="text-sm text-gray-600">
                Cargando configuración de colores...
              </span>
            </div>
          )}

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

        {/* Botones de acción */}
        <div class="flex justify-between mt-6">
          <button
            onClick={handleDelete}
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Eliminar Evento
          </button>
          <div class="space-x-3">
            <button
              onClick={onClose}
              class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={hasTimeConflict}
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Guardar Cambios
            </button>
          </div>
        </div>

        {/* Nota de atajos */}
        <p class="text-xs text-gray-500 mt-4 text-center">
          💡 Tip: Usa Ctrl+Delete (o Cmd+Backspace en Mac) para eliminar rápidamente
        </p>
      </div>
    </div>
  );
} 