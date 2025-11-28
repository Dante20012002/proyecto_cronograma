import { useState, useEffect } from 'preact/hooks';
import { currentUser } from '../lib/auth';
import { db } from '../lib/firebase';
import { safeConfirm } from '../lib/utils';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, getAuth } from 'firebase/auth';
import type { JSX } from 'preact';

/**
 * Interfaz para un administrador del sistema
 */
interface AdminUser {
  email: string;
  role: 'super_admin' | 'admin' | 'editor';
  permissions: {
    canPublish: boolean;
    canEditGlobalConfig: boolean;
    canManageInstructors: boolean;
    canUploadExcel: boolean;
    canManageAdmins: boolean;
    canAccessDebugPanel: boolean;
  };
  active: boolean;
  displayName?: string;
  createdAt: Timestamp;
  createdBy: string;
  lastModified?: Timestamp;
  modifiedBy?: string;
}

/**
 * Roles predefinidos con sus permisos por defecto
 */
const ROLE_PERMISSIONS = {
  super_admin: {
    canPublish: true,
    canEditGlobalConfig: true,
    canManageInstructors: true,
    canUploadExcel: true,
    canManageAdmins: true,
    canAccessDebugPanel: true,
  },
  admin: {
    canPublish: true,
    canEditGlobalConfig: true,
    canManageInstructors: true,
    canUploadExcel: true,
    canManageAdmins: false,
    canAccessDebugPanel: true,
  },
  editor: {
    canPublish: false,
    canEditGlobalConfig: false,
    canManageInstructors: true,
    canUploadExcel: true,
    canManageAdmins: false,
    canAccessDebugPanel: false,
  }
};

/**
 * Componente para gestionar administradores del sistema.
 * Permite agregar, editar, eliminar y gestionar permisos de administradores.
 * Solo accesible para usuarios con permisos de gestión de administradores.
 * 
 * @component
 * @returns {JSX.Element} Componente AdminManager
 */
