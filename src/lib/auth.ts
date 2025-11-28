import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { signal } from '@preact/signals';
import type { FirebaseApp } from 'firebase/app';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import app from './firebase';

// Inicializar Auth
const auth = getAuth(app as FirebaseApp);

// Señales para el estado de autenticación
export const currentUser = signal<User | null>(null);
export const isAdmin = signal<boolean>(false);
export const isLoading = signal<boolean>(true);
export const userPermissions = signal<AdminPermissions | null>(null);

// Interfaz para los permisos de usuario
export interface AdminPermissions {
  canPublish: boolean;
  canEditGlobalConfig: boolean;
  canManageInstructors: boolean;
  canUploadExcel: boolean;
  canManageAdmins: boolean;
  canAccessDebugPanel: boolean;
}

// Interfaz para datos de administrador
interface AdminUserData {
  role: 'super_admin' | 'admin' | 'editor';
  permissions: AdminPermissions;
  active: boolean;
  displayName?: string;
  createdAt: any;
  createdBy: string;
  lastModified?: any;
  modifiedBy?: string;
}

// Lista de administradores de emergencia (solo para casos extremos)
// TODO: Remover después de migrar todos los administradores a Firestore
const EMERGENCY_ADMIN_EMAILS: string[] = [
  'instructoresterpel@spira.co',
];

/**
 * Función para verificar si un usuario es administrador usando Firestore
 * @param email - Email del usuario a verificar
 * @returns Promise<boolean> - True si es administrador activo
 */
const checkIfAdminInFirestore = async (email: string): Promise<{
  isAdmin: boolean;
  permissions: AdminPermissions | null;
}> => {
  try {
    const adminDoc = await getDoc(doc(db, 'admins', email));
    
    if (adminDoc.exists()) {
      const adminData = adminDoc.data() as AdminUserData;
      
      // Verificar que el administrador esté activo
      if (adminData.active) {
        return {
          isAdmin: true,
          permissions: adminData.permissions
        };
      } else {
        return { isAdmin: false, permissions: null };
      }
    } else {
      return { isAdmin: false, permissions: null };
    }
  } catch (error) {
    console.error('❌ Error verificando admin en Firestore:', error);
    return { isAdmin: false, permissions: null };
  }
};

/**
 * Función de respaldo para verificar administradores de emergencia
 * Solo se usa si Firestore no está disponible o como medida de emergencia
 * @param email - Email del usuario
 * @returns boolean - True si está en la lista de emergencia
 */
const checkEmergencyAdmin = (email: string): boolean => {
  const isEmergencyAdmin = EMERGENCY_ADMIN_EMAILS.includes(email);
  return isEmergencyAdmin;
};

/**
 * Función principal para verificar si un usuario es administrador
 * Intenta usar Firestore primero, y usa lista de emergencia como respaldo
 * @param email - Email del usuario a verificar
 * @returns Promise<boolean> - True si es administrador
 */
const checkIfAdmin = async (email: string | null): Promise<{
  isAdmin: boolean;
  permissions: AdminPermissions | null;
}> => {
  if (!email) {
    return { isAdmin: false, permissions: null };
  }

  try {
    // Intentar verificar en Firestore primero
    const firestoreResult = await checkIfAdminInFirestore(email);
    
    if (firestoreResult.isAdmin) {
      return firestoreResult;
    }

    // Si no se encuentra en Firestore, verificar lista de emergencia
    const isEmergencyAdmin = checkEmergencyAdmin(email);
    
    if (isEmergencyAdmin) {
      // Permisos completos para administradores de emergencia
      const emergencyPermissions: AdminPermissions = {
        canPublish: true,
        canEditGlobalConfig: true,
        canManageInstructors: true,
        canUploadExcel: true,
        canManageAdmins: true,
        canAccessDebugPanel: true,
      };
      
      return { isAdmin: true, permissions: emergencyPermissions };
    }

    return { isAdmin: false, permissions: null };
    
  } catch (error) {
    console.error('Error en verificación de admin:', error);
    
    // En caso de error, usar lista de emergencia como último recurso
    const isEmergencyAdmin = checkEmergencyAdmin(email);
    if (isEmergencyAdmin) {
      const emergencyPermissions: AdminPermissions = {
        canPublish: true,
        canEditGlobalConfig: true,
        canManageInstructors: true,
        canUploadExcel: true,
        canManageAdmins: true,
        canAccessDebugPanel: true,
      };
      return { isAdmin: true, permissions: emergencyPermissions };
    }
    
    return { isAdmin: false, permissions: null };
  }
};

