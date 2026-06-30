import { useState, useEffect } from 'preact/hooks';
import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { addOrUpdateItem } from '../lib/firestore';
import { safeConfirm } from '../lib/utils';
import { hasPermission, isSuperAdmin } from '../lib/auth';
import { EVENT_COLORS, detailColorMap, getContrastTextColor, getSuggestedColorForModule, validateModuleColorSync, normalizeColorToHex } from '../lib/colors';
import type { JSX } from 'preact';

/**
 * Interfaz para un programa
 */
interface Program {
  id: string;
  name: string;
  active: boolean;
  createdAt: any;
  createdBy: string;
}

/**
 * Interfaz para un módulo
 */
interface Module {
  id: string;
  name: string;
  color: string;
  active: boolean;
  createdAt: any;
  createdBy: string;
}

/**
 * Interfaz para una modalidad
 */
interface Modality {
  id: string;
  name: string;
  active: boolean;
  createdAt: any;
  createdBy: string;
}

/**
 * Componente para gestionar módulos, programas y modalidades.
 * Permite agregar, editar, eliminar y activar/desactivar.
 * 
 * @component
 * @returns {JSX.Element} Componente ModulesAndProgramsManager
 */
export default function ModulesAndProgramsManager(): JSX.Element {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'programs' | 'modules' | 'modalities'>('programs');
  
  // Estados para agregar
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    color: EVENT_COLORS[0] // Usar primer color HEX en lugar de clase Tailwind
  });

  // Estados para editar
  const [editingItem, setEditingItem] = useState<Program | Module | Modality | null>(null);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPrograms(),
        loadModules(),
        loadModalities()
      ]);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadPrograms = async () => {
    const programsCollection = collection(db, 'programs');
    const snapshot = await getDocs(programsCollection);
    
    const programsList: Program[] = [];
    snapshot.forEach((doc) => {
      programsList.push({ id: doc.id, ...doc.data() } as Program);
    });
    
    setPrograms(programsList.sort((a, b) => a.name.localeCompare(b.name)));
  };

  const loadModules = async () => {
    const modulesCollection = collection(db, 'modules');
    const snapshot = await getDocs(modulesCollection);
    
    const modulesList: Module[] = [];
    snapshot.forEach((doc) => {
      modulesList.push({ id: doc.id, ...doc.data() } as Module);
    });
    
    setModules(modulesList.sort((a, b) => a.name.localeCompare(b.name)));
  };

  const loadModalities = async () => {
    const modalitiesCollection = collection(db, 'modalities');
    const snapshot = await getDocs(modalitiesCollection);
    
    const modalitiesList: Modality[] = [];
    snapshot.forEach((doc) => {
      modalitiesList.push({ id: doc.id, ...doc.data() } as Modality);
    });
    
    setModalities(modalitiesList.sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddItem = async (e: Event) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    try {
      const collectionName = activeTab === 'programs' ? 'programs' : activeTab === 'modules' ? 'modules' : 'modalities';
      
      // Usar la función helper que previene duplicados
      const success = await addOrUpdateItem(
        collectionName as 'programs' | 'modules' | 'modalities',
        formData.name.trim(),
        activeTab === 'modules' ? formData.color : undefined
      );
      
      if (success) {
        setFormData({ name: '', color: EVENT_COLORS[0] });
        setShowAddForm(false);
        setError(null);
        
        await loadAllData();
        
        const itemType = activeTab === 'programs' ? 'programa' : activeTab === 'modules' ? 'módulo' : 'modalidad';
        alert(`✅ ${itemType.charAt(0).toUpperCase() + itemType.slice(1)} agregado exitosamente`);
      } else {
        setError('Error al agregar el elemento');
      }
    } catch (err) {
      console.error('Error agregando item:', err);
      setError('Error al agregar el elemento');
    }
  };

  const handleEditItem = async (e: Event) => {
    e.preventDefault();
    
    if (!editingItem || !formData.name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    try {
      const collectionName = activeTab === 'programs' ? 'programs' : activeTab === 'modules' ? 'modules' : 'modalities';
      
      // Usar la función helper que maneja cambios de nombre y actualización
      const success = await addOrUpdateItem(
        collectionName as 'programs' | 'modules' | 'modalities',
        formData.name.trim(),
        activeTab === 'modules' ? formData.color : undefined
      );
      
      if (success) {
        // Si el nombre cambió, podría necesitar eliminar el documento antiguo
        // Pero addOrUpdateItem ya lo maneja con migración
        
        setEditingItem(null);
        setFormData({ name: '', color: EVENT_COLORS[0] });
        setError(null);
        
        await loadAllData();
        
        const itemType = activeTab === 'programs' ? 'programa' : activeTab === 'modules' ? 'módulo' : 'modalidad';
        alert(`✅ ${itemType.charAt(0).toUpperCase() + itemType.slice(1)} actualizado exitosamente`);
      } else {
        setError('Error al editar el elemento');
      }
    } catch (err) {
      console.error('Error editando item:', err);
      setError('Error al editar el elemento');
    }
  };

  const handleDeleteItem = async (item: Program | Module | Modality) => {
    const itemType = activeTab === 'programs' ? 'programa' : activeTab === 'modules' ? 'módulo' : 'modalidad';
    
    if (safeConfirm(`¿Estás seguro de que quieres eliminar ${itemType} "${item.name}"?\n\nEsta acción no se puede deshacer.`)) {
      try {
        const collectionName = activeTab === 'programs' ? 'programs' : activeTab === 'modules' ? 'modules' : 'modalities';
        await deleteDoc(doc(db, collectionName, item.id));
        
        await loadAllData();
        setError(null);
        
        alert(`✅ ${itemType.charAt(0).toUpperCase() + itemType.slice(1)} eliminado exitosamente`);
      } catch (err) {
        console.error('Error eliminando item:', err);
        setError('Error al eliminar el elemento');
      }
    }
  };

  const handleToggleActive = async (item: Program | Module | Modality) => {
    try {
      const collectionName = activeTab === 'programs' ? 'programs' : activeTab === 'modules' ? 'modules' : 'modalities';
      
      await setDoc(doc(db, collectionName, item.id), {
        active: !item.active
      }, { merge: true });
      
      await loadAllData();
      setError(null);
    } catch (err) {
      console.error('Error cambiando estado:', err);
      setError('Error al cambiar el estado del elemento');
    }
  };

  const startEdit = (item: Program | Module | Modality) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      color: 'color' in item ? item.color : EVENT_COLORS[0]
    });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setFormData({ name: '', color: EVENT_COLORS[0] });
    setShowAddForm(false);
  };

  const getCurrentList = () => {
    switch (activeTab) {
      case 'programs':
        return programs;
      case 'modules':
        return modules;
      case 'modalities':
        return modalities;
      default:
        return [];
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'programs':
        return 'Programas';
      case 'modules':
        return 'Módulos';
      case 'modalities':
        return 'Modalidades';
      default:
        return '';
    }
  };

  const colorOptions = []; // Usa getColorOptions() abajo

  // Generar opciones de color basadas en EVENT_COLORS con HEX reales
  const getColorOptions = () => {
    return EVENT_COLORS.map((hexColor, index) => ({
      value: hexColor,
      label: `Color ${index + 1}`,
      preview: hexColor
    }));
  };

  // Verificar permisos - Solo Super Admins pueden acceder
  if (!isSuperAdmin()) {
    return (
      <div class="space-y-6">
        <div class="bg-red-50 border border-red-200 rounded-lg p-6">
          <div class="flex items-center space-x-3 mb-3">
            <span class="text-3xl">🔒</span>
            <h3 class="text-xl font-semibold text-red-900">Acceso Denegado</h3>
          </div>
          <p class="text-red-700 mb-4">
            Esta funcionalidad está restringida exclusivamente a <strong>Super Administradores</strong>.
          </p>
          <div class="bg-white border border-red-200 rounded-md p-4">
            <p class="text-sm text-red-800 mb-2">
              <strong>¿Por qué está restringido?</strong>
            </p>
            <ul class="list-disc list-inside text-sm text-red-700 space-y-1">
              <li>Los módulos y programas afectan todo el sistema</li>
              <li>Los cambios impactan a todos los usuarios y eventos</li>
              <li>Requiere permisos de nivel máximo para garantizar la integridad</li>
            </ul>
          </div>
          <p class="text-sm text-red-600 mt-4">
            Si necesitas acceso, contacta a un Super Administrador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div class="space-y-6">
      {/* Información del módulo */}
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 class="text-lg font-semibold text-blue-900 mb-2">Gestión de Módulos y Programas</h3>
        <p class="text-blue-700 text-sm">
          Administra los programas, módulos y modalidades disponibles en el sistema. 
          Los elementos desactivados no aparecerán en los formularios pero se conservarán en los eventos existentes.
        </p>
      </div>

      {/* Tabs */}
      <div class="border-b border-gray-200">
        <nav class="flex space-x-4">
          <button
            onClick={() => setActiveTab('programs')}
            class={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'programs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📚 Programas ({programs.length})
          </button>
          <button
            onClick={() => setActiveTab('modules')}
            class={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'modules'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🧩 Módulos ({modules.length})
          </button>
          <button
            onClick={() => setActiveTab('modalities')}
            class={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'modalities'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🎓 Modalidades ({modalities.length})
          </button>
        </nav>
      </div>

      {/* Header con botón de agregar */}
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-gray-900">{getTabTitle()}</h2>
          <p class="text-sm text-gray-600 mt-1">
            Gestiona los {getTabTitle().toLowerCase()} disponibles en el sistema
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <span>➕</span>
          <span>Agregar {activeTab === 'programs' ? 'Programa' : activeTab === 'modules' ? 'Módulo' : 'Modalidad'}</span>
        </button>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div class="bg-red-50 border border-red-200 rounded-md p-3">
          <div class="text-red-800">{error}</div>
          <button
            onClick={() => setError(null)}
            class="text-red-600 hover:text-red-800 text-sm mt-1"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Loader */}
      {loading ? (
        <div class="text-center py-8">
          <div class="animate-spin inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <p class="text-gray-600 mt-2">Cargando datos...</p>
        </div>
      ) : (
        <div class="space-y-4">
          {/* Lista de elementos */}
          {getCurrentList().length === 0 ? (
            <div class="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <p class="text-gray-500">No hay {getTabTitle().toLowerCase()} registrados</p>
              <button
                onClick={() => setShowAddForm(true)}
                class="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Agregar el primero
              </button>
            </div>
          ) : (
            <div class="grid grid-cols-1 gap-4">
              {getCurrentList().map((item) => (
                <div
                  key={item.id}
                  class={`border rounded-lg p-4 transition-colors ${
                    item.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div class="flex items-center justify-between">
                    <div class="flex-1 flex items-center space-x-3">
                      {/* Color preview para módulos */}
                      {activeTab === 'modules' && 'color' in item && (
                        <div
                          class="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: String((item as any).color || EVENT_COLORS[0]) }}
                          title={String((item as any).color || EVENT_COLORS[0])}
                        />
                      )}
                      
                      <div>
                        <h3 class="font-semibold text-gray-900">
                          {item.name}
                        </h3>
                        <div class="flex items-center space-x-2 mt-1">
                          <span
                            class={`px-2 py-1 rounded text-xs font-medium ${
                              item.active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {item.active ? 'Activo' : 'Inactivo'}
                          </span>
                          {activeTab === 'modules' && 'color' in item && (
                            <span class="font-mono text-xs text-gray-600">
                              {String((item as any).color || EVENT_COLORS[0])}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div class="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleActive(item)}
                        class={`px-3 py-1 rounded text-sm transition-colors ${
                          item.active
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {item.active ? 'Desactivar' : 'Activar'}
                      </button>
                      
                      <button
                        onClick={() => startEdit(item)}
                        class="text-blue-600 hover:text-blue-800 px-3 py-1 rounded text-sm hover:bg-blue-50"
                      >
                        Editar
                      </button>
                      
                      <button
                        onClick={() => handleDeleteItem(item)}
                        class="text-red-600 hover:text-red-800 px-3 py-1 rounded text-sm hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de agregar/editar */}
      {(showAddForm || editingItem) && (
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 class="text-lg font-semibold mb-4">
              {editingItem ? 'Editar' : 'Agregar Nuevo'} {activeTab === 'programs' ? 'Programa' : activeTab === 'modules' ? 'Módulo' : 'Modalidad'}
            </h3>
            
            <form onSubmit={editingItem ? handleEditItem : handleAddItem}>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onInput={(e) => handleInputChange('name', (e.target as HTMLInputElement).value)}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Nombre del ${activeTab === 'programs' ? 'programa' : activeTab === 'modules' ? 'módulo' : 'modalidad'}`}
                    required
                  />
                </div>

                {/* Color picker solo para módulos */}
                {activeTab === 'modules' && (
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Color * (Asegúrate de usar un color consistente con detailColorMap)
                    </label>
                    
                    {/* Sugerencia automática de color */}
                    {formData.name && (
                      <div class="mb-3 p-2 bg-green-50 border border-green-200 rounded">
                        <p class="text-xs text-green-800">
                          {validateModuleColorSync(formData.name, formData.color).message}
                        </p>
                      </div>
                    )}
                    
                    <div class="grid grid-cols-8 gap-2 mb-3">
                      {getColorOptions().map((colorOption) => (
                        <button
                          key={colorOption.value}
                          type="button"
                          onClick={() => handleInputChange('color', colorOption.value)}
                          class={`h-8 w-8 rounded border-2 transition-all ${
                            formData.color === colorOption.value
                              ? 'border-gray-900 scale-125'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: colorOption.value }}
                          title={colorOption.label}
                        />
                      ))}
                    </div>
                    
                    <div class="p-3 bg-gray-50 rounded border border-gray-200 flex items-center justify-between">
                      <div>
                        <p class="text-xs text-gray-600">
                          <strong>Color seleccionado:</strong>
                        </p>
                        <div class="flex items-center space-x-2 mt-1">
                          <div
                            class="w-6 h-6 rounded border border-gray-300"
                            style={{ backgroundColor: formData.color }}
                          />
                          <span class="font-mono text-sm text-gray-700">{formData.color}</span>
                        </div>
                      </div>
                      
                      {/* Botón para usar color sugerido */}
                      {formData.name && (
                        <button
                          type="button"
                          onClick={() => {
                            const suggestedColor = getSuggestedColorForModule(formData.name);
                            handleInputChange('color', suggestedColor);
                          }}
                          class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap ml-2"
                        >
                          Usar sugerencia
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div class="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelEdit}
                  class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingItem ? 'Guardar Cambios' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
