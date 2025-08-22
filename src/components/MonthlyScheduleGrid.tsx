import { useState, useEffect } from 'preact/hooks';
import { 
  draftScheduleRows, 
  publishedScheduleRows, 
  draftGlobalConfig, 
  publishedGlobalConfig,
  selectedWeek,
  getFilteredRows,
  formatDateDisplay,
  getWeekTitle,
  getPublishedWeekTitle,
  userViewMode,
  navigateMonth
} from '../stores/schedule';
import type { ScheduleRow, Event as ScheduleEvent } from '../stores/schedule';
import EventCard from './EventCard';
import AddEventCard from './AddEventCard';
import { getContrastTextColor } from '../lib/colors';
import type { JSX } from 'preact';

interface MonthlyScheduleGridProps {
  isAdmin: boolean;
}

interface MonthDay {
  date: string;
  dayNumber: number;
  isToday: boolean;
  isWeekend: boolean;
  isCurrentMonth: boolean;
  dayName: string;
}

export default function MonthlyScheduleGrid({ isAdmin }: MonthlyScheduleGridProps) {
  const [selectedEvent, setSelectedEvent] = useState<{event: ScheduleEvent, rowId: string, day: string} | null>(null);
  const [showAddEvent, setShowAddEvent] = useState<{rowId: string, day: string} | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Obtener datos según el modo (admin o usuario) - AHORA REACTIVO
  const scheduleRows = isAdmin ? draftScheduleRows.value : publishedScheduleRows.value;
  const globalConfig = isAdmin ? draftGlobalConfig.value : publishedGlobalConfig.value;
  const week = selectedWeek.value;
  const currentWeek = isAdmin ? globalConfig.currentWeek : week;
  
  // Aplicar filtros
  const filteredRows = getFilteredRows(scheduleRows);

  // Obtener el título de la semana
  const weekTitle = isAdmin ? getWeekTitle(currentWeek.startDate, currentWeek.endDate) : getPublishedWeekTitle();

  // NUEVA LÓGICA: Determinar el mes objetivo basado en la semana actual
  // Para la vista mensual, queremos mostrar el mes que contiene la mayoría de días de la semana
  const startDate = new Date(currentWeek.startDate);
  const endDate = new Date(currentWeek.endDate);
  
  // Contar días de cada mes en la semana
  const daysInStartMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate() - startDate.getDate() + 1;
  const daysInEndMonth = endDate.getDate();
  
  // Usar el mes que tenga más días en la semana
  let targetMonth, targetYear;
  if (daysInStartMonth >= daysInEndMonth) {
    targetMonth = startDate.getMonth();
    targetYear = startDate.getFullYear();
  } else {
    targetMonth = endDate.getMonth();
    targetYear = endDate.getFullYear();
  }
  
  const currentYear = targetYear;
  const currentMonth = targetMonth;

  // Detectar scroll para efectos visuales
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.scrollTop > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    const scrollContainer = document.querySelector('.monthly-scroll-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Generar días del mes
  const generateMonthDays = (): MonthDay[] => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = domingo
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Convertir para que lunes = 0
    
    const days: MonthDay[] = [];
    const today = new Date();
    
    // Días del mes anterior (para completar la primera semana)
    const prevMonth = new Date(currentYear, currentMonth, 0);
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const dayNumber = prevMonth.getDate() - i;
      const date = new Date(currentYear, currentMonth - 1, dayNumber);
      days.push({
        date: date.toISOString().split('T')[0],
        dayNumber,
        isToday: false,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isCurrentMonth: false,
        dayName: date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().replace('.', '')
      });
    }
    
    // Días del mes actual
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        dayNumber: day,
        isToday: dateStr === today.toISOString().split('T')[0],
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isCurrentMonth: true,
        dayName: date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().replace('.', '')
      });
    }
    
    // Días del mes siguiente (para completar la última semana)
    const totalCells = Math.ceil(days.length / 7) * 7;
    let nextMonthDay = 1;
    while (days.length < totalCells) {
      const date = new Date(currentYear, currentMonth + 1, nextMonthDay);
      days.push({
        date: date.toISOString().split('T')[0],
        dayNumber: nextMonthDay,
        isToday: false,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isCurrentMonth: false,
        dayName: date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().replace('.', '')
      });
      nextMonthDay++;
    }
    
    return days;
  };

  const monthDays = generateMonthDays();
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('es-ES', { 
    month: 'long', 
    year: 'numeric' 
  });

  // Obtener eventos para un día específico
  const getEventsForDay = (date: string): Array<{event: ScheduleEvent, rowId: string, instructor: string, regional: string}> => {
    const events: Array<{event: ScheduleEvent, rowId: string, instructor: string, regional: string}> = [];
    
    filteredRows.forEach(row => {
      const dayEvents = row.events[date] || [];
      dayEvents.forEach(event => {
        events.push({
          event,
          rowId: row.id,
          instructor: row.instructor,
          regional: row.regional
        });
      });
    });
    
    return events;
  };

  const handleEventClick = (event: ScheduleEvent, rowId: string, day: string) => {
    if (isAdmin) {
      setSelectedEvent({ event, rowId, day });
    }
  };

  const handleAddEvent = (rowId: string, day: string) => {
    if (isAdmin) {
      setShowAddEvent({ rowId, day });
    }
  };

  return (
    <div id="schedule-grid" class="bg-slate-800 text-white rounded-lg shadow-2xl overflow-hidden">
      {/* Encabezado con el mismo estilo que ScheduleGrid */}
      <div class="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 shadow-lg">
        <div class={`flex items-center justify-between transition-all duration-300 ${
          isScrolled ? 'py-3 px-4' : 'py-6 px-6'
        }`}>
          <div class="flex items-center space-x-6">
            <img 
              src="/Imagen1.png" 
              alt="Logo Terpel" 
              class={`transition-all duration-300 ${
                isScrolled ? 'h-16' : 'h-20'
              }`}
            />
            <div>
              <h1 class={`font-bold tracking-tight transition-all duration-300 text-center ${
                isScrolled ? 'text-xl' : 'text-3xl'
              }`}>{weekTitle} - Vista Mensual</h1>
              <p class={`text-slate-300 transition-all duration-300 text-center ${
                isScrolled ? 'mt-1 text-xs' : 'mt-2 text-sm'
              }`}>
                {monthName}
              </p>
            </div>
          </div>
          
          {/* Botones de navegación */}
          <div class="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              class="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              <span class="mr-1">←</span> Anterior
            </button>
            <button
              onClick={() => navigateMonth('next')}
              class="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              Siguiente <span class="ml-1">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenedor con scroll */}
      <div class="monthly-scroll-container overflow-x-auto overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar">
        {/* Encabezado de días de la semana con el mismo estilo */}
        <div class="grid grid-cols-7 bg-slate-700 sticky top-0 z-20 shadow-lg">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
            <div key={day} class={`text-center border-r border-slate-700 transition-all duration-300 ${
              isScrolled ? 'px-2 py-2' : 'px-2 py-3'
            }`}>
              <div class={`font-semibold text-slate-300 transition-all duration-300 ${
                isScrolled ? 'text-xs' : 'text-sm'
              }`}>{day}</div>
            </div>
          ))}
        </div>

        {/* Grid del calendario por semanas */}
        <div class="grid grid-rows-auto">
          {Array.from({ length: Math.ceil(monthDays.length / 7) }, (_, weekIndex) => {
            const weekDays = monthDays.slice(weekIndex * 7, (weekIndex + 1) * 7);
            
            return (
              <div key={weekIndex} class="grid grid-cols-7 border-t border-slate-700">
                {weekDays.map((day, dayIndex) => {
                  const dayEvents = getEventsForDay(day.date);
                  
                  return (
                    <div
                      key={`${day.date}-${dayIndex}`}
                      class={`min-h-[140px] border-r border-slate-700 last:border-r-0 p-2 ${
                        day.isCurrentMonth 
                          ? 'bg-slate-800' 
                          : 'bg-slate-900/50'
                      } ${
                        day.isToday 
                          ? 'bg-blue-900/30 ring-2 ring-blue-400' 
                          : ''
                      } ${
                        day.isWeekend && day.isCurrentMonth
                          ? 'bg-slate-900/70'
                          : ''
                      }`}
                    >
                      {/* Número del día con estilo similar al ScheduleGrid */}
                      <div class={`text-center mb-2 ${
                        day.isCurrentMonth 
                          ? day.isToday 
                            ? 'text-blue-400 font-bold text-lg' 
                            : 'text-white font-bold text-lg'
                          : 'text-slate-500 text-sm'
                      }`}>
                        <div class={`font-semibold text-slate-300 text-xs ${
                          !day.isCurrentMonth ? 'opacity-50' : ''
                        }`}>{day.dayName}</div>
                        <div class="font-bold">{day.dayNumber}</div>
                      </div>

                      {/* Eventos del día con el mismo estilo que ScheduleGrid */}
                      <div class="space-y-1">
                        {dayEvents.map(({ event, rowId, instructor, regional }) => (
                          <div
                            key={event.id}
                            onClick={() => handleEventClick(event, rowId, day.date)}
                            class="p-2 rounded shadow cursor-pointer hover:opacity-90 transition-all duration-200 hover:scale-[1.02] relative group select-none text-center"
                            style={{
                              backgroundColor: event.color,
                              color: getContrastTextColor(event.color)
                            }}
                          >
                            {/* Indicador de confirmación */}
                            <div class="absolute top-1 left-1">
                              {event.confirmed ? (
                                <span class="inline-block w-3 h-3 text-green-400 bg-gray-500 rounded-sm font-bold justify-center text-xs leading-none" title="Evento Confirmado">
                                  ✓
                                </span>
                              ) : (
                                <span class="inline-block w-3 h-3 text-orange-400 font-bold bg-gray-500 rounded-sm justify-center text-xs leading-none" title="Pendiente de Confirmación">
                                  ⏳
                                </span>
                              )}
                            </div>
                            
                            <div class="font-semibold text-xs mb-1">{event.title}</div>
                            <div class="text-xs opacity-90 mb-1">{event.details}</div>
                            <div class="text-xs opacity-80 mb-1">{regional}</div>
                            
                            {event.modalidad && <div class="text-xs opacity-80">✏ {event.modalidad}</div>}
                            {event.time && <div class="text-xs opacity-80">⏰ {event.time.split(' a ')[0]}</div>}
                            {event.location && (
                              <div class="text-xs opacity-80">
                                📍 {event.location.split('/')[0].trim()}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Botón para agregar evento (solo admin y días laborales) */}
                        {isAdmin && day.isCurrentMonth && !day.isWeekend && dayEvents.length === 0 && (
                          <button
                            onClick={() => {
                              // Usar el primer instructor disponible
                              const firstRow = filteredRows[0];
                              if (firstRow) {
                                handleAddEvent(firstRow.id, day.date);
                              }
                            }}
                            class="w-full py-1 px-2 bg-slate-600/70 text-slate-300 rounded hover:bg-slate-600 hover:text-white transition-all duration-200 text-xs backdrop-blur-sm border border-slate-500/30 hover:border-slate-400"
                          >
                            + Agregar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modales con el mismo estilo */}
      {selectedEvent && (
        <div 
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedEvent(null);
            }
          }}
        >
          <div class="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <EventCard
              event={selectedEvent.event}
              rowId={selectedEvent.rowId}
              day={selectedEvent.day}
              onClose={() => setSelectedEvent(null)}
            />
          </div>
        </div>
      )}

      {showAddEvent && (
        <div 
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddEvent(null);
            }
          }}
        >
          <div class="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <AddEventCard
              rowId={showAddEvent.rowId}
              day={showAddEvent.day}
              onClose={() => setShowAddEvent(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
