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
    startTime: '',
    endTime: '',
    location: event.location,
    color: event.color
  });

  const [hasConflict, setHasConflict] = useState(false);
  const [conflictingEvent, setConflictingEvent] = useState<Event | undefined>(undefined);
  const [useCustomDetails, setUseCustomDetails] = useState(true);

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

    const conflict = checkTimeConflict(event.id, rowId, day, timeString);
    setHasConflict(conflict.hasConflict);
    setConflictingEvent(conflict.conflictingEvent);
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
      setFormData(prev => ({ ...prev, details }));
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
    <div class={`bg-white rounded-lg shadow-md p-3 sm:p-4 ${hasConflict ? 'border-2 border-red-500' : ''}`}>
      <div class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
            <select
              value={formData.instructorId}
              onInput={(e) => handleInputChange('instructorId', (e.target as HTMLSelectElement).value)}
              class={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasConflict ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Seleccionar instructor...</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Actividad</label>
            <input
              type="text"
              value={formData.activity}
              onInput={(e) => handleInputChange('activity', (e.target as HTMLInputElement).value)}
              class={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasConflict ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Nombre de la actividad"
            />
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Hora de Inicio</label>
            <select
              value={formData.startTime}
              onInput={(e) => handleInputChange('startTime', (e.target as HTMLSelectElement).value)}
              class={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
              class={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
        <div class="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
          <button
            onClick={handleDelete}
            class="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Eliminar
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || hasConflict}
            class={`w-full sm:w-auto flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
              isValid && !hasConflict
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
} 