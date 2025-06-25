import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { signal } from '@preact/signals';
import type { FirebaseApp } from 'firebase/app';
import app from './firebase';

// Inicializar Auth
const auth = getAuth(app as FirebaseApp);

// Señales para el estado de autenticación
export const currentUser = signal<User | null>(null);
export const isAdmin = signal<boolean>(false);
export const isLoading = signal<boolean>(true);

// Lista de correos electrónicos de administradores
const ADMIN_EMAILS: string[] = [
  'instructoresterpel@spira.co',
  // Agregar más correos de administradores según sea necesario
];

// Función para verificar si un usuario es administrador
const checkIfAdmin = (email: string | null): boolean => {
  return email ? ADMIN_EMAILS.includes(email) : false;
};

// Observador del estado de autenticación
onAuthStateChanged(auth, (user) => {
  isLoading.value = false;
  currentUser.value = user;
  isAdmin.value = user ? checkIfAdmin(user.email) : false;
});

// Función para iniciar sesión
export const login = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    isAdmin.value = checkIfAdmin(user.email);
    return { success: true, user };
  } catch (error: unknown) {
    console.error('Error al iniciar sesión:', error);
    return { 
      success: false, 
      error: (error as { code?: string })?.code === 'auth/invalid-credential'
        ? 'Credenciales inválidas' 
        : 'Error al iniciar sesión' 
    };
  }
};

// Función para cerrar sesión
export const logout = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error al cerrar sesión:', error);
    return { success: false, error: 'Error al cerrar sesión' };
  }
}; 