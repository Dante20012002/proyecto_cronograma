import { useState } from 'preact/hooks';
import { 
  draftGlobalConfig, 
  updateWeekTitle, 
  updateWeek, 
  navigateWeek, 
  formatDateDisplay,
  getCurrentWeekTitle
} from '../stores/schedule';
import type { JSX } from 'preact';

/**
 * Componente para gestionar la configuración global del cronograma.
 * Permite editar el título de la semana actual y navegar entre semanas.
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
    title: getCurrentWeekTitle(),
    startDate: config.currentWeek.startDate,
    endDate: config.currentWeek.endDate
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Por favor ingresa un título para esta semana.');
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

    // Actualizar el título específico de esta semana
    await updateWeekTitle(formData.startDate, formData.endDate, formData.title);
    await updateWeek(formData.startDate, formData.endDate);
  };

  const handleNavigate = async (direction: 'prev' | 'next') => {
    const newDates = navigateWeek(direction);
    
    // Actualizar el título para mostrar el de la nueva semana
    const newWeekTitle = getCurrentWeekTitle();
    
    setFormData(prev => ({
      ...prev,
      title: newWeekTitle,
      startDate: newDates.startDate,
      endDate: newDates.endDate
    }));
  };

  return (
    <div class="space-y-6">
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 class="text-lg font-semibold text-blue-900 mb-2">⚙️ Configuración Global</h3>
        <p class="text-blue-700 text-sm">
          Configura el título y periodo de visualización del cronograma.
        </p>
      </div>

      <form onSubmit={handleSubmit} class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Título de esta semana
          </label>
          <input
            type="text"
            value={formData.title}
            onInput={(e) => handleInputChange('title', (e.target as HTMLInputElement).value)}
            placeholder="Ej: Cronograma Escuelas Colombia - Semana 1"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <p class="text-xs text-gray-500 mt-1">
            Este título se mostrará en la parte superior del cronograma para esta semana específica.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Fecha de inicio (Lunes)
            </label>
            <input
              type="date"
              value={formData.startDate}
              onInput={(e) => handleInputChange('startDate', (e.target as HTMLInputElement).value)}
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Fecha de fin (Viernes)
            </label>
            <input
              type="date"
              value={formData.endDate}
              onInput={(e) => handleInputChange('endDate', (e.target as HTMLInputElement).value)}
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div class="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => navigateWeek('prev')}
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ← Semana Anterior
          </button>
          <button
            type="button"
            onClick={() => navigateWeek('next')}
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Semana Siguiente →
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  );
} 