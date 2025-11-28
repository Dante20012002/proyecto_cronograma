import { draftGlobalConfig, publishedGlobalConfig, setViewMode, userViewMode, setUserViewMode } from '../stores/schedule';
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';

interface ViewModeToggleProps {
  isAdmin: boolean;
}

export default function ViewModeToggle({ isAdmin }: ViewModeToggleProps) {
  // Obtener el modo actual según el tipo de usuario
  const getCurrentMode = () => {
    return isAdmin ? draftGlobalConfig.value.viewMode : userViewMode.value;
  };

  const currentMode = useSignal(getCurrentMode());

  // Actualizar el modo cuando cambien las configuraciones
  useEffect(() => {
    currentMode.value = getCurrentMode();
  }, [isAdmin, draftGlobalConfig.value.viewMode, userViewMode.value]);

  const handleModeChange = (mode: 'weekly' | 'monthly') => {
    if (isAdmin) {
      // Para admins, actualizar el draft
      setViewMode(mode);
    } else {
      // Para usuarios no admin, usar la función específica
      setUserViewMode(mode);
    }
    
    // Actualizar el estado local inmediatamente
    currentMode.value = mode;
  };

  return (
    <div class="flex items-center bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => handleModeChange('weekly')}
        class={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          currentMode.value === 'weekly'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        📅 Semanal
      </button>
      <button
        onClick={() => handleModeChange('monthly')}
        class={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          currentMode.value === 'monthly'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        📆 Mensual
      </button>
    </div>
  );
}
