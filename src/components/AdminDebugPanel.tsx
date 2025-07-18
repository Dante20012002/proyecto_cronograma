import { useState } from 'preact/hooks';
import { 
  debugDataIntegrity,
  removeDuplicateEvents,
  fixIncompleteEvents,
  clearAllDraftEvents,
  debugPublishState,
  copyEventInSameCell,
  debugOperationQueue,
  migrateAllEventsToNewFormat,
  cleanupLegacyEvents,
  resetToCurrentWeek,
  updateWeekTitle,
  getWeekTitle,
  getCurrentWeekTitle
} from '../stores/schedule';
import { safeConfirm } from '../lib/utils';
import type { JSX } from 'preact';

/**
 * Panel de debugging seguro para administradores.
 * Encapsula todas las funciones de debugging en una interfaz controlada.
 * Solo disponible para usuarios autenticados como administradores.
 * 
 * @component
 * @returns {JSX.Element} Componente AdminDebugPanel
 */
export default function AdminDebugPanel(): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [copyEventParams, setCopyEventParams] = useState({
    eventId: '',
    rowId: '',
    day: ''
  });

  const executeOperation = async (operationName: string, operation: () => Promise<any> | any) => {
    setCurrentOperation(operationName);
    setResults(prev => [...prev, `🔄 Ejecutando: ${operationName}...`]);
    
    try {
      const result = await operation();
      setResults(prev => [...prev, `✅ ${operationName}: ${result || 'Completado exitosamente'}`]);
    } catch (error) {
      setResults(prev => [...prev, `❌ ${operationName}: Error - ${error}`]);
      console.error(`Error en ${operationName}:`, error);
    } finally {
      setCurrentOperation(null);
    }
  };

  const clearResults = () => setResults([]);

  const operations = [
    {
      category: "🔍 Diagnóstico",
      items: [
        {
          name: "Verificar Integridad de Datos",
          action: () => executeOperation("debugDataIntegrity", debugDataIntegrity),
          description: "Analiza la integridad general de los datos",
          isDestructive: false
        },
        {
          name: "Estado de Publicación",
          action: () => executeOperation("debugPublishState", debugPublishState),
          description: "Verifica el estado entre draft y published",
          isDestructive: false
        },
        {
          name: "Cola de Operaciones",
          action: () => executeOperation("debugOperationQueue", debugOperationQueue),
          description: "Muestra operaciones pendientes en cola",
          isDestructive: false
        }
      ]
    },
    {
      category: "🧹 Limpieza de Datos",
      items: [
        {
          name: "Remover Eventos Duplicados",
          action: () => executeOperation("removeDuplicateEvents", () => removeDuplicateEvents()),
          description: "Elimina eventos duplicados del sistema",
          isDestructive: false
        },
        {
          name: "Corregir Eventos Incompletos",
          action: () => executeOperation("fixIncompleteEvents", fixIncompleteEvents),
          description: "Repara eventos con datos faltantes",
          isDestructive: false
        },
        {
          name: "Limpiar Eventos Legacy",
          action: () => executeOperation("cleanupLegacyEvents", cleanupLegacyEvents),
          description: "Elimina eventos en formato anterior",
          isDestructive: false
        }
      ]
    },
    {
      category: "🔄 Migración",
      items: [
        {
          name: "Migrar a Nuevo Formato",
          action: () => executeOperation("migrateAllEventsToNewFormat", migrateAllEventsToNewFormat),
          description: "Migra eventos al formato de fechas completas",
          isDestructive: false
        },
        {
          name: "Resetear a Semana Actual",
          action: () => executeOperation("resetToCurrentWeek", resetToCurrentWeek),
          description: "Reinicia la navegación a la semana actual",
          isDestructive: false
        }
      ]
    },
    {
      category: "⚠️ Operaciones Críticas",
      items: [
        {
          name: "Borrar Todos los Eventos Draft",
          action: () => {
            if (safeConfirm('⚠️ ADVERTENCIA: Esto eliminará TODOS los eventos en borrador. ¿Estás seguro?')) {
              if (safeConfirm('Esta acción NO se puede deshacer. ¿Continuar?')) {
                executeOperation("clearAllDraftEvents", clearAllDraftEvents);
              }
            }
          },
          description: "⚠️ CUIDADO: Elimina todos los eventos en borrador",
          isDestructive: true
        }
      ]
    }
  ];

  return (
    <div class="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span class="text-red-600 font-semibold">🛠️ Panel de Debugging (Solo Administradores)</span>
          {import.meta.env.DEV && (
            <span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
              DESARROLLO
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          class="text-red-600 hover:text-red-800 transition-colors"
        >
          {isExpanded ? '⬆️ Ocultar' : '⬇️ Mostrar'}
        </button>
      </div>

      {isExpanded && (
        <div class="mt-4 space-y-6">
          {/* Operaciones organizadas por categoría */}
          {operations.map((category, categoryIndex) => (
            <div key={categoryIndex} class="space-y-3">
              <h4 class="font-semibold text-gray-700 border-b border-gray-200 pb-1">
                {category.category}
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {category.items.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    onClick={item.action}
                    disabled={currentOperation !== null}
                    class={`p-3 rounded-md text-left transition-colors ${
                      item.isDestructive
                        ? 'bg-red-100 hover:bg-red-200 text-red-800 border border-red-300'
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div class="font-medium text-sm">{item.name}</div>
                    <div class="text-xs mt-1 opacity-75">{item.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Operación especial: Copiar Evento */}
          <div class="space-y-3">
            <h4 class="font-semibold text-gray-700 border-b border-gray-200 pb-1">
              📋 Operaciones Especiales
            </h4>
            <div class="bg-indigo-100 border border-indigo-300 rounded-md p-3">
              <div class="font-medium text-indigo-800 mb-2">Copiar Evento en Misma Celda</div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Event ID"
                  value={copyEventParams.eventId}
                  onInput={(e) => setCopyEventParams(prev => ({ 
                    ...prev, 
                    eventId: (e.target as HTMLInputElement).value 
                  }))}
                  class="px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="text"
                  placeholder="Row ID"
                  value={copyEventParams.rowId}
                  onInput={(e) => setCopyEventParams(prev => ({ 
                    ...prev, 
                    rowId: (e.target as HTMLInputElement).value 
                  }))}
                  class="px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="text"
                  placeholder="Day (YYYY-MM-DD)"
                  value={copyEventParams.day}
                  onInput={(e) => setCopyEventParams(prev => ({ 
                    ...prev, 
                    day: (e.target as HTMLInputElement).value 
                  }))}
                  class="px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <button
                onClick={() => executeOperation(
                  "copyEventInSameCell",
                  () => copyEventInSameCell(copyEventParams.eventId, copyEventParams.rowId, copyEventParams.day)
                )}
                disabled={currentOperation !== null || !copyEventParams.eventId || !copyEventParams.rowId || !copyEventParams.day}
                class="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Copiar Evento
              </button>
            </div>
          </div>

          {/* Panel de resultados */}
          {results.length > 0 && (
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="font-semibold text-gray-700">📋 Resultados</h4>
                <button
                  onClick={clearResults}
                  class="text-sm text-gray-600 hover:text-gray-800"
                >
                  Limpiar
                </button>
              </div>
              <div class="bg-gray-900 text-green-400 p-3 rounded-md font-mono text-sm max-h-64 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index} class="mb-1">
                    {result}
                  </div>
                ))}
                {currentOperation && (
                  <div class="animate-pulse">⏳ Procesando...</div>
                )}
              </div>
            </div>
          )}

          {/* Advertencia de seguridad */}
          <div class="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div class="flex items-start space-x-2">
              <span class="text-yellow-600">⚠️</span>
              <div class="text-yellow-800 text-sm">
                <strong>Advertencia de Seguridad:</strong> Estas herramientas están diseñadas para 
                mantenimiento y debugging. Usa con precaución en datos de producción. 
                Siempre haz backup antes de operaciones destructivas.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 