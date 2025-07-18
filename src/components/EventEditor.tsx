import { useState, useEffect } from 'preact/hooks';
import type { Event } from '../stores/schedule';
import { draftScheduleRows } from '../stores/schedule';
import { EVENT_COLORS, hexToStyle, getContrastTextColor } from '../lib/colors';

interface EventEditorProps {
  event: Event;
  rowId: string;
  day: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function EventEditor({ event, rowId, day, isOpen, onClose }: EventEditorProps) {
  const [formData, setFormData] = useState({
    title: event.title,
    details: Array.isArray(event.details) ? event.details.join('\n') : event.details,
    time: event.time || '',
    location: event.location,
    color: event.color,
    modalidad: event.modalidad || ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: event.title,
        details: Array.isArray(event.details) ? event.details.join('\n') : event.details,
        time: event.time || '',
        location: event.location,
        color: event.color,
        modalidad: event.modalidad || ''
      });
    }
  }, [isOpen, event]);

  const handleSave = () => {
    const currentRows = draftScheduleRows.value;
    const newRows = currentRows.map((row: any) => {
      if (row.id === rowId && row.events[day]) {
        const eventIndex = row.events[day].findIndex((e: any) => e.id === event.id);
        if (eventIndex !== -1) {
          const updatedEvent: Event = {
            ...row.events[day][eventIndex],
            title: formData.title,
            details: formData.details.includes('\n') ? formData.details.split('\n') : formData.details,
            time: formData.time || undefined,
            location: formData.location,
            color: formData.color,
            modalidad: formData.modalidad || undefined
          };
          
          const newEvents = [...row.events[day]];
          newEvents[eventIndex] = updatedEvent;
          
          return {
            ...row,
            events: {
              ...row.events,
              [day]: newEvents
            }
          };
        }
      }
      return row;
    });

    draftScheduleRows.value = newRows;
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const colorOptions = EVENT_COLORS.slice(0, 18).map((color, index) => ({
    value: color,
    label: `Color ${index + 1}`,
    color: color
  }));

  return (
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-white">Editar Evento</h2>
          <button
            onClick={onClose}
            class="text-slate-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div class="space-y-6">
          {/* Título */}
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Programa del Evento
            </label>
            <input
              type="text"
              value={formData.title}
              onInput={(e) => setFormData({ ...formData, title: (e.target as HTMLInputElement).value })}
              onKeyDown={handleKeyDown}
              class="w-full bg-slate-700 text-white p-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              placeholder="Ingresa el título del evento"
            />
          </div>

          {/* Detalles */}
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Módulo
            </label>
            <textarea
              value={formData.details}
              onInput={(e) => setFormData({ ...formData, details: (e.target as HTMLTextAreaElement).value })}
              onKeyDown={handleKeyDown}
              rows={4}
              class="w-full bg-slate-700 text-white p-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Ingresa los detalles del evento (usa Enter para múltiples líneas)"
            />
          </div>

          {/* Horario */}
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Horario (opcional)
            </label>
            <input
              type="text"
              value={formData.time}
              onInput={(e) => setFormData({ ...formData, time: (e.target as HTMLInputElement).value })}
              onKeyDown={handleKeyDown}
              class="w-full bg-slate-700 text-white p-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              placeholder="Ej: Presencial - 8:00 a.m. a 5:00 p.m."
            />
          </div>

          {/* Ubicación */}
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Ubicación
            </label>
            <input
              type="text"
              value={formData.location}
              onInput={(e) => setFormData({ ...formData, location: (e.target as HTMLInputElement).value })}
              onKeyDown={handleKeyDown}
              class="w-full bg-slate-700 text-white p-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              placeholder="Ingresa la ubicación"
            />
          </div>

          {/* Modalidad */}
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Modalidad (opcional)
            </label>
            <select
              value={formData.modalidad}
              onChange={(e) => setFormData({ ...formData, modalidad: (e.target as HTMLSelectElement).value })}
              class="w-full bg-slate-700 text-white p-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Seleccionar modalidad</option>
              <option value="Presencial">Presencial</option>
              <option value="Virtual">Virtual</option>
            </select>
          </div>

          {/* Color */}
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Color de la Tarjeta
            </label>
            <div class="grid grid-cols-3 gap-3">
              {colorOptions.map(color => (
                <button
                  key={color.value}
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  class={`p-3 rounded-lg border-2 transition-all ${
                    formData.color === color.value
                      ? 'border-white scale-105'
                      : 'border-slate-600 hover:border-slate-400'
                  }`}
                >
                  <div 
                    class="w-full h-8 rounded flex items-center justify-center font-medium"
                    style={{
                      backgroundColor: color.color,
                      color: getContrastTextColor(color.color)
                    }}
                  >
                    {color.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Vista previa */}
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Vista Previa
            </label>
            <div 
              class="rounded-lg p-4"
              style={{
                backgroundColor: formData.color,
                color: getContrastTextColor(formData.color)
              }}
            >
              <p class="font-bold text-lg">{formData.title || 'Título del evento'}</p>
              <div class="text-sm mt-2 space-y-1">
                {formData.details.split('\n').map((line, index) => (
                  <p key={index}>{line || 'Detalles del evento'}</p>
                ))}
              </div>
              {formData.time && <p class="text-sm mt-3 opacity-70">{formData.time}</p>}
              <p class="text-sm mt-2 font-semibold text-center">{formData.location || 'Ubicación'}</p>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div class="flex justify-end space-x-3 mt-8">
          <button
            onClick={onClose}
            class="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
} 