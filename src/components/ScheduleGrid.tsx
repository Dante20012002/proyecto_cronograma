import { useState, useEffect, useRef } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import Sortable from 'sortablejs';
import { 
  draftScheduleRows, 
  publishedScheduleRows,
  draftGlobalConfig,
  publishedGlobalConfig,
  selectedWeek,
  moveEvent, 
  copyEvent,
  saveDraftChanges,
  formatDateDisplay,
  isAdmin,
  updateDraftSchedule,
  updateDraftEvent,
  updateEvent,
  addEvent as addScheduleEvent
} from '../stores/schedule';
import EventCard from './EventCard';
import AddEventCard from './AddEventCard';
import type { JSX } from 'preact';
import type { ScheduleEvent, ScheduleRow } from '../types/schedule';

/**
 * Props para el componente ScheduleGrid
 * @interface ScheduleGridProps
 */
interface ScheduleGridProps {
  /** Determina si se muestran las funciones de administración */
  isAdmin: boolean;
}

/**
 * Componente principal que muestra la cuadrícula del cronograma.
 * Maneja la visualización de eventos, interacciones de arrastrar y soltar,
 * y la edición de eventos para administradores.
 * 
 * @component
 * @param {ScheduleGridProps} props - Props del componente
 * @returns {JSX.Element} Componente ScheduleGrid
 * 
 * @example
 * ```tsx
 * <ScheduleGrid isAdmin={true} />
 * ```
 */
