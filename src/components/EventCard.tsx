import { useState, useEffect } from 'preact/hooks';
import { updateEvent, deleteEvent, checkTimeConflict, startTimes, endTimes } from '../stores/schedule';
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
  console.log('EventCard recibido:', { event, rowId, day });
  
  const [formData, setFormData] = useState({
    title: event.title,
    details: Array.isArray(event.details) ? event.details.join('\n') : event.details,
    startTime: '',
    endTime: '',
    location: event.location,
    color: event.color,
    modalidad: event.modalidad || ''
  });

  const [hasConflict, setHasConflict] = useState(false);
  const [conflictingEvent, setConflictingEvent] = useState<Event | undefined>(undefined);
  const [useCustomDetails, setUseCustomDetails] = useState(true);

  // Validar que los campos requeridos estén completados
  const isValid = formData.title.trim() !== '' && formData.location.trim() !== '';

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

    // Determinar si los detalles son personalizados o predefinidos
    if (typeof event.details === 'string' && predefinedDescriptions.includes(event.details)) {
      setUseCustomDetails(false);
    } else {
      setUseCustomDetails(true);
    }
  }, [event.time, event.details]);

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

    // Verificar conflictos solo si tenemos startTime y endTime
    if (formData.startTime && formData.endTime) {
      const conflict = checkTimeConflict(rowId, day, formData.startTime, formData.endTime, event.id);
    setHasConflict(conflict.hasConflict);
    setConflictingEvent(conflict.conflictingEvent);
    } else {
      setHasConflict(false);
      setConflictingEvent(undefined);
    }
  }, [formData.startTime, formData.endTime, event.id, rowId, day]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
      color: formData.color,
      modalidad: formData.modalidad || undefined
    };
    
    updateEvent(rowId, day, updatedEventData);
    onClose();
  };

  const handleDelete = () => {
    if (confirm('¿Estás seguro de que quieres eliminar este evento del borrador?')) {
      console.log('🗑️ EventCard - Eliminando evento:', {
        eventId: event.id,
        rowId,
        day,
        eventTitle: event.title
      });
      deleteEvent(rowId, day, event.id);
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

  // Debug: Verificar valores
  console.log('EventCard - Valores iniciales:', {
    event,
    formData,
    useCustomDetails,
    isValid
  });

  return (
    <div class={`bg-white rounded-lg shadow-md p-3 sm:p-4 ${hasConflict ? 'border-2 border-red-500' : ''}`}>
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-800">Editar Evento</h3>
        <button
          onClick={onClose}
          class="text-gray-500 hover:text-gray-700 text-2xl leading-none"
        >
          ×
        </button>
      </div>
      <div class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Título del Evento</label>
            <input
              type="text"
              value={formData.title}
              onInput={(e) => handleInputChange('title', (e.target as HTMLInputElement).value)}
              class={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white ${
                hasConflict ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Título del evento"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
            <input
              type="text"
              value={formData.location}
              onInput={(e) => handleInputChange('location', (e.target as HTMLInputElement).value)}
              class={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white ${
                hasConflict ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Ubicación del evento"
            />
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Hora de Inicio</label>
            <select
              value={formData.startTime}
              onInput={(e) => handleInputChange('startTime', (e.target as HTMLSelectElement).value)}
              class={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white ${
                hasConflict ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Seleccionar hora...</option>
              {startTimes.map((time) => (
                <option key={time} value={time}>
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
              class={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white ${
                hasConflict ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Seleccionar hora...</option>
              {endTimes.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Modalidad */}
        <div class="grid grid-cols-1 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Modalidad</label>
            <select
              value={formData.modalidad}
              onInput={(e) => handleInputChange('modalidad', (e.target as HTMLSelectElement).value)}
              class={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white ${
                hasConflict ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Seleccionar modalidad...</option>
              <option value="Presencial">Presencial</option>
              <option value="Virtual">Virtual</option>
            </select>
          </div>
        </div>
        
        <div class="grid grid-cols-1 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Detalles</label>
            <select
              value={useCustomDetails ? 'custom' : formData.details}
              onInput={(e) => handleDetailsSelect((e.target as HTMLSelectElement).value)}
              class={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white ${
                hasConflict ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Seleccionar detalles predefinidos...</option>
              {predefinedDescriptions.map((desc) => (
                <option key={desc} value={desc} class="text-gray-900 bg-white">
                  {desc}
                </option>
              ))}
              <option value="custom" class="text-gray-900 bg-white font-semibold">
                ✏️ Personalizar detalles...
              </option>
            </select>
          </div>
          {useCustomDetails && (
            <div>
              <textarea
                value={formData.details}
                onInput={(e) => handleInputChange('details', (e.target as HTMLTextAreaElement).value)}
                rows={4}
                class={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white ${
                  hasConflict ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Ingresa los detalles del evento (separa con líneas para múltiples detalles)"
              />
            </div>
          )}
        </div>

        {/* Mostrar información del color automático */}
        {formData.details && !useCustomDetails && (
          <div class="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div class="flex items-center space-x-2">
              <div class={`w-4 h-4 rounded-full ${formData.color}`}></div>
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
            <div class="flex flex-wrap gap-2">
              {['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-pink-600', 'bg-indigo-600', 'bg-teal-600', 'bg-amber-600', 'bg-red-600', 'bg-rose-600', 'bg-emerald-600', 'bg-cyan-500'].map((color) => (
                <button
                  key={color}
                  onClick={() => handleInputChange('color', color)}
                  class={`w-8 h-8 rounded-full border-2 ${formData.color === color ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-800' : 'border-gray-300'} ${color}`}
                  title={`Seleccionar color ${color}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Conflictos */}
        {hasConflict && conflictingEvent && (
          <div class="bg-red-50 border border-red-200 rounded-md p-3">
            <div class="flex items-center space-x-2">
              <div class="w-4 h-4 bg-red-600 rounded-full"></div>
              <span class="text-sm text-red-800">
                Conflicto con: <strong>{conflictingEvent.title}</strong>
                {conflictingEvent.time && ` (${conflictingEvent.time})`}
              </span>
            </div>
          </div>
        )}

        {/* Botones */}
        <div class="flex flex-col sm:flex-row gap-2 mt-4">
          <button
            onClick={handleDelete}
            class="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            🗑️ Eliminar
          </button>
          <div class="flex-1"></div>
          <button
            onClick={onClose}
            class="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || hasConflict}
            class={`w-full sm:w-auto flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
              !isValid || hasConflict
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            💾 Guardar
          </button>
        </div>
      </div>
    </div>
  );
} 