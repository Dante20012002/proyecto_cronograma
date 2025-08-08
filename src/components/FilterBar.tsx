import { useState, useEffect } from 'preact/hooks';
import { 
  activeFilters, 
  updateFilters, 
  clearFilters, 
  getUniqueValues, 
  getUniqueProgramsFromWeek,
  getUniqueModulesFromWeek,
  draftGlobalConfig,
  selectedWeek,
  type FilterState 
} from '../stores/schedule';
import type { JSX } from 'preact';

/**
 * Props para el componente FilterBar
 */
interface FilterBarProps {
  /** Determina si se usan los datos de administrador o publicados */
  isAdmin: boolean;
  /** Función opcional que se ejecuta cuando cambian los filtros */
  onFilterChange?: (filters: FilterState) => void;
}

/**
 * Componente de filtros reutilizable para el cronograma.
 * Proporciona filtros por instructor, regional, modalidad, programas y módulos.
 * Los filtros de programas y módulos se basan únicamente en los eventos de la semana seleccionada.
 */
export default function FilterBar({ isAdmin, onFilterChange }: FilterBarProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const [availableOptions, setAvailableOptions] = useState({
    instructors: [] as string[],
    regionales: [] as string[],
    modalidades: [] as string[],
    programas: [] as string[],
    modulos: [] as string[]
  });

  const filters = activeFilters.value;

  // Cargar opciones disponibles
  useEffect(() => {
    console.log('🔄 FilterBar - Actualizando opciones de filtros');
    setAvailableOptions({
      instructors: getUniqueValues('instructors', isAdmin),
      regionales: getUniqueValues('regionales', isAdmin),
      modalidades: getUniqueValues('modalidades', isAdmin),
      programas: getUniqueProgramsFromWeek(isAdmin),
      modulos: getUniqueModulesFromWeek(isAdmin)
    });
  }, [
    isAdmin, 
    isAdmin ? draftGlobalConfig.value.currentWeek.startDate : selectedWeek.value.startDate,
    isAdmin ? draftGlobalConfig.value.currentWeek.endDate : selectedWeek.value.endDate
  ]);

  const handleFilterChange = (field: keyof FilterState, value: string, isChecked: boolean) => {
    const currentValues = filters[field];
    let newValues: string[];

    if (isChecked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter(v => v !== value);
    }

    const newFilters = { ...filters, [field]: newValues };
    updateFilters(newFilters);

    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };

  const handleClearAll = () => {
    clearFilters();
    if (onFilterChange) {
      onFilterChange({
        instructors: [],
        regionales: [],
        modalidades: [],
        programas: [],
        modulos: []
      });
    }
  };

  const hasActiveFilters = filters.instructors.length > 0 || 
                          filters.regionales.length > 0 || 
                          filters.modalidades.length > 0 ||
                          filters.programas.length > 0 ||
                          filters.modulos.length > 0;

  const totalActiveFilters = filters.instructors.length + 
                            filters.regionales.length + 
                            filters.modalidades.length +
                            filters.programas.length +
                            filters.modulos.length;

  return (
    <div class="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header del filtro */}
      <div class="flex items-center justify-between p-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          class="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            class={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          >
            <path d="M7 10l5 5 5-5z"/>
          </svg>
          <span class="font-medium">Filtros</span>
          {totalActiveFilters > 0 && (
            <span class="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {totalActiveFilters}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            class="text-sm text-red-600 hover:text-red-800 transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Panel de filtros expandido */}
      {isExpanded && (
        <div class="border-t border-gray-200 p-3">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            
            {/* Filtro de Instructores */}
            <div>
              <h4 class="font-medium text-gray-700 mb-2">Instructores</h4>
              <div class="max-h-32 overflow-y-auto space-y-1">
                {availableOptions.instructors.map(instructor => (
                  <label key={instructor} class="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.instructors.includes(instructor)}
                      onChange={(e) => handleFilterChange('instructors', instructor, (e.target as HTMLInputElement).checked)}
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span class="text-gray-600">{instructor}</span>
                  </label>
                ))}
                {availableOptions.instructors.length === 0 && (
                  <p class="text-sm text-gray-400">No hay instructores disponibles</p>
                )}
              </div>
            </div>

            {/* Filtro de Regionales */}
            <div>
              <h4 class="font-medium text-gray-700 mb-2">Regionales</h4>
              <div class="max-h-32 overflow-y-auto space-y-1">
                {availableOptions.regionales.map(regional => (
                  <label key={regional} class="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.regionales.includes(regional)}
                      onChange={(e) => handleFilterChange('regionales', regional, (e.target as HTMLInputElement).checked)}
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span class="text-gray-600">{regional}</span>
                  </label>
                ))}
                {availableOptions.regionales.length === 0 && (
                  <p class="text-sm text-gray-400">No hay regionales disponibles</p>
                )}
              </div>
            </div>

            {/* Filtro de Modalidades */}
            <div>
              <h4 class="font-medium text-gray-700 mb-2">Modalidades</h4>
              <div class="max-h-32 overflow-y-auto space-y-1">
                {availableOptions.modalidades.map(modalidad => (
                  <label key={modalidad} class="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.modalidades.includes(modalidad)}
                      onChange={(e) => handleFilterChange('modalidades', modalidad, (e.target as HTMLInputElement).checked)}
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span class="text-gray-600">{modalidad}</span>
                  </label>
                ))}
                {availableOptions.modalidades.length === 0 && (
                  <p class="text-sm text-gray-400">No hay modalidades disponibles</p>
                )}
              </div>
            </div>

            {/* Filtro de Programas (Títulos) */}
            <div>
              <h4 class="font-medium text-gray-700 mb-2">Programas</h4>
              <div class="max-h-32 overflow-y-auto space-y-1">
                {availableOptions.programas.map(programa => (
                  <label key={programa} class="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.programas.includes(programa)}
                      onChange={(e) => handleFilterChange('programas', programa, (e.target as HTMLInputElement).checked)}
                      class="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span class="text-gray-600" title={programa}>{programa.length > 30 ? `${programa.substring(0, 30)}...` : programa}</span>
                  </label>
                ))}
                {availableOptions.programas.length === 0 && (
                  <p class="text-sm text-gray-400">No hay programas en esta semana</p>
                )}
              </div>
            </div>

            {/* Filtro de Módulos (Detalles) */}
            <div>
              <h4 class="font-medium text-gray-700 mb-2">Módulos</h4>
              <div class="max-h-32 overflow-y-auto space-y-1">
                {availableOptions.modulos.map(modulo => (
                  <label key={modulo} class="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.modulos.includes(modulo)}
                      onChange={(e) => handleFilterChange('modulos', modulo, (e.target as HTMLInputElement).checked)}
                      class="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span class="text-gray-600" title={modulo}>{modulo.length > 30 ? `${modulo.substring(0, 30)}...` : modulo}</span>
                  </label>
                ))}
                {availableOptions.modulos.length === 0 && (
                  <p class="text-sm text-gray-400">No hay módulos en esta semana</p>
                )}
              </div>
            </div>

          </div>

          {/* Resumen de filtros activos */}
          {hasActiveFilters && (
            <div class="mt-4 pt-3 border-t border-gray-200">
              <p class="text-sm text-gray-600 mb-2">Filtros activos:</p>
              <div class="flex flex-wrap gap-2">
                
                {filters.instructors.map(instructor => (
                  <span key={`instructor-${instructor}`} class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    <span class="mr-1">👤</span>
                    {instructor}
                    <button
                      onClick={() => handleFilterChange('instructors', instructor, false)}
                      class="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}

                {filters.regionales.map(regional => (
                  <span key={`regional-${regional}`} class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    <span class="mr-1">🏢</span>
                    {regional}
                    <button
                      onClick={() => handleFilterChange('regionales', regional, false)}
                      class="ml-1 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                ))}

                {filters.modalidades.map(modalidad => (
                  <span key={`modalidad-${modalidad}`} class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                    <span class="mr-1">📍</span>
                    {modalidad}
                    <button
                      onClick={() => handleFilterChange('modalidades', modalidad, false)}
                      class="ml-1 text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                ))}

                {filters.programas.map(programa => (
                  <span key={`programa-${programa}`} class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                    <span class="mr-1">📚</span>
                    {programa.length > 25 ? `${programa.substring(0, 25)}...` : programa}
                    <button
                      onClick={() => handleFilterChange('programas', programa, false)}
                      class="ml-1 text-orange-600 hover:text-orange-800"
                    >
                      ×
                    </button>
                  </span>
                ))}

                {filters.modulos.map(modulo => (
                  <span key={`modulo-${modulo}`} class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-teal-100 text-teal-800">
                    <span class="mr-1">🧩</span>
                    {modulo.length > 25 ? `${modulo.substring(0, 25)}...` : modulo}
                    <button
                      onClick={() => handleFilterChange('modulos', modulo, false)}
                      class="ml-1 text-teal-600 hover:text-teal-800"
                    >
                      ×
                    </button>
                  </span>
                ))}

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 