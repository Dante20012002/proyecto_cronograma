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
    
    // Log para debugging (solo en modo admin)
    if (isAdminProp && sortedEvents.length > 0) {
      console.log(`📅 Eventos ordenados para día ${dayNumber} (${fullDate}):`, {
        fullDateEvents: eventsByFullDate.length,
        dayEvents: eventsByDay.length,
        totalUnique: uniqueEvents.length,
        sortedEvents: sortedEvents.map(e => ({ 
          id: e.id, 
          title: e.title, 
          time: e.time,
          timeMinutes: timeToMinutes(e.time || '')
        }))
      });
    }
    
    return sortedEvents;
  };

  const handleEventClick = (event: ScheduleEvent, rowId: string, day: string) => {
    console.log('=== EVENTO CLICK DETECTADO ===');
    console.log('Event:', event);
    console.log('RowId:', rowId);
    console.log('Day:', day);
    console.log('isAdminProp:', isAdminProp);
    
    if (!isAdminProp) {
      console.log('❌ No es admin, saliendo...');
      return;
    }
    
    console.log('✅ Abriendo editor de eventos...');
    setEditingEvent(event);
    setEditingRowId(rowId);
    setEditingDay(day);
    console.log('Estado actualizado:', { editingEvent: event.id, editingRowId: rowId, editingDay: day });
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
    
    console.log('🖱️ Clic derecho detectado:', { eventId, rowId, day });
    
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
    
    console.log('📋 Copiando evento desde menú contextual...');
    
    const result = copyEventInSameCell(contextMenu.eventId, contextMenu.rowId, contextMenu.day);
    
    if (result?.success) {
      setMoveNotification(`✅ ${result.message}`);
      
      // Forzar reinicialización de SortableJS después de copiar
      // para asegurar que el nuevo elemento sea reconocido
      setTimeout(() => {
        console.log('🔄 Forzando reinicialización después de copiar evento');
        const key = `${contextMenu.rowId}-${contextMenu.day}`;
        const element = document.querySelector(`[data-row-id="${contextMenu.rowId}"][data-day="${contextMenu.day}"]`);
        
        if (element instanceof HTMLElement && sortableRefs.current[key]) {
          try {
            sortableRefs.current[key]?.destroy();
            sortableRefs.current[key] = null;
            const cleanup = initializeSortable(element, contextMenu.rowId, contextMenu.day);
            console.log('✅ Reinicialización completada después de copiar');
          } catch (error) {
            console.warn('⚠️ Error en reinicialización después de copiar:', error);
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
    
    console.log('=== DRAG AND DROP INICIADO ===');
    
    // Prevenir manipulación automática del DOM por SortableJS
    if (evt.preventDefault) {
      evt.preventDefault();
    }
    
    // Pequeño delay para asegurar que SortableJS termine sus operaciones
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const eventId = evt.item.getAttribute('data-event-id');
    if (!eventId) {
      console.error('❌ No se encontró el ID del evento');
      setMoveNotification('❌ Error: ID de evento no encontrado');
      return;
    }

    const fromRowId = evt.from.getAttribute('data-row-id');
    const fromDay = evt.from.getAttribute('data-day');
    
    // IMPORTANTE: Obtener destino real basado en evt.to (donde se soltó realmente)
    const toRowId = evt.to.getAttribute('data-row-id');
    const toDay = evt.to.getAttribute('data-day');
    
    console.log('📋 Detalles del movimiento:', {
      eventId,
      from: { rowId: fromRowId, day: fromDay },
      to: { rowId: toRowId, day: toDay },
      fromElement: evt.from,
      toElement: evt.to,
      oldIndex: evt.oldIndex,
      newIndex: evt.newIndex
    });
    
    // Validar que tenemos todos los datos necesarios
    if (!fromRowId || !fromDay || !toRowId || !toDay) {
      console.error('❌ Datos incompletos para el movimiento:', {
        fromRowId, fromDay, toRowId, toDay
      });
      setMoveNotification('❌ Error: Datos incompletos');
      return;
    }
    
    // Solo mover si es diferente posición
    if (fromRowId !== toRowId || fromDay !== toDay) {
      try {
        console.log('🚀 Iniciando movimiento de evento...');
        moveEvent(eventId, fromRowId, fromDay, toRowId, toDay);
        console.log('✅ EVENTO MOVIDO CORRECTAMENTE');
        
        // Mostrar notificación de éxito
        setMoveNotification('✅ Evento movido correctamente');
      } catch (error) {
        console.error('❌ Error al mover evento:', error);
        setMoveNotification('❌ Error al mover evento');
      }
    } else {
      console.log('ℹ️ EVENTO SOLTADO EN LA MISMA POSICIÓN - No se requiere acción');
    }
  };

  const initializeSortable = (element: HTMLElement, rowId: string, day: string) => {
    if (!element || !isAdminProp) return null;
    
    const key = `${rowId}-${day}`;
    
    // Si ya existe una instancia, destruirla primero
    if (sortableRefs.current[key]) {
      console.log('🔄 Destruyendo instancia existente de SortableJS:', key);
      try {
        sortableRefs.current[key]?.destroy();
      } catch (error) {
        console.warn('⚠️ Error al destruir instancia SortableJS:', error);
      }
      sortableRefs.current[key] = null;
    }
    
    console.log('🎯 Inicializando SortableJS para:', key);
    
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
          const eventId = evt.item.getAttribute('data-event-id');
          console.log('🚀 Drag iniciado:', { eventId, from: { rowId, day } });
          
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
            console.log('📍 Moviendo sobre:', { targetRowId, targetDay });
            return true; // Permitir drop
          }
          return false; // No permitir drop
        },
        onAdd: (evt) => {
          console.log('➕ Evento agregado a nueva celda');
          // Evitar manipulación automática del DOM
          evt.preventDefault && evt.preventDefault();
          return false;
        },
        onRemove: (evt) => {
          console.log('➖ Evento removido de celda original');
        },
        onChange: (evt) => {
          console.log('🔄 Orden cambiado dentro de la misma celda');
        },
        onEnd: (evt) => {
          console.log('🏁 Drag finalizado');
          
          // Limpiar clases y estilos
          document.body.classList.remove('dragging');
          document.body.style.userSelect = '';
          evt.item.classList.remove('opacity-75');
          
          // Manejar el drop manualmente
          handleDrop(evt);
        }
      });
      
      sortableRefs.current[key] = sortableInstance;
      console.log('✅ SortableJS inicializado correctamente para:', key);
      
      return () => {
        console.log('🧹 Limpiando instancia SortableJS:', key);
        try {
          if (sortableRefs.current[key]) {
            sortableRefs.current[key]?.destroy();
        sortableRefs.current[key] = null;
          }
        } catch (error) {
          console.warn('⚠️ Error al limpiar instancia SortableJS:', error);
        }
      };
    } catch (error) {
      console.error('❌ Error al crear instancia SortableJS:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('🔄 Reinicializando SortableJS - rows changed');
    
    // Limpiar todas las instancias existentes primero
    Object.entries(sortableRefs.current).forEach(([key, instance]) => {
      if (instance) {
        console.log('🧹 Destruyendo instancia existente:', key);
        try {
          instance.destroy();
        } catch (error) {
          console.warn('⚠️ Error al destruir instancia:', key, error);
        }
      }
    });
    
    // Limpiar referencias
    sortableRefs.current = {};
    
    // Pequeño delay para asegurar que el DOM esté actualizado
    const timeoutId = setTimeout(() => {
    const elements = document.querySelectorAll('[data-sortable="true"]');
    const cleanupFns: (() => void)[] = [];
      
      console.log(`🎯 Inicializando ${elements.length} celdas de SortableJS`);

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
        console.log('🧹 Ejecutando limpieza de useEffect');
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
            console.warn('⚠️ Error al destruir instancia en cleanup:', error);
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
        <div class="flex items-center justify-between">
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
              <p class={`text-slate-300 transition-all duration-300 text-center ${
                isScrolled ? 'mt-1 text-xs' : 'mt-2 text-sm'
              }`}>
                {formatDateDisplay(currentWeek.startDate)} - {formatDateDisplay(currentWeek.endDate)}
              </p>
            </div>
          </div>
          
          {/* Botones de navegación */}
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
      </div>

      {/* Contenedor con scroll para la tabla */}
      <div class="overflow-x-auto overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar">
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
                              <span class="inline-block w-4 h-4 text-green-500 font-bold text-xs leading-none" title="Evento Confirmado">
                                ✓
                              </span>
                            ) : (
                              <span class="inline-block w-4 h-4 text-orange-500 font-bold text-xs leading-none" title="Pendiente de Confirmación">
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