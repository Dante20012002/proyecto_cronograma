import { useState, useEffect } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import Sortable from 'sortablejs';
import { 
  draftScheduleRows, 
  publishedScheduleRows,
  draftGlobalConfig,
  publishedGlobalConfig,
  moveEvent, 
  copyEvent 
} from '../stores/schedule';
import EventCard from './EventCard';
import AddEventCard from './AddEventCard';

interface ScheduleGridProps {
  isAdmin: boolean;
}

export default function ScheduleGrid({ isAdmin }: ScheduleGridProps) {
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [editingRowId, setEditingRowId] = useState<string>('');
  const [editingDay, setEditingDay] = useState<string>('');
  const [addingEvent, setAddingEvent] = useState<{rowId: string, day: string} | null>(null);
  
  // Seleccionar el store correcto basado en el rol
  const rows = useStore(isAdmin ? draftScheduleRows : publishedScheduleRows);
  const config = useStore(isAdmin ? draftGlobalConfig : publishedGlobalConfig);

  // Generar días de la semana basados en la configuración
  const getWeekDays = () => {
    const days = [];
    const startDate = new Date(config.currentWeek.startDate + 'T00:00:00');
    
    for (let i = 0; i < 5; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      days.push({
        date: currentDate,
        dayNumber: currentDate.getDate().toString(),
        dayName: currentDate.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().replace('.', '')
      });
    }
    
    return days;
  };

  const weekDays = getWeekDays();

  const handleEventClick = (event: any, rowId: string, day: string) => {
    if (!isAdmin) return; // No permitir edición si no es admin
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
    if (!isAdmin) return; // No permitir agregar si no es admin
    setAddingEvent({ rowId, day });
  };

  const handleCloseAddEvent = () => {
    setAddingEvent(null);
  };

  const handleDrop = (evt: any, toRowId: string, toDay: string) => {
    if (!isAdmin) return;
    const eventId = evt.item.getAttribute('data-event-id');
    const fromRowId = evt.from.getAttribute('data-row-id');
    const fromDay = evt.from.getAttribute('data-day');
    const isCopy = evt.originalEvent.ctrlKey || evt.originalEvent.metaKey;

    if (isCopy) {
      copyEvent(eventId, fromRowId, fromDay, toRowId, toDay);
    } else {
      moveEvent(eventId, fromRowId, fromDay, toRowId, toDay);
    }
  };

  const initializeSortable = (element: HTMLElement, rowId: string, day: string) => {
    if (element && isAdmin) { // Solo inicializar sortable si es admin
      Sortable.create(element, {
        group: 'events',
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onEnd: (evt) => handleDrop(evt, rowId, day)
      });
    }
  };

  return (
    <div id="schedule-grid" class="bg-slate-800 rounded-lg shadow-xl overflow-hidden text-white">
      {/* Header con título dinámico */}
      <div class="bg-slate-900 text-white p-6">
        <h1 class="text-3xl font-bold text-center tracking-tight">{config.title}</h1>
        <p class="text-center text-slate-300 mt-2">
          {new Date(config.currentWeek.startDate + 'T00:00:00').toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'long'
          })} - {new Date(config.currentWeek.endDate + 'T00:00:00').toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}
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
              {weekDays.map((day) => (
                <th key={day.dayNumber} class="px-4 py-3 text-center text-sm font-medium text-slate-400 border-r border-slate-700 min-w-[200px] align-top">
                  <div class="flex flex-col">
                    <span>{day.dayName}</span>
                    <span class="text-2xl font-bold text-white">{day.dayNumber}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody class="bg-slate-800">
            {rows.map((row) => (
              <tr key={row.id} class="border-t border-slate-700">
                <td class="p-4 border-r border-slate-700 align-top bg-slate-900/50">
                  <div class="font-semibold text-white">{row.instructor}</div>
                  <div class="text-sm text-slate-400">{row.city}</div>
                  <div class="mt-1">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
                      {row.regional}
                    </span>
                  </div>
                </td>
                {weekDays.map((day) => (
                  <td key={day.dayNumber} class="p-2 border-r border-slate-700 min-h-[120px] align-top">
                    <div
                      ref={(el) => el && initializeSortable(el, row.id, day.dayNumber)}
                      data-row-id={row.id}
                      data-day={day.dayNumber}
                      class={`min-h-[100px] space-y-2 ${isAdmin ? '' : 'no-drag'}`}
                    >
                      {row.events[day.dayNumber]?.map((event) => (
                        <div
                          key={event.id}
                          data-event-id={event.id}
                          class={`${event.color} rounded-lg p-3 text-white shadow-md ${isAdmin ? 'cursor-pointer hover:scale-105 transition-transform' : 'cursor-default'}`}
                          onClick={() => handleEventClick(event, row.id, day.dayNumber)}
                        >
                          <p class="font-bold text-sm">{event.title}</p>
                          {Array.isArray(event.details) ? (
                            <div class="text-xs mt-2 space-y-1 text-white/90">
                              {event.details.map((detail, index) => (
                                <p key={index}>{detail}</p>
                              ))}
                            </div>
                          ) : (
                            <p class="text-xs mt-2 text-white/90">{event.details}</p>
                          )}
                          {event.time && <p class="text-xs mt-3 text-white/70">{event.time}</p>}
                          <div class="flex-grow"></div>
                          <p class="text-xs mt-2 font-semibold text-white/80 text-center">{event.location}</p>
                        </div>
                      ))}
                      
                      {/* Botón para agregar evento (solo en modo admin) */}
                      {isAdmin && (
                        <button
                          onClick={() => handleAddEvent(row.id, day.dayNumber)}
                          class="w-full p-2 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors text-sm"
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

      {/* Modal de edición de evento, solo disponible para admin */}
      {isAdmin && editingEvent && (
        <EventCard
          event={editingEvent}
          rowId={editingRowId}
          day={editingDay}
          onClose={handleCloseEventEditor}
        />
      )}

      {/* Modal para agregar nuevo evento, solo disponible para admin */}
      {isAdmin && addingEvent && (
        <AddEventCard
          rowId={addingEvent.rowId}
          day={addingEvent.day}
          onClose={handleCloseAddEvent}
        />
      )}
    </div>
  );
} 