// Observador del estado de autenticación
onAuthStateChanged(auth, async (user) => {
  isLoading.value = true;
  currentUser.value = user;
  
  if (user?.email) {
    try {
      const { isAdmin: adminStatus, permissions } = await checkIfAdmin(user.email);
      isAdmin.value = adminStatus;
      userPermissions.value = permissions;
    } catch (error) {
      console.error('Error verificando permisos de usuario:', error);
      isAdmin.value = false;
      userPermissions.value = null;
    }
  } else {
    isAdmin.value = false;
    userPermissions.value = null;
  }
  
  isLoading.value = false;
});

/**
 * Función para verificar un permiso específico del usuario actual
 * @param permission - Nombre del permiso a verificar
 * @returns boolean - True si el usuario tiene el permiso
 */
export const hasPermission = (permission: keyof AdminPermissions): boolean => {
  return userPermissions.value?.[permission] || false;
};

/**
 * Función para revalidar los permisos del usuario actual
 * Útil después de cambios en los permisos del usuario
 */
export const revalidatePermissions = async (): Promise<void> => {
  if (currentUser.value?.email) {
    const { isAdmin: adminStatus, permissions } = await checkIfAdmin(currentUser.value.email);
    isAdmin.value = adminStatus;
    userPermissions.value = permissions;
  }
};

/**
 * Función para iniciar sesión
 * @param email - Email del usuario
 * @param password - Contraseña del usuario
 * @returns Promise con resultado del login
 */
export const login = async (email: string, password: string) => {
  try {    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Verificar permisos de administrador
    const { isAdmin: adminStatus, permissions } = await checkIfAdmin(user.email);
    isAdmin.value = adminStatus;
    userPermissions.value = permissions;
    
    return { success: true, user };
  } catch (error: unknown) {
    return { 
      success: false, 
      error: (error as { code?: string })?.code === 'auth/invalid-credential'
        ? 'Credenciales inválidas' 
        : 'Error al iniciar sesión' 
    };
  }
};

/**
 * Función para cerrar sesión
 * @returns Promise con resultado del logout
 */
export const logout = async () => {
  try {
    await signOut(auth);
    
    // Limpiar estados
    isAdmin.value = false;
    userPermissions.value = null;
    
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: 'Error al cerrar sesión' };
  }
};

/**
 * Script de migración para crear el primer super administrador
 * Esta función debe ejecutarse una sola vez para configurar el sistema
 */
export const initializeSuperAdmin = async (): Promise<void> => {
  if (!import.meta.env.DEV) {
    return;
  }

  try {
    const { setDoc, serverTimestamp } = await import('firebase/firestore');
    
    const superAdminData = {
      role: 'super_admin' as const,
      permissions: {
        canPublish: true,
        canEditGlobalConfig: true,
        canManageInstructors: true,
        canUploadExcel: true,
        canManageAdmins: true,
        canAccessDebugPanel: true,
      } as AdminPermissions,
      active: true,
      displayName: 'Super Administrador',
      createdAt: serverTimestamp(),
      createdBy: 'system_initialization'
    };

    await setDoc(doc(db, 'admins', 'instructoresterpel@spira.co'), superAdminData);
    
  } catch (error) {
    console.error('Error inicializando super administrador:', error);
  }
};

/**
 * Función para exponer herramientas de debugging en el cliente
 * Solo se ejecuta en el navegador, nunca durante SSR
 */
export const exposeDebugTools = (): void => {
  // Verificar que estamos en el navegador y en modo desarrollo
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    (window as any).initializeSuperAdmin = initializeSuperAdmin;
  }
}; 