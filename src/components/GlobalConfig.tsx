import { useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { draftGlobalConfig, updateTitle, updateWeek } from '../stores/schedule';

export default function GlobalConfig() {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isEditingWeek, setIsEditingWeek] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  
  const config = useStore(draftGlobalConfig);

  const handleEditTitle = () => {
    setNewTitle(config.title);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    if (newTitle.trim()) {
      updateTitle(newTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleEditWeek = () => {
    setNewStartDate(config.currentWeek.startDate);
    setNewEndDate(config.currentWeek.endDate);
    setIsEditingWeek(true);
  };

  const handleSaveWeek = () => {
    if (newStartDate && newEndDate) {
      updateWeek(newStartDate, newEndDate);
    }
    setIsEditingWeek(false);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const startDate = new Date(config.currentWeek.startDate + 'T00:00:00');
    
    if (direction === 'prev') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setDate(startDate.getDate() + 7);
    }
    
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const newStartDateStr = formatDate(startDate);
    
    // Calcular fecha de fin (asumiendo 5 días laborales)
    const endDate = new Date(newStartDateStr + 'T00:00:00');
    endDate.setDate(endDate.getDate() + 4);
    const newEndDateStr = formatDate(endDate);
    
    updateWeek(newStartDateStr, newEndDateStr);
  };

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Configuración del título */}
        <div>
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Configuración General</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Título del Cronograma
              </label>
              {isEditingTitle ? (
                <div class="flex space-x-2">
                  <input
                    type="text"
                    value={newTitle}
                    onInput={(e) => setNewTitle((e.target as HTMLInputElement).value)}
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Título del cronograma"
                  />
                  <button
                    onClick={handleSaveTitle}
                    class="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setIsEditingTitle(false)}
                    class="px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div class="flex items-center space-x-2">
                  <span class="text-gray-900 font-medium">{config.title}</span>
                  <button
                    onClick={handleEditTitle}
                    class="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Editar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navegación de semana */}
        <div>
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Navegación de Semana</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Semana Actual
              </label>
              {isEditingWeek ? (
                <div class="space-y-2">
                  <div class="flex space-x-2">
                    <input
                      type="date"
                      value={newStartDate}
                      onInput={(e) => setNewStartDate((e.target as HTMLInputElement).value)}
                      class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div class="flex space-x-2">
                    <button
                      onClick={handleSaveWeek}
                      class="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setIsEditingWeek(false)}
                      class="px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div class="space-y-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-gray-900">
                      {formatDateDisplay(config.currentWeek.startDate)} - {formatDateDisplay(config.currentWeek.endDate)}
                    </span>
                    <button
                      onClick={handleEditWeek}
                      class="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Editar (cambia el inicio)
                    </button>
                  </div>
                  
                  <div class="flex space-x-2">
                    <button
                      onClick={() => navigateWeek('prev')}
                      class="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      ← Semana Anterior
                    </button>
                    <button
                      onClick={() => navigateWeek('next')}
                      class="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Semana Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 