import { useState, useEffect } from 'preact/hooks';
import { 
  draftScheduleRows, 
  publishedScheduleRows, 
  draftGlobalConfig, 
  publishedGlobalConfig,
  selectedWeek,
  getFilteredRows,
  getFilteredRowsForMonth,
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
  
  // Aplicar filtros para vista mensual (considera todos los eventos del mes)
  const filteredRows = getFilteredRowsForMonth(scheduleRows, currentMonth, currentYear);

  // Obtener el título de la semana
  const weekTitle = isAdmin ? getWeekTitle(currentWeek.startDate, currentWeek.endDate) : getPublishedWeekTitle();

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

  // Detectar cuando headers sticky se compactan (solo móvil)
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return; // Solo para móviles

    const mobileContainer = document.querySelector('.mobile\\:hidden');
    if (!mobileContainer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const header = entry.target as HTMLElement;
          if (entry.boundingClientRect.top <= 1 && entry.intersectionRatio < 1) {
            header.classList.add('compacted');
          } else {
            header.classList.remove('compacted');
          }
        });
      },
      {
        root: mobileContainer,
        threshold: [0, 0.1, 0.9, 1],
        rootMargin: '-1px 0px 0px 0px',
      }
    );

    // Observar todos los headers sticky después de un pequeño delay
    const timeoutId = setTimeout(() => {
      const headers = document.querySelectorAll('.mobile\\:hidden .sticky');
      headers.forEach((header) => observer.observe(header));
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [currentMonth, currentYear]); // Usar currentMonth y currentYear en lugar de monthDays

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
        {/* Desktop Layout */}
        <div class={`hidden xl-custom:flex items-center justify-between transition-all duration-300 ${
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
              }`}>Cronograma Mensual Escuelas Colombia</h1>
              <p class={`text-slate-300 transition-all duration-300 text-center ${
                isScrolled ? 'mt-1 text-xs' : 'mt-2 text-lg first-letter:uppercase font-semibold  '
              }`}>
                {monthName} 
              </p>
            </div>
          </div>
          
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

        {/* Mobile Layout */}
        <div class={`xl-custom:hidden transition-all duration-300 ${
          isScrolled ? 'py-2 px-4' : 'py-4 px-4'
        }`}>
          {/* Logo y título - Centrados */}
          <div class="flex flex-col items-center justify-center mb-2">
            <div class="flex items-center space-x-3 mb-1">
              <img 
                src="/Imagen1.png" 
                alt="Logo Terpel" 
                class={`transition-all duration-300 ${
                  isScrolled ? 'h-10' : 'h-12'
                }`}
              />
            </div>
            <div class="text-center">
              <h1 class={`font-bold tracking-tight transition-all duration-300 ${
                isScrolled ? 'text-base' : 'text-lg'
              }`}>Cronograma Mensual</h1>
              <p class={`text-slate-300 transition-all duration-300 first-letter:uppercase font-semibold ${
                isScrolled ? 'text-xs' : 'text-xs'
              }`}>
                {monthName} 
              </p>
            </div>
          </div>
          
          {/* Botones de navegación centrados */}
          <div class="flex items-center justify-center space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              class="flex items-center justify-center px-4 py-1.5 bg-blue-600/90 text-white rounded-lg hover:bg-blue-700 transition-all active:scale-95 shadow-md"
              aria-label="Mes anterior"
            >
              <span class="text-base mr-1.5">←</span>
              <span class="text-xs font-medium">Anterior</span>
            </button>
            <button
              onClick={() => navigateMonth('next')}
              class="flex items-center justify-center px-4 py-1.5 bg-blue-600/90 text-white rounded-lg hover:bg-blue-700 transition-all active:scale-95 shadow-md"
              aria-label="Mes siguiente"
            >
              <span class="text-xs font-medium">Siguiente</span>
              <span class="text-base ml-1.5">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vista Desktop y Tablet - Grid de calendario */}
      <div class="hidden mobile:block monthly-scroll-container overflow-x-auto overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar">
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
                            {/* Solo mostrar regional si el evento NO es nacional */}
                            {!(event.location && (
                              event.location.toLowerCase().includes('nacional') ||
                              event.location.toLowerCase().includes('todas las regionales')
                            )) && (
                              <div class="text-xs opacity-80 mb-1">{regional}</div>
                            )}
                            
                            {event.modalidad && <div class="text-xs opacity-80">✏ {event.modalidad}</div>}
                            {event.time && <div class="text-xs opacity-80">⏰ {event.time.split(' a ')[0]}</div>}
                            {event.location && (
                              <div class="text-xs opacity-80">
                                {event.location.split('/').map((part: string, index: number): JSX.Element => (
                                  index === 0 ? (
                                    <span key={index}>{part.trim()}</span>
                                  ) : (
                                    <span key={index}>
                                      <br />📍 {part.trim()}
                                    </span>
                                  )
                                ))}
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

      {/* Vista Móvil (Solo Celulares) - Lista de días */}
      <div class="mobile:hidden overflow-y-auto max-h-[calc(100vh-260px)] custom-scrollbar px-4 py-1">
        {monthDays
          .filter(day => day.isCurrentMonth)
          .map(day => {
            const dayEvents = getEventsForDay(day.date);
            const hasEvents = dayEvents.length > 0;
            
            // Formatear fecha completa
            const dateObj = new Date(day.date + 'T00:00:00');
            const fullDateText = dateObj.toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            
            return (
              <div
                key={day.date}
                class={`mb-4 rounded-lg overflow-visible shadow-lg border-2 ${
                  day.isToday 
                    ? 'border-blue-500 bg-blue-900/30' 
                    : 'border-slate-600 bg-slate-800'
                } ${day.isWeekend ? 'opacity-75' : ''}`}
              >
                {/* Cabecera del día - STICKY Y RESPONSIVE */}
                <div 
                  class={`sticky top-0 z-10 px-4 py-2 transition-all duration-300 shadow-md ${
                    day.isToday 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700' 
                      : day.isWeekend 
                        ? 'bg-gradient-to-r from-slate-700 to-slate-600' 
                        : 'bg-gradient-to-r from-slate-600 to-slate-700'
                  }`}
                >
                  {/* Fecha completa */}
                  <div class="text-center text-sm text-slate-200 font-medium capitalize transition-all duration-300 full-date">
                    {fullDateText}
                  </div>
                  
                  {/* Badges */}
                  <div class="flex items-center justify-center space-x-2 mt-3 flex-wrap gap-2 transition-all duration-300 badges-container">
                    {day.isWeekend && (
                      <span class="text-xs bg-white/20 text-white px-3 py-1 rounded-full font-semibold">
                        🏖️ Fin de semana
                      </span>
                    )}
                    {day.isToday && (
                      <span class="text-xs bg-white text-blue-600 px-3 py-1 rounded-full font-bold animate-pulse">
                        📅 HOY
                      </span>
                    )}
                    {hasEvents && (
                      <span class="text-xs bg-green-500/20 text-green-300 px-3 py-1 rounded-full font-semibold">
                        {dayEvents.length} evento{dayEvents.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Eventos del día */}
                {hasEvents ? (
                  <div class="p-3 space-y-2">
                    {dayEvents.map(({ event, rowId, instructor, regional }) => (
                      <div
                        key={event.id}
                        onClick={() => handleEventClick(event, rowId, day.date)}
                        class="bg-slate-900/50 rounded-lg p-3 border border-slate-600 hover:border-slate-500 transition-all cursor-pointer active:scale-[0.98]"
                      >
                        {/* Header del evento con regional e instructor */}
                        <div class="flex items-start justify-between mb-2">
                          <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-1">
                              <span class="text-xl font-bold text-white">{regional}</span>
                              {event.confirmed ? (
                                <span class="text-xs bg-green-600 text-white px-2 py-0.5 rounded font-semibold">
                                  ✓ Confirmado
                                </span>
                              ) : (
                                <span class="text-xs bg-orange-600 text-white px-2 py-0.5 rounded font-semibold">
                                  ⏳ Pendiente
                                </span>
                              )}
                            </div>
                            <div class="text-sm text-slate-300 bg-slate-700 rounded-full px-3 py-1 inline-flex items-center">
                              <span class="mr-1">👨‍🏫</span>
                              {instructor}
                            </div>
                          </div>
                        </div>

                        {/* Contenido del evento */}
                        <div
                          class="rounded-lg p-3 mt-2"
                          style={{
                            backgroundColor: event.color,
                            color: getContrastTextColor(event.color)
                          }}
                        >
                          <div class="font-bold text-lg mb-1">{event.title}</div>
                          <div class="text-sm opacity-90 mb-2">
                            {Array.isArray(event.details) 
                              ? event.details.join(', ') 
                              : event.details}
                          </div>
                          
                          {/* Información adicional */}
                          <div class="text-xs opacity-80 space-y-1">
                            {event.modalidad && (
                              <div class="flex items-center">
                                <span class="mr-1">📍</span>
                                {event.modalidad}
                              </div>
                            )}
                            {!(event.location && (
                              event.location.toLowerCase().includes('nacional') || 
                              event.location.toLowerCase().includes('colombia')
                            )) && event.location && (
                              <div class="flex items-center">
                                <span class="mr-1">📌</span>
                                {event.location}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div class="p-6 text-center">
                    <div class="text-slate-500 text-sm">Sin eventos programados</div>
                    {isAdmin && !day.isWeekend && (
                      <button
                        onClick={() => {
                          const firstRow = filteredRows[0];
                          if (firstRow) {
                            handleAddEvent(firstRow.id, day.date);
                          }
                        }}
                        class="mt-3 px-4 py-2 bg-blue-600/80 text-white rounded-lg hover:bg-blue-600 transition-all text-sm font-medium"
                      >
                        + Agregar Evento
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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

// Agregar estilos CSS para headers compactados en scroll
if (typeof document !== 'undefined' && !document.getElementById('mobile-sticky-headers-style')) {
  const style = document.createElement('style');
  style.id = 'mobile-sticky-headers-style';
  style.textContent = `
    @media (max-width: 767px) {
      /* Estilos cuando el header es sticky y compacto */
      .mobile\\:hidden .sticky.compacted {
        padding-top: 0.5rem !important;
        padding-bottom: 0.5rem !important;
      }
      .mobile\\:hidden .sticky.compacted .day-number {
        font-size: 2rem !important;
        line-height: 1 !important;
        margin-bottom: 0.25rem !important;
      }
      .mobile\\:hidden .sticky.compacted .day-name {
        font-size: 0.875rem !important;
      }
      .mobile\\:hidden .sticky.compacted .full-date {
        display: none !important;
      }
      .mobile\\:hidden .sticky.compacted .badges-container {
        margin-top: 0.5rem !important;
      }
      .mobile\\:hidden .sticky.compacted .badges-container span {
        font-size: 0.65rem !important;
        padding: 0.125rem 0.5rem !important;
      }
    }
  `;
  document.head.appendChild(style);
}
