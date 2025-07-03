import { useState } from 'preact/hooks';
import { addEvent, startTimes, endTimes, checkTimeConflict } from '../stores/schedule';
import type { Event } from '../stores/schedule';

/**
 * Lista de títulos predefinidos para eventos.
 */
const predefinedTitles = [
  'ESCUELA DE PROMOTORES',
  'INDUSTRIA LIMPIA',
  'ESCUELA DE ADMINISTRADORES',
  'LEALTAD',
  'RED VIRTUAL',
  'EDS CONFIABLE',
  'RUMBO',
  'ESCUELA DE TIENDAS'
];

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
    color: 'bg-blue-600'
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
      alert('Por favor ingresa un título para el evento.');
      return;
    }

    // Validar conflictos de horario
    if (formData.startTime && formData.endTime) {
      console.log('🕐 AddEventCard - Validando conflictos para nuevo evento:', {
        rowId,
        day,
        startTime: formData.startTime,
        endTime: formData.endTime
      });

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
        
        console.log('❌ AddEventCard - Conflicto detectado:', {
          newEvent: `${formData.startTime} a ${formData.endTime}`,
          conflictingEvent: conflictingEvent.title,
          conflictingTime: conflictingEvent.time
        });

        alert(`No se puede crear el evento porque existe un conflicto de horario con el evento ${conflictMessage}.`);
        return;
      } else {
        console.log('✅ AddEventCard - Sin conflictos, procediendo a crear evento');
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
              
              {/* Selector de títulos predefinidos */}
              {!useCustomTitle && (
                <select
                  value={formData.title}
                  onInput={(e) => handleTitleSelect((e.target as HTMLSelectElement).value)}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white mb-2"
                >
                  <option value="">Selecciona un título...</option>
                  {predefinedTitles.map((title) => (
                    <option key={title} value={title} class="text-gray-900 bg-white">
                      {title}
                    </option>
                  ))}
                  <option value="custom" class="text-gray-900 bg-white font-semibold">
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
              <label class="block text-sm font-medium text-gray-700 mb-1">Detalles</label>
              
              {/* Selector de descripciones predefinidas */}
              {!useCustomDetails && (
                <select
                  value={formData.details}
                  onInput={(e) => handleDetailsSelect((e.target as HTMLSelectElement).value)}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white mb-2"
                >
                  <option value="">Selecciona una descripción...</option>
                  {predefinedDescriptions.map((description) => (
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