export default function ScheduleGrid({ isAdmin: isAdminProp }: ScheduleGridProps): JSX.Element {
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [editingRowId, setEditingRowId] = useState<string>('');
  const [editingDay, setEditingDay] = useState<string>('');
  const [addingEvent, setAddingEvent] = useState<{ rowId: string; day: string } | null>(null);
  const sortableRefs = useRef<{ [key: string]: Sortable | null }>({});
  
  // Seleccionar el store correcto basado en el rol
  const rows = isAdminProp ? draftScheduleRows.value : publishedScheduleRows.value;
  const config = isAdminProp ? draftGlobalConfig.value : publishedGlobalConfig.value;
  const week = selectedWeek.value;
  const currentWeek = isAdminProp ? config.currentWeek : week;

  // Generar días de la semana basados en la configuración
  const getWeekDays = () => {
    try {
      const days = [];
      
      // Crear fecha local evitando el desfase de zona horaria
      const [year, month, day] = currentWeek.startDate.split('-').map(Number);
      const startDate = new Date(year, month - 1, day); // month es 0-based
      
      if (isNaN(startDate.getTime())) {
        throw new Error('Fecha de inicio inválida');
      }

      for (let i = 0; i < 5; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        if (isNaN(currentDate.getTime())) {
          throw new Error('Error al calcular fecha del día');
        }

        days.push({
          date: currentDate,
          dayNumber: currentDate.getDate().toString(),
          dayName: currentDate.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().replace('.', '')
        });
      }
      
      return days;
    } catch (error) {
      console.error('Error al generar días de la semana:', error);
      return [];
    }
  };

  const weekDays = getWeekDays();

  const handleEventClick = (event: ScheduleEvent, rowId: string, day: string) => {
    if (!isAdminProp) return;
    setEditingEvent(event);
    setEditingRowId(rowId);
    setEditingDay(day);
  };

  const handleCloseEventEditor = () => {
    setEditingEvent(null);
    setEditingRowId('');
    setEditingDay('');
  };

  const handleAddEvent = (rowId: string, day: string) => {
    if (!isAdminProp) return;
    setAddingEvent({ rowId, day });
  };

  const handleCloseAddEvent = () => {
    setAddingEvent(null);
  };

  const handleDrop = async (evt: Sortable.SortableEvent, toRowId: string, toDay: string) => {
    if (!isAdminProp) return;
    
    const eventId = evt.item.getAttribute('data-event-id');
    if (!eventId) return;

    const fromRowId = evt.from.getAttribute('data-row-id');
    const fromDay = evt.from.getAttribute('data-day');
    
    if (fromRowId && fromDay) {
      const updatedRows = [...rows];
      const fromRowIndex = updatedRows.findIndex(row => row.id === fromRowId);
      const toRowIndex = updatedRows.findIndex(row => row.id === toRowId);
      
      if (fromRowIndex !== -1 && toRowIndex !== -1) {
        const fromEvents = updatedRows[fromRowIndex].events[fromDay] || [];
        const eventIndex = fromEvents.findIndex(e => e.id === eventId);
        
        if (eventIndex !== -1) {
          const event = fromEvents[eventIndex];
          fromEvents.splice(eventIndex, 1);
          
          if (!updatedRows[toRowIndex].events[toDay]) {
            updatedRows[toRowIndex].events[toDay] = [];
          }
          
          updatedRows[toRowIndex].events[toDay].push(event);
          updateDraftSchedule(updatedRows);
          await saveDraftChanges();
        }
      }
    }
  };

  const initializeSortable = (element: HTMLElement, rowId: string, day: string) => {
    if (element && isAdminProp) {
      const sortableInstance = Sortable.create(element, {
        group: 'events',
        animation: 150,
        onEnd: (evt) => handleDrop(evt, rowId, day)
      });
      
      const key = `${rowId}-${day}`;
      sortableRefs.current[key] = sortableInstance;
      
      return () => {
        sortableInstance.destroy();
        sortableRefs.current[key] = null;
      };
    }
  };

  useEffect(() => {
    const elements = document.querySelectorAll('[data-sortable="true"]');
    const cleanupFns: (() => void)[] = [];

    elements.forEach((element) => {
      const rowId = element.getAttribute('data-row-id');
      const day = element.getAttribute('data-day');
      
      if (rowId && day && element instanceof HTMLElement) {
        const cleanup = initializeSortable(element, rowId, day);
        if (cleanup) cleanupFns.push(cleanup);
      }
    });

    return () => {
      cleanupFns.forEach(fn => fn());
    };
  }, [rows]);

  return (
    <div id="schedule-grid" class="bg-slate-800 rounded-lg shadow-xl overflow-hidden text-white">
      {/* Header con título dinámico */}
      <div class="bg-slate-900 text-white p-6">
        <h1 class="text-3xl font-bold text-center tracking-tight">{config.title}</h1>
        <p class="text-center text-slate-300 mt-2">
          {formatDateDisplay(currentWeek.startDate)} - {formatDateDisplay(currentWeek.endDate)}
        </p>
      </div>

      {/* Tabla del cronograma */}
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-700/50">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-semibold text-slate-300 border-r border-slate-700 min-w-[250px] align-top">
                Instructor / Ciudad / Regional
              </th>
              {weekDays.map(day => (
                <th key={day.dayNumber} class="px-2 py-3 text-center border-r border-slate-700 min-w-[200px]">
                  <div class="text-sm font-semibold text-slate-300">{day.dayName}</div>
                  <div class="text-2xl font-bold text-white">{day.dayNumber}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} class="border-t border-slate-700">
                <td class="px-4 py-3 border-r border-slate-700">
                  <div class="font-semibold text-white">{row.instructor}</div>
                  <div class="text-sm text-slate-300">{row.city}</div>
                  <div class="text-xs text-slate-400">{row.regional}</div>
                </td>
                {weekDays.map(day => (
                  <td key={`${row.id}-${day.dayNumber}`} class="p-2 border-r border-slate-700">
                    <div
                      ref={(el) => el && initializeSortable(el, row.id, day.dayNumber)}
                      data-sortable="true"
                      data-row-id={row.id}
                      data-day={day.dayNumber}
                      class="min-h-[100px] space-y-2 relative"
                    >
                      {(row.events[day.dayNumber] || []).map(event => (
                        <div
                          key={event.id}
                          data-event-id={event.id}
                          onClick={() => handleEventClick(event, row.id, day.dayNumber)}
                          class={`${event.color} p-2 rounded shadow cursor-pointer hover:opacity-90 transition-opacity`}
                        >
                          <div class="font-semibold">{event.title}</div>
                          {Array.isArray(event.details) ? (
                            event.details.map((detail, index) => (
                              <div key={index} class="text-sm">{detail}</div>
                            ))
                          ) : (
                            <div class="text-sm">{event.details}</div>
                          )}
                          {event.time && <div class="text-sm mt-1">{event.time}</div>}
                          {event.location && <div class="text-xs mt-1">{event.location}</div>}
                        </div>
                      ))}
                      {isAdminProp && (
                        <button
                          onClick={() => handleAddEvent(row.id, day.dayNumber)}
                          class="absolute bottom-0 left-0 right-0 py-1 px-2 bg-slate-600/50 text-slate-300 rounded hover:bg-slate-600 transition-colors text-sm"
                        >
                          + Agregar Evento
                        </button>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modales de edición y creación */}
      {editingEvent && (
        <EventCard
          event={editingEvent}
          rowId={editingRowId}
          day={editingDay}
          onClose={handleCloseEventEditor}
        />
      )}

      {addingEvent && (
        <AddEventCard
          rowId={addingEvent.rowId}
          day={addingEvent.day}
          onClose={handleCloseAddEvent}
        />
      )}
    </div>
  );
}