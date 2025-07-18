import { useState, useEffect } from 'preact/hooks';
import { updateEvent, deleteEvent, checkTimeConflict, startTimes, endTimes } from '../stores/schedule';
import { safeConfirm } from '../lib/utils';
import type { Event } from '../stores/schedule';

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
 * Lista de descripciones predefinidas para eventos.
 */
const predefinedDescriptions = [
  'MODULO PROTAGONISTAS DEL SERVICIO',
  'MODULO FORMATIVO GNV',
  'MODULO FORMATIVO LIQUIDOS',
  'MODULO FORMATIVO LUBRICANTES',
  'PROTOCOLO DE SERVICIO EDS',
  'GESTION AMBIENTAL, SEGURIDAD Y SALUD EN EL TRABAJO',
  'MODULO ESCUELA DE INDUSTRIA',
  'EXCELENCIA ADMINISTRATIVA',
  'VIVE PITS',
  'LA TOMA VIVE TERPEL & VIVE PITS',
  'FORMACION INICIAL TERPEL POS OPERATIVO',
  'FACTURACION ELECTRONICA OPERATIVA',
  'FACTURACION ELECTRONICA ADMINISTRATIVA',
  'CANASTILLA',
  'ENTRENAMIENTO TERPEL POS OPERATIVO',
  'ENTRENAMIENTO TERPEL POS ADMINISTRATIVO',
  'FORMACION INICIAL TERPEL POS ADMINISTRATIVO',
  'CLIENTES PROPIOS',
  'MASTERLUB OPERATIVO',
  'MASTERLUB ADMINISTRATIVO',
  'EDS CONFIABLE',
  'CAMPO DE ENTRENAMIENTO DE INDUSTRIA LIMPIA',
  'CARAVANA RUMBO PITS',
  'APP TERPEL',
  'MODULO ROLLOS',
  'MODULO HISTORIA Y MASA',
  'MODULO STROMBOLIS',
  'MODULO PERROS Y MAS PERROS',
  'MODULO SANDUCHES',
  'MODULO SBARRO',
  'MODULO BEBIDAS CALIENTES',
  'CONSTRUYENDO EQUIPOS ALTAMENTE EFECTIVOS',
  'TALLER EDS CONFIABLE'
];

/**
 * Mapeo de detalles predefinidos a colores específicos.
 * Cada detalle tiene un color único asociado para facilitar la identificación visual.
 */
const detailColorMap: { [key: string]: string } = {
  // Módulos formativos - Tonos azules
  'MODULO PROTAGONISTAS DEL SERVICIO': 'bg-blue-600',
  'MODULO FORMATIVO GNV': 'bg-blue-700',
  'MODULO FORMATIVO LIQUIDOS': 'bg-blue-800',
  'MODULO FORMATIVO LUBRICANTES': 'bg-blue-500',
  'MODULO ESCUELA DE INDUSTRIA': 'bg-blue-900',
  
  // Protocolos y gestión - Tonos verdes
  'PROTOCOLO DE SERVICIO EDS': 'bg-green-600',
  'GESTION AMBIENTAL, SEGURIDAD Y SALUD EN EL TRABAJO': 'bg-green-700',
  'EXCELENCIA ADMINISTRATIVA': 'bg-green-800',
  
  // Programas VIVE - Tonos púrpuras
  'VIVE PITS': 'bg-purple-600',
  'LA TOMA VIVE TERPEL & VIVE PITS': 'bg-purple-700',
  'CARAVANA RUMBO PITS': 'bg-purple-800',
  
  // Formación TERPEL POS - Tonos naranjas
  'FORMACION INICIAL TERPEL POS OPERATIVO': 'bg-orange-600',
  'FORMACION INICIAL TERPEL POS ADMINISTRATIVO': 'bg-orange-700',
  'ENTRENAMIENTO TERPEL POS OPERATIVO': 'bg-orange-800',
  'ENTRENAMIENTO TERPEL POS ADMINISTRATIVO': 'bg-orange-500',
  
  // Facturación - Tonos rosados
  'FACTURACION ELECTRONICA OPERATIVA': 'bg-pink-600',
  'FACTURACION ELECTRONICA ADMINISTRATIVA': 'bg-pink-700',
  
  // Productos específicos - Tonos índigo
  'CANASTILLA': 'bg-indigo-600',
  'CLIENTES PROPIOS': 'bg-indigo-700',
  'APP TERPEL': 'bg-indigo-800',
  
  // MASTERLUB - Tonos teal
  'MASTERLUB OPERATIVO': 'bg-teal-600',
  'MASTERLUB ADMINISTRATIVO': 'bg-teal-700',
  
  // EDS - Tonos amber
  'EDS CONFIABLE': 'bg-amber-600',
  'TALLER EDS CONFIABLE': 'bg-amber-700',
  
  // Campos y entrenamientos - Tonos emerald
  'CAMPO DE ENTRENAMIENTO DE INDUSTRIA LIMPIA': 'bg-emerald-600',
  'CONSTRUYENDO EQUIPOS ALTAMENTE EFECTIVOS': 'bg-emerald-700',
  
  // Módulos de comida - Tonos cálidos
  'MODULO ROLLOS': 'bg-red-600',
  'MODULO HISTORIA Y MASA': 'bg-red-700',
  'MODULO STROMBOLIS': 'bg-red-800',
  'MODULO PERROS Y MAS PERROS': 'bg-red-500',
  'MODULO SANDUCHES': 'bg-red-900',
  'MODULO SBARRO': 'bg-rose-600',
  'MODULO BEBIDAS CALIENTES': 'bg-rose-700'
};

