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
  copyEventInSameCell,
  formatDateDisplay,
  updateEvent,
  addEvent as addScheduleEvent,
  getWeekTitle,
  getPublishedWeekTitle,
  getFilteredRows,
  navigateWeek
} from '../stores/schedule';
import EventCard from './EventCard';
import AddEventCard from './AddEventCard';
import type { JSX } from 'preact';
import type { ScheduleEvent, ScheduleRow } from '../types/schedule';
import { hexToStyle, getContrastTextColor } from '../lib/colors';

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
  const [moveNotification, setMoveNotification] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    eventId: string;
    rowId: string;
    day: string;
  } | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const sortableRefs = useRef<{ [key: string]: Sortable | null }>({});
  
  // Seleccionar el store correcto basado en el rol y aplicar filtros
  const allRows = isAdminProp ? draftScheduleRows.value : publishedScheduleRows.value;
  const rows = getFilteredRows(allRows);
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

        // Formatear la fecha completa para usar como clave
        const fullDate = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
        
        days.push({
          date: currentDate,
          dayNumber: currentDate.getDate().toString(),
          dayName: currentDate.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().replace('.', ''),
          fullDate: fullDate // Nueva propiedad para fecha completa
        });
      }
      
      return days;
    } catch (error) {
      console.error('Error al generar días de la semana:', error);
      return [];
    }
  };

  const weekDays = getWeekDays();

  // Función para convertir hora a minutos para ordenamiento
  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 9999; // Eventos sin hora van al final
    
    try {
      // Extraer la hora de inicio si es un rango "HH:MM a.m./p.m. a HH:MM a.m./p.m."
      const startTime = timeStr.includes(' a ') ? timeStr.split(' a ')[0] : timeStr;
      
      // Limpiar y normalizar el formato
      const normalizedTime = startTime.toLowerCase().replace(/\s+/g, ' ').trim();
      const parts = normalizedTime.split(' ');
      
      if (parts.length < 2) {
        console.warn(`⚠️ Formato de hora inválido: ${timeStr}`);
        return 9999;
      }
      
      const [time, period] = parts;
      const timeParts = time.split(':');
      
      if (timeParts.length < 2) {
        console.warn(`⚠️ No se pudo parsear la hora: ${timeStr}`);
        return 9999;
      }
      
      const hours = parseInt(timeParts[0]);
      const minutes = parseInt(timeParts[1]) || 0;
      
      // Convertir a formato 24 horas
      let totalMinutes = (hours % 12) * 60 + minutes;
      if (period === 'p.m.' && hours !== 12) {
        totalMinutes += 12 * 60;
      } else if (period === 'a.m.' && hours === 12) {
        totalMinutes = minutes;
      }
      
      return totalMinutes;
    } catch (error) {
      console.warn(`⚠️ Error al convertir hora ${timeStr}:`, error);
      return 9999;
    }
  };

  // Función para filtrar y ordenar eventos por fecha completa
  const getEventsForDate = (row: any, dayNumber: string, fullDate: string) => {
    // Intentar obtener eventos por fecha completa (nuevo formato)
    const eventsByFullDate = row.events[fullDate] || [];
    
    // Para compatibilidad, también obtener eventos por día del mes (formato anterior)
    const eventsByDay = row.events[dayNumber] || [];
    
    // Combinar ambos formatos y deduplicar por ID
    const allEvents = [...eventsByFullDate, ...eventsByDay];
    const uniqueEvents = allEvents.filter((event, index, self) => 
      index === self.findIndex(e => e.id === event.id)
    );
    
    // Ordenar eventos cronológicamente
    const sortedEvents = uniqueEvents.sort((a, b) => {
      const timeA = timeToMinutes(a.time || '');
      const timeB = timeToMinutes(b.time || '');
      
      // Ordenar por hora (eventos sin hora van al final)
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      
      // Si tienen la misma hora, ordenar por título
      return a.title.localeCompare(b.title);
    });
    
    return sortedEvents;
  };

  const handleEventClick = (event: ScheduleEvent, rowId: string, day: string) => {
    if (!isAdminProp) {
      return;
    }
    
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

  const handleRightClick = (e: MouseEvent, eventId: string, rowId: string, day: string) => {
    // Solo mostrar menú contextual para administradores
    if (!isAdminProp) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      eventId,
      rowId,
      day
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleCopyEvent = () => {
    if (!contextMenu) return;
    
    const result = copyEventInSameCell(contextMenu.eventId, contextMenu.rowId, contextMenu.day);
    
    if (result?.success) {
      setMoveNotification(`✅ ${result.message}`);
      
      // Forzar reinicialización de SortableJS después de copiar
      // para asegurar que el nuevo elemento sea reconocido
      setTimeout(() => {
        const key = `${contextMenu.rowId}-${contextMenu.day}`;
        const element = document.querySelector(`[data-row-id="${contextMenu.rowId}"][data-day="${contextMenu.day}"]`);
        
        if (element instanceof HTMLElement && sortableRefs.current[key]) {
          try {
            sortableRefs.current[key]?.destroy();
            sortableRefs.current[key] = null;
            const cleanup = initializeSortable(element, contextMenu.rowId, contextMenu.day);
          } catch (error) {
            // Error en reinicialización después de copiar
          }
        }
      }, 200);
    } else {
      setMoveNotification(`❌ Error: ${result?.error || 'Error desconocido'}`);
    }
    
    setContextMenu(null);
  };

  const handleDrop = async (evt: Sortable.SortableEvent) => {
    if (!isAdminProp) return;
    
    // Prevenir manipulación automática del DOM por SortableJS
    if (evt.preventDefault) {
      evt.preventDefault();
    }
    
    // Pequeño delay para asegurar que SortableJS termine sus operaciones
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const eventId = evt.item.getAttribute('data-event-id');
    if (!eventId) {
      setMoveNotification('❌ Error: ID de evento no encontrado');
      return;
    }

    const fromRowId = evt.from.getAttribute('data-row-id');
    const fromDay = evt.from.getAttribute('data-day');
    
    // IMPORTANTE: Obtener destino real basado en evt.to (donde se soltó realmente)
    const toRowId = evt.to.getAttribute('data-row-id');
    const toDay = evt.to.getAttribute('data-day');
    
    // Validar que tenemos todos los datos necesarios
    if (!fromRowId || !fromDay || !toRowId || !toDay) {
      setMoveNotification('❌ Error: Datos incompletos');
      return;
    }
    
    // Solo mover si es diferente posición
    if (fromRowId !== toRowId || fromDay !== toDay) {
      try {
        moveEvent(eventId, fromRowId, fromDay, toRowId, toDay);
        setMoveNotification('✅ Evento movido correctamente');
      } catch (error) {
        setMoveNotification('❌ Error al mover evento');
      }
    }
  };

  const initializeSortable = (element: HTMLElement, rowId: string, day: string) => {
    if (!element || !isAdminProp) return null;
    
    const key = `${rowId}-${day}`;
    
    // Si ya existe una instancia, destruirla primero
    if (sortableRefs.current[key]) {
      try {
        sortableRefs.current[key]?.destroy();
      } catch (error) {
        // Error al destruir instancia SortableJS
      }
      sortableRefs.current[key] = null;
    }
    
    try {
      const sortableInstance = Sortable.create(element, {
        group: {
          name: 'events',
          pull: true,
          put: true
        },
        sort: false, // Desactivar ordenamiento automático para evitar clonación
        animation: 200,
        delay: 150, // Aumentar delay para evitar conflictos con click
        delayOnTouchOnly: true, // Solo aplicar delay en touch devices
        touchStartThreshold: 5,
        forceFallback: false, // Desactivar fallback para mejor compatibilidad
        fallbackClass: 'sortable-fallback',
        dragClass: 'sortable-drag',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        preventOnFilter: false,
        filter: '.no-drag', // Elementos que no se pueden arrastrar
        onStart: (evt) => {
          // Agregar clase para prevenir selección de texto
          document.body.classList.add('dragging');
          
          // Deshabilitar selección de texto durante el drag
          document.body.style.userSelect = 'none';
          evt.item.style.userSelect = 'none';
          
          // Agregar clase visual
          evt.item.classList.add('opacity-75');
        },
        onMove: (evt) => {
          // Feedback visual cuando se mueve sobre una celda válida
          const target = evt.to;
          const targetRowId = target.getAttribute('data-row-id');
          const targetDay = target.getAttribute('data-day');
          
          if (targetRowId && targetDay) {
            return true; // Permitir drop
          }
          return false; // No permitir drop
        },
        onAdd: (evt) => {
          // Evitar manipulación automática del DOM
          evt.preventDefault && evt.preventDefault();
          return false;
        },
        onRemove: (evt) => {
          // Evento removido de celda original
        },
        onChange: (evt) => {
          // Orden cambiado dentro de la misma celda
        },
        onEnd: (evt) => {
          // Limpiar clases y estilos
          document.body.classList.remove('dragging');
          document.body.style.userSelect = '';
          evt.item.classList.remove('opacity-75');
          
          // Manejar el drop manualmente
          handleDrop(evt);
        }
      });
      
      sortableRefs.current[key] = sortableInstance;
      
      return () => {
        try {
          if (sortableRefs.current[key]) {
            sortableRefs.current[key]?.destroy();
        sortableRefs.current[key] = null;
          }
        } catch (error) {
          // Error al limpiar instancia SortableJS
        }
      };
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    // Limpiar todas las instancias existentes primero
    Object.entries(sortableRefs.current).forEach(([key, instance]) => {
      if (instance) {
        try {
          instance.destroy();
        } catch (error) {
          // Error al destruir instancia
        }
      }
    });
    
    // Limpiar referencias
    sortableRefs.current = {};
    
    // Pequeño delay para asegurar que el DOM esté actualizado
    const timeoutId = setTimeout(() => {
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

      // Guardar las funciones de limpieza para el próximo ciclo
      return () => {
        cleanupFns.forEach(fn => fn());
      };
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      // Limpiar todas las instancias al desmontar
      Object.values(sortableRefs.current).forEach(instance => {
        if (instance) {
          try {
            instance.destroy();
          } catch (error) {
            // Error al destruir instancia en cleanup
          }
        }
      });
      sortableRefs.current = {};
    };
  }, [rows]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingEvent) {
          handleCloseEventEditor();
        } else if (addingEvent) {
          handleCloseAddEvent();
        } else if (contextMenu) {
          handleCloseContextMenu();
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu) {
        handleCloseContextMenu();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [editingEvent, addingEvent, contextMenu]);

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (moveNotification) {
      const timer = setTimeout(() => {
        setMoveNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [moveNotification]);

  // Detectar scroll para reducir tamaño de headers
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const scrollTop = target.scrollTop;
      
      // Considerar "scrolled" cuando se ha desplazado más de 10px
      const shouldBeScrolled = scrollTop > 10;
      
      if (shouldBeScrolled !== isScrolled) {
        setIsScrolled(shouldBeScrolled);
      }
    };

    // Agregar listener al contenedor de scroll
    const scrollContainer = document.querySelector('.custom-scrollbar');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [isScrolled]);

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
  }, [currentWeek]); // Usar currentWeek en lugar de weekDays

  // Obtener el título específico de la semana actual
  const weekTitle = isAdminProp 
    ? getWeekTitle(currentWeek.startDate, currentWeek.endDate)
    : getPublishedWeekTitle();

  return (
    <div id="schedule-grid" class="bg-slate-800 rounded-lg shadow-xl text-white relative">
      {/* Header con título dinámico por semana - STICKY */}
      <div class={`bg-slate-900 text-white sticky top-0 z-20 shadow-lg transition-all duration-300 ${
        isScrolled ? 'p-3' : 'p-6'
      }`}>
        {/* Desktop Layout */}
        <div class="hidden xl-custom:flex items-center justify-between">
          <div class="flex items-center space-x-4">
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
              }`}>{weekTitle}</h1>
              <p class={`text-slate-300 transition-all font-semibold duration-300 text-center ${
                isScrolled ? 'mt-1 text-lg' : 'mt-2 text-lg'
              }`}>
                {formatDateDisplay(currentWeek.startDate)} - {formatDateDisplay(currentWeek.endDate)}
              </p>
            </div>
          </div>
          
          <div class="flex items-center space-x-2">
            <button
              onClick={() => navigateWeek('prev')}
              class="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              <span class="mr-1">←</span> Anterior
            </button>
            <button
              onClick={() => navigateWeek('next')}
              class="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              Siguiente <span class="ml-1">→</span>
            </button>
          </div>
        </div>

        {/* Mobile Layout */}
        <div class="xl-custom:hidden">
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
              }`}>{weekTitle}</h1>
              <p class={`text-slate-300 transition-all font-semibold duration-300 ${
                isScrolled ? 'text-xs' : 'text-xs'
              }`}>
                {formatDateDisplay(currentWeek.startDate)} - {formatDateDisplay(currentWeek.endDate)}
              </p>
            </div>
          </div>
          
          {/* Botones de navegación centrados */}
          <div class="flex items-center justify-center space-x-2">
            <button
              onClick={() => navigateWeek('prev')}
              class="flex items-center justify-center px-4 py-1.5 bg-blue-600/90 text-white rounded-lg hover:bg-blue-700 transition-all active:scale-95 shadow-md"
              aria-label="Semana anterior"
            >
              <span class="text-base mr-1.5">←</span>
              <span class="text-xs font-medium">Anterior</span>
            </button>
            <button
              onClick={() => navigateWeek('next')}
              class="flex items-center justify-center px-4 py-1.5 bg-blue-600/90 text-white rounded-lg hover:bg-blue-700 transition-all active:scale-95 shadow-md"
              aria-label="Semana siguiente"
            >
              <span class="text-xs font-medium">Siguiente</span>
              <span class="text-base ml-1.5">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vista Desktop y Tablet - Tabla */}
      <div class="hidden mobile:block overflow-x-auto overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar">
        <table class="w-full">
          <thead class="bg-slate-700 sticky top-0 z-20 shadow-lg">
            <tr>
              <th class={`text-center text-sm font-semibold text-slate-300 border-r border-slate-700 min-w-[250px] align-top bg-slate-700 transition-all duration-300 ${
                isScrolled ? 'px-3 py-2' : 'px-4 py-3'
              }`}>
                Regional / Instructor
              </th>
              {weekDays.map(day => (
                <th key={day.dayNumber} class={`text-center border-r border-slate-700 min-w-[200px] bg-slate-700 transition-all duration-300 ${
                  isScrolled ? 'px-2 py-2' : 'px-2 py-3'
                }`}>
                  <div class={`font-semibold text-slate-300 transition-all duration-300 ${
                    isScrolled ? 'text-xs' : 'text-sm'
                  }`}>{day.dayName}</div>
                  <div class={`font-bold text-white transition-all duration-300 ${
                    isScrolled ? 'text-lg' : 'text-2xl'
                  }`}>{day.dayNumber}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} class="border-t border-slate-700">
                <td class="px-4 py-3 border-r border-slate-700 text-center">
                  <div class="text-xl text-white font-bold pb-2">{row.regional}</div>
                  <div class="font-semibold text-black rounded-full bg-slate-400 p-2">👨‍🏫 {row.instructor}</div>
                </td>
                {weekDays.map(day => (
                  <td key={`${row.id}-${day.dayNumber}`} class="p-2 border-r border-slate-700">
                    <div
                      data-sortable="true"
                      data-row-id={row.id}
                      data-day={day.dayNumber}
                      data-full-date={day.fullDate}
                      class="min-h-[100px] space-y-2 relative"
                    >
                      {getEventsForDate(row, day.dayNumber, day.fullDate).map(event => (
                        <div
                          key={`${row.id}-${day.dayNumber}-${event.id}`}
                          data-event-id={event.id}
                          onClick={() => handleEventClick(event, row.id, day.dayNumber)}
                          onContextMenu={(e) => handleRightClick(e, event.id, row.id, day.dayNumber)}
                          onMouseDown={(e) => {
                            // Prevenir selección de texto al hacer click
                            if (e.detail > 1) {
                              e.preventDefault();
                            }
                          }}
                          class="p-2 rounded shadow cursor-grab hover:opacity-90 transition-all duration-200 hover:scale-[1.02] relative group select-none text-center"
                          style={{
                            backgroundColor: event.color,
                            color: getContrastTextColor(event.color)
                          }}
                        >
                          {/* Handle de drag visible al hacer hover */}
                          <div class="absolute top-1 right-1 drag-handle pointer-events-none">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                            </svg>
                          </div>
                          
                          <div class="font-semibold">{event.title}</div>
                          {Array.isArray(event.details) ? (
                            event.details.map((detail: string, index: number) => (
                              <div key={`${row.id}-${day.dayNumber}-${event.id}-detail-${index}`} class="text-sm">{detail}</div>
                            ))
                          ) : (
                            <div class="text-sm font-semibold">{event.details}</div>
                          )}
                          {event.modalidad && <div class="text-sm mt-1 opacity-80">✏ {event.modalidad}</div>}
                          {event.time && <div class="text-sm mt-1">⏰ {event.time}</div>}
                          {event.location && (
                            <div class="text-xs mt-1 font-bold">
                              {event.location.includes('/') ? (
                                // Si tiene "/", mostrar la primera parte normal y la segunda con el emoji
                                event.location.split('/').map((part: string, index: number): JSX.Element => (
                                  index === 0 ? (
                                    <span key={index}>{part.trim()}</span>
                                  ) : (
                                    <span key={index}>
                                      <br />📍 {part.trim()}
                                    </span>
                                  )
                                ))
                              ) : (
                                // Si no tiene "/", mostrar la ubicación completa con el emoji
                                <span>📍 {event.location.trim()}</span>
                              )}
                            </div>
                          )}
                          
                          {/* Indicador de confirmación */}
                          <div class="absolute top-1 left-1">
                            {event.confirmed ? (
                              <span class="inline-block w-4 h-4 p-1 text-green-500 font-bold text-xs bg-gray-500 rounded-sm justify-center leading-none" title="Evento Confirmado">
                                ✓
                              </span>
                            ) : (
                              <span class="inline-block w-4 h-4 text-orange-500 font-bold text-xs bg-gray-500 rounded-sm justify-center leading-none" title="Pendiente de Confirmación">
                                ⏳
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {isAdminProp && (
                        <button
                          onClick={() => handleAddEvent(row.id, day.dayNumber)}
                          class="no-drag w-full mt-2 py-2 px-2 bg-slate-600/70 text-slate-300 rounded hover:bg-slate-600 hover:text-white transition-all duration-200 text-sm backdrop-blur-sm border border-slate-500/30 hover:border-slate-400"
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

      {/* Vista Móvil (Solo Celulares) - Lista por días */}
      <div class="mobile:hidden overflow-y-auto max-h-[calc(100vh-260px)] custom-scrollbar px-4 py-1">
        {weekDays.map(day => {
          const isToday = day.fullDate === new Date().toISOString().split('T')[0];
          const isWeekend = day.dayName === 'Sáb' || day.dayName === 'Dom';
          
          // Formatear fecha completa
          const dateObj = new Date(day.fullDate + 'T00:00:00');
          const fullDateText = dateObj.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          
          // Contar eventos del día
          const totalEvents = rows.reduce((count, row) => {
            return count + getEventsForDate(row, day.dayNumber, day.fullDate).length;
          }, 0);
          
          return (
            <div
              key={day.dayNumber}
              class={`mb-4 rounded-lg overflow-visible shadow-lg border-2 ${
                isToday 
                  ? 'border-blue-500 bg-blue-900/30' 
                  : 'border-slate-600 bg-slate-800'
              } ${isWeekend ? 'opacity-75' : ''}`}
            >
              {/* Cabecera del día - STICKY Y RESPONSIVE */}
              <div 
                class={`sticky top-0 z-10 px-4 py-4 transition-all duration-300 rounded-t-lg shadow-md ${
                  isToday 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700' 
                    : isWeekend 
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
                  {isWeekend && (
                    <span class="text-xs bg-white/20 text-white px-3 py-1 rounded-full font-semibold">
                      🏖️ Fin de semana
                    </span>
                  )}
                  {isToday && (
                    <span class="text-xs bg-white text-blue-600 px-3 py-1 rounded-full font-bold animate-pulse">
                      📅 HOY
                    </span>
                  )}
                  {totalEvents > 0 && (
                    <span class="text-xs bg-green-500/20 text-green-300 px-3 py-1 rounded-full font-semibold">
                      {totalEvents} evento{totalEvents !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Eventos del día agrupados por regional/instructor */}
              <div class="p-3 space-y-3">
                {rows.map(row => {
                  const dayEvents = getEventsForDate(row, day.dayNumber, day.fullDate);
                  
                  if (dayEvents.length === 0) return null;
                  
                  return (
                    <div key={row.id} class="bg-slate-900/50 rounded-lg p-3 border border-slate-600">
                      {/* Header con regional e instructor */}
                      <div class="mb-2 pb-2 border-b border-slate-600">
                        <div class="text-xl font-bold text-white mb-1">{row.regional}</div>
                        <div class="text-sm text-slate-300 bg-slate-700 rounded-full px-3 py-1 inline-flex items-center">
                          <span class="mr-1">👨‍🏫</span>
                          {row.instructor}
                        </div>
                      </div>

                      {/* Eventos de este instructor en este día */}
                      <div class="space-y-2">
                        {dayEvents.map(event => (
                          <div
                            key={event.id}
                            onClick={() => handleEventClick(event, row.id, day.dayNumber)}
                            class="rounded-lg p-3 cursor-pointer hover:opacity-90 transition-all active:scale-[0.98]"
                            style={{
                              backgroundColor: event.color,
                              color: getContrastTextColor(event.color)
                            }}
                          >
                            {/* Estado del evento */}
                            <div class="flex items-center justify-between mb-2">
                              <div class="font-bold text-lg">{event.title}</div>
                              {event.confirmed ? (
                                <span class="text-xs bg-white/20 px-2 py-1 rounded font-semibold">
                                  ✓ Confirmado
                                </span>
                              ) : (
                                <span class="text-xs bg-white/20 px-2 py-1 rounded font-semibold">
                                  ⏳ Pendiente
                                </span>
                              )}
                            </div>

                            {/* Detalles */}
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
                              {event.time && (
                                <div class="flex items-center">
                                  <span class="mr-1">🕐</span>
                                  {event.time}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Si no hay eventos en este día */}
                {rows.every(row => getEventsForDate(row, day.dayNumber, day.fullDate).length === 0) && (
                  <div class="text-center py-6 text-slate-500 text-sm">
                    Sin eventos programados para este día
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modales de edición y creación */}
      {editingEvent && (
        <div 
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseEventEditor();
            }
          }}
        >
          <div class="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <EventCard
          event={editingEvent}
          rowId={editingRowId}
          day={editingDay}
          onClose={handleCloseEventEditor}
        />
          </div>
        </div>
      )}

      {addingEvent && (
        <div 
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseAddEvent();
            }
          }}
        >
          <div class="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <AddEventCard
          rowId={addingEvent.rowId}
          day={addingEvent.day}
          onClose={handleCloseAddEvent}
        />
          </div>
        </div>
      )}

      {/* Menú contextual */}
      {contextMenu && (
        <div
          class="context-menu"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleCopyEvent}
            class="context-menu-item"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
            Copiar evento
          </button>
        </div>
      )}

      {/* Notificación de movimiento exitoso */}
      {moveNotification && (
        <div class="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
          {moveNotification}
        </div>
      )}
    </div>
  );
}

// Agregar estilos CSS para headers compactados en scroll (solo móvil)
if (typeof document !== 'undefined' && !document.getElementById('schedule-mobile-sticky-style')) {
  const style = document.createElement('style');
  style.id = 'schedule-mobile-sticky-style';
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