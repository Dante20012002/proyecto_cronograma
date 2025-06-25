import { useState } from 'preact/hooks';
import { 
  draftGlobalConfig, 
  updateTitle, 
  updateWeek, 
  navigateWeek, 
  formatDateDisplay 
} from '../stores/schedule';
import type { JSX } from 'preact';
import type { GlobalConfig } from '../types/schedule';

/**
 * Componente para gestionar la configuración global del cronograma.
 * Permite editar el título y la semana actual.
 * 
 * @component
 * @returns {JSX.Element} Componente GlobalConfig
 * 
 * @example
 * ```tsx
 * <GlobalConfig />
 * ```
 */
export default function GlobalConfig(): JSX.Element {
  const config = draftGlobalConfig.value;
  const [formData, setFormData] = useState({
    title: config.title,
    startDate: config.currentWeek.startDate,
    endDate: config.currentWeek.endDate
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Por favor ingresa un título.');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      alert('Por favor selecciona las fechas de inicio y fin.');
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (endDate < startDate) {
      alert('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }

    await updateTitle(formData.title);
    await updateWeek(formData.startDate, formData.endDate);
  };

  const handleNavigate = async (direction: 'prev' | 'next') => {
    const newDates = navigateWeek(direction);
    setFormData(prev => ({
      ...prev,
      startDate: newDates.startDate,
      endDate: newDates.endDate
    }));
  };

  return (
    <div class="space-y-4">
      <form onSubmit={handleSubmit}>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Título del Cronograma</label>
            <input
              type="text"
              value={formData.title}
              onInput={(e) => handleInputChange('title', (e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Navegación de Semana</label>
            <div class="flex flex-col space-y-3">
              <div class="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div class="text-sm font-medium text-gray-700 w-full sm:w-auto">
                  {formatDateDisplay(formData.startDate)} - {formatDateDisplay(formData.endDate)}
                </div>
                <div class="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleNavigate('prev')}
                    class="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <span class="mr-1">←</span> Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate('next')}
                    class="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Siguiente <span class="ml-1">→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Fecha de Inicio</label>
            <input
              type="date"
              value={formData.startDate}
              onInput={(e) => handleInputChange('startDate', (e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Fecha de Fin</label>
            <input
              type="date"
              value={formData.endDate}
              onInput={(e) => handleInputChange('endDate', (e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div class="flex justify-end mt-4">
          <button
            type="submit"
            class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  );
} 