export default function AdminManager(): JSX.Element {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    role: 'admin' as AdminUser['role'],
    password: '' // Nuevo campo para contraseña
  });
  const [currentUserPermissions, setCurrentUserPermissions] = useState<AdminUser['permissions'] | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Cargar administradores al montar el componente
  useEffect(() => {
    loadAdmins();
    loadCurrentUserPermissions();
  }, []);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const adminsCollection = collection(db, 'admins');
      const adminsQuery = query(adminsCollection, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(adminsQuery);
      
      const adminsList: AdminUser[] = [];
      snapshot.forEach((doc) => {
        adminsList.push({ email: doc.id, ...doc.data() } as AdminUser);
      });
      
      setAdmins(adminsList);
    } catch (err) {
      console.error('Error cargando administradores:', err);
      setError('Error al cargar la lista de administradores');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentUserPermissions = async () => {
    if (!currentUser.value?.email) return;

    try {
      const userDoc = doc(db, 'admins', currentUser.value.email);
      const snapshot = await getDocs(collection(db, 'admins'));
      
      snapshot.forEach((doc) => {
        if (doc.id === currentUser.value?.email) {
          const userData = doc.data() as AdminUser;
          setCurrentUserPermissions(userData.permissions);
        }
      });
    } catch (err) {
      console.error('Error cargando permisos del usuario actual:', err);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddAdmin = async (e: Event) => {
    e.preventDefault();
    
    if (!formData.email.trim() || !formData.role) {
      setError('Email y rol son requeridos');
      return;
    }

    if (!formData.password.trim()) {
      setError('La contraseña es requerida para crear un nuevo administrador');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!safeConfirm(`¿Crear nuevo administrador ${formData.role} para ${formData.email}?\n\n⚠️ IMPORTANTE: Tu sesión se cerrará temporalmente al crear el usuario. Tendrás que volver a iniciar sesión.`)) {
      return;
    }

    setIsCreatingUser(true);
    const auth = getAuth();
    const currentUserEmail = currentUser.value?.email;
    
    try {
      // Paso 1: Crear usuario en Firebase Auth
      await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      
      // Paso 2: Crear documento en Firestore con permisos
      const adminData: Omit<AdminUser, 'createdAt'> = {
        email: formData.email.trim(),
        role: formData.role,
        permissions: ROLE_PERMISSIONS[formData.role],
        active: true,
        displayName: formData.displayName.trim() || undefined,
        createdBy: currentUserEmail || 'unknown',
      };

      await setDoc(doc(db, 'admins', formData.email.trim()), {
        ...adminData,
        createdAt: serverTimestamp()
      });
      
      // Limpiar formulario
      setFormData({ email: '', displayName: '', role: 'admin', password: '' });
      setShowAddForm(false);
      setError(null);
      
      // Mostrar mensaje de éxito y guiar al usuario
      alert(`✅ Administrador creado exitosamente!\n\n👤 Usuario: ${formData.email}\n🔑 Contraseña: ${formData.password}\n\n⚠️ Tu sesión se cerró al crear el usuario. Por favor, vuelve a iniciar sesión como super admin.`);
      
      // Recargar la página para que el usuario vuelva a loguearse
      window.location.reload();
      
    } catch (err: any) {
      console.error('❌ Error creando administrador:', err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('Ya existe un usuario con este email en Firebase Auth');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña es muy débil');
      } else if (err.code === 'auth/invalid-email') {
        setError('El formato del email es inválido');
      } else {
        setError(`Error al crear administrador: ${err.message}`);
      }
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleEditAdmin = async (e: Event) => {
    e.preventDefault();
    
    if (!editingAdmin || !currentUser.value?.email) {
      setError('Datos inválidos para edición');
      return;
    }

    try {
      const updateData = {
        role: formData.role,
        permissions: ROLE_PERMISSIONS[formData.role],
        displayName: formData.displayName || undefined,
        lastModified: serverTimestamp(),
        modifiedBy: currentUser.value.email
      };

      await updateDoc(doc(db, 'admins', editingAdmin.email), updateData);
      
      setEditingAdmin(null);
      setFormData({ email: '', displayName: '', role: 'admin', password: '' });
      setError(null);
      await loadAdmins();
      
    } catch (err) {
      console.error('Error editando administrador:', err);
      setError('Error al editar administrador');
    }
  };

  const handleDeleteAdmin = async (adminToDelete: AdminUser) => {
    if (adminToDelete.email === currentUser.value?.email) {
      setError('No puedes eliminar tu propia cuenta de administrador');
      return;
    }

    if (adminToDelete.role === 'super_admin') {
      setError('No puedes eliminar una cuenta de super administrador');
      return;
    }

    if (safeConfirm(`¿Estás seguro de que quieres eliminar el acceso de administrador para ${adminToDelete.email}?`)) {
      try {
        await deleteDoc(doc(db, 'admins', adminToDelete.email));
        await loadAdmins();
        setError(null);
      } catch (err) {
        console.error('Error eliminando administrador:', err);
        setError('Error al eliminar administrador');
      }
    }
  };

  const handleToggleActive = async (admin: AdminUser) => {
    if (admin.email === currentUser.value?.email) {
      setError('No puedes desactivar tu propia cuenta');
      return;
    }

    try {
      await updateDoc(doc(db, 'admins', admin.email), {
        active: !admin.active,
        lastModified: serverTimestamp(),
        modifiedBy: currentUser.value?.email
      });
      
      await loadAdmins();
      setError(null);
    } catch (err) {
      console.error('Error cambiando estado:', err);
      setError('Error al cambiar el estado del administrador');
    }
  };

  const startEdit = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setFormData({
      email: admin.email,
      displayName: admin.displayName || '',
      role: admin.role,
      password: '' // No necesario para editar, pero requerido por el tipo
    });
  };

  const cancelEdit = () => {
    setEditingAdmin(null);
    setFormData({ email: '', displayName: '', role: 'admin', password: '' });
    setShowAddForm(false);
  };

  // Verificar si el usuario actual puede gestionar administradores
  if (!currentUserPermissions?.canManageAdmins) {
    return (
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex items-center space-x-2">
          <span class="text-red-600">🔒</span>
          <span class="text-red-800 font-medium">Acceso Denegado</span>
        </div>
        <p class="text-red-700 mt-2">
          No tienes permisos para gestionar administradores. Contacta a un super administrador.
        </p>
      </div>
    );
  }

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-gray-900">👥 Gestión de Administradores</h2>
          <p class="text-sm text-gray-600 mt-1">
            Gestiona los usuarios con acceso administrativo al sistema
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          ➕ Agregar Admin
        </button>
      </div>

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

      {loading ? (
        <div class="text-center py-8">
          <div class="animate-spin inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <p class="text-gray-600 mt-2">Cargando administradores...</p>
        </div>
      ) : (
        <div class="space-y-4">
          {admins.map((admin) => (
            <div
              key={admin.email}
              class={`border rounded-lg p-4 ${
                admin.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
              }`}
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-2">
                    <h3 class="font-semibold text-gray-900">
                      {admin.displayName || admin.email}
                    </h3>
                    <span
                      class={`px-2 py-1 rounded text-xs font-medium ${
                        admin.role === 'super_admin'
                          ? 'bg-purple-100 text-purple-800'
                          : admin.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {admin.role.replace('_', ' ').toUpperCase()}
                    </span>
                    {!admin.active && (
                      <span class="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                        INACTIVO
                      </span>
                    )}
                  </div>
                  
                  <p class="text-sm text-gray-600 mt-1">{admin.email}</p>
                  
                  <div class="mt-2 flex flex-wrap gap-1">
                    {Object.entries(admin.permissions)
                      .filter(([_, value]) => value)
                      .map(([permission]) => (
                        <span
                          key={permission}
                          class="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                        >
                          {permission.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      ))}
                  </div>
                  
                  <p class="text-xs text-gray-500 mt-2">
                    Creado: {admin.createdAt?.toDate?.()?.toLocaleDateString()} por {admin.createdBy}
                  </p>
                </div>
                
                <div class="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleActive(admin)}
                    disabled={admin.email === currentUser.value?.email}
                    class={`px-3 py-1 rounded text-sm transition-colors ${
                      admin.active
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {admin.active ? 'Desactivar' : 'Activar'}
                  </button>
                  
                  <button
                    onClick={() => startEdit(admin)}
                    class="text-blue-600 hover:text-blue-800 px-3 py-1 rounded text-sm hover:bg-blue-50"
                  >
                    Editar
                  </button>
                  
                  <button
                    onClick={() => handleDeleteAdmin(admin)}
                    disabled={admin.email === currentUser.value?.email || admin.role === 'super_admin'}
                    class="text-red-600 hover:text-red-800 px-3 py-1 rounded text-sm hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {admins.length === 0 && (
            <div class="text-center py-8 text-gray-500">
              No hay administradores registrados
            </div>
          )}
        </div>
      )}

      {/* Modal de agregar/editar administrador */}
      {(showAddForm || editingAdmin) && (
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 class="text-lg font-semibold mb-4">
              {editingAdmin ? 'Editar Administrador' : 'Agregar Nuevo Administrador'}
            </h3>
            
            <form onSubmit={editingAdmin ? handleEditAdmin : handleAddAdmin}>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onInput={(e) => handleInputChange('email', (e.target as HTMLInputElement).value)}
                    disabled={!!editingAdmin}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="admin@ejemplo.com"
                    required
                  />
                </div>

                {/* Nuevo campo de contraseña - solo para crear usuario */}
                {!editingAdmin && (
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onInput={(e) => handleInputChange('password', (e.target as HTMLInputElement).value)}
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                    />
                    <p class="text-xs text-gray-500 mt-1">
                      Esta contraseña se usará para crear la cuenta de usuario en Firebase Auth
                    </p>
                  </div>
                )}
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de Visualización
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onInput={(e) => handleInputChange('displayName', (e.target as HTMLInputElement).value)}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Juan Pérez"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Rol *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', (e.target as HTMLSelectElement).value)}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="editor">Editor - Gestión de instructores y eventos</option>
                    <option value="admin">Admin - Todas las funciones excepto gestión de admins</option>
                    <option value="super_admin">Super Admin - Acceso completo</option>
                  </select>
                  
                  <div class="mt-2 text-xs text-gray-600">
                    <strong>Permisos para {formData.role.replace('_', ' ')}:</strong>
                    <ul class="list-disc list-inside mt-1">
                      {Object.entries(ROLE_PERMISSIONS[formData.role])
                        .filter(([_, value]) => value)
                        .map(([permission]) => (
                          <li key={permission}>
                            {permission.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              <div class="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={isCreatingUser}
                  class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isCreatingUser && (
                    <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <span>
                    {isCreatingUser 
                      ? 'Creando Usuario...' 
                      : (editingAdmin ? 'Guardar Cambios' : 'Agregar Administrador')
                    }
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 