/**
 * Función para obtener el color asociado a un detalle específico.
 * @param detail - El detalle del evento
 * @returns El color asociado al detalle o null si no está mapeado
 */
const getColorForDetail = (detail: string): string | null => {
  return detailColorMap[detail] || null;
};

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
    color: event.color
  });

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedDetails, setSelectedDetails] = useState('');
  const [customDetails, setCustomDetails] = useState('');
  const [detailsMode, setDetailsMode] = useState<'predefined' | 'custom'>('predefined');
  const [hasTimeConflict, setHasTimeConflict] = useState(false);

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
  useEffect(() => {
    const { start, end } = parseTimeString(formData.time);
    setStartTime(start);
    setEndTime(end);

    // Verificar si los detalles coinciden con alguna opción predefinida
    const detailsText = Array.isArray(event.details) ? event.details.join('\n') : event.details;
    if (predefinedDescriptions.includes(detailsText.trim())) {
      setSelectedDetails(detailsText.trim());
      setDetailsMode('predefined');
    } else {
      setCustomDetails(detailsText);
      setDetailsMode('custom');
    }
  }, [event, formData.time]);

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
    // Verificar campos requeridos
    if (!formData.title.trim()) {
      alert('El título es requerido.');
      return;
    }

    const finalDetails = detailsMode === 'predefined' ? selectedDetails : customDetails;
    
    if (!finalDetails.trim()) {
      alert('Los detalles son requeridos.');
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
      title: formData.title.trim(),
      details: finalDetails.trim(),
      time: timeString,
      location: formData.location.trim(),
      color: finalColor
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
  const colorOptions = [
    'bg-red-600', 'bg-red-700', 'bg-red-800',
    'bg-blue-600', 'bg-blue-700', 'bg-blue-800',
    'bg-green-600', 'bg-green-700', 'bg-green-800',
    'bg-yellow-600', 'bg-yellow-700', 'bg-yellow-800',
    'bg-purple-600', 'bg-purple-700', 'bg-purple-800',
    'bg-pink-600', 'bg-pink-700', 'bg-pink-800',
    'bg-indigo-600', 'bg-indigo-700', 'bg-indigo-800',
    'bg-orange-600', 'bg-orange-700', 'bg-orange-800',
    'bg-teal-600', 'bg-teal-700', 'bg-teal-800',
    'bg-amber-600', 'bg-amber-700', 'bg-amber-800',
    'bg-emerald-600', 'bg-emerald-700', 'bg-emerald-800',
    'bg-rose-600', 'bg-rose-700', 'bg-rose-800'
  ];

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
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Título *
            </label>
            <input
              type="text"
              value={formData.title}
              onInput={(e) => setFormData(prev => ({ ...prev, title: (e.target as HTMLInputElement).value }))}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              placeholder="Título del evento"
            />
          </div>

          {/* Detalles */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Detalles *
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
                {predefinedDescriptions.map(desc => (
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

          {/* Color */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Color del evento
            </label>
            <div class="grid grid-cols-12 gap-2">
              {colorOptions.map(color => (
                <button
                  key={color}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  class={`w-8 h-8 rounded ${color} ${
                    formData.color === color ? 'ring-2 ring-gray-400 ring-offset-1' : ''
                  }`}
                />
              ))}
            </div>
            <p class="text-xs text-gray-500 mt-2">
              Seleccionado: <span class={`inline-block w-4 h-4 rounded ${formData.color}`}></span>
            </p>
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