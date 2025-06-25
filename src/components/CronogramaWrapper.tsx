import { useState, useEffect } from 'preact/hooks';
import { isConnected, initializeFirebase, cleanupFirebase } from '../stores/schedule';
import { isAdmin, currentUser } from '../lib/auth';
import type { JSX } from 'preact';
import AdminToolbar from './AdminToolbar';
import UserToolbar from './UserToolbar';
import ScheduleGrid from './ScheduleGrid';
import { LoginForm } from './LoginForm';
import GlobalConfig from './GlobalConfig';
import InstructorManager from './InstructorManager';

/**
 * Componente principal que envuelve toda la funcionalidad del cronograma.
 * Maneja la inicialización de Firebase y la lógica de autenticación.
 * 
 * @component
 * @returns {JSX.Element} Componente CronogramaWrapper
 * 
 * @example
 * ```tsx
 * <CronogramaWrapper />
 * ```
 */
export default function CronogramaWrapper(): JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showInstructors, setShowInstructors] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // Inicializar Firebase al montar el componente
    initializeFirebase().catch(err => {
      console.error('Error al inicializar Firebase:', err);
      setError('Error al conectar con el servidor. Por favor, recarga la página.');
    });

    // Limpiar suscripciones al desmontar
    return () => {
      cleanupFirebase();
    };
  }, []);

  if (error) {
    return (
      <div class="min-h-screen bg-gray-100 p-4">
        <div class="max-w-7xl mx-auto">
          <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md">
            <p class="font-bold">Error</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected.value) {
    return (
      <div class="min-h-screen bg-gray-100 p-4">
        <div class="max-w-7xl mx-auto">
          <div class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-lg shadow-md">
            <p class="font-bold">Conectando...</p>
            <p>Estableciendo conexión con el servidor. Por favor, espera un momento.</p>
          </div>
        </div>
      </div>
    );
  }

  // Si el usuario está intentando acceder como admin pero no está autenticado
  if (showLogin && !currentUser.value) {
    return (
      <div class="min-h-screen bg-gray-100 p-4">
        <div class="max-w-7xl mx-auto">
          <LoginForm onCancel={() => setShowLogin(false)} />
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-gray-100 p-4">
      <div class="max-w-7xl mx-auto space-y-4">
        {isAdmin.value ? (
          <>
            <AdminToolbar />
            <div class="bg-white rounded-lg shadow-md p-4">
              <div class="flex justify-end space-x-2">
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  class="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors"
                >
                  {showConfig ? 'Ocultar Configuración' : 'Configuración Global'}
                </button>
                <button
                  onClick={() => setShowInstructors(!showInstructors)}
                  class="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
                >
                  {showInstructors ? 'Ocultar Instructores' : 'Gestionar Instructores'}
                </button>
              </div>
              {showConfig && <div class="mt-4"><GlobalConfig /></div>}
              {showInstructors && <div class="mt-4"><InstructorManager /></div>}
            </div>
          </>
        ) : (
          <div class="flex justify-between items-center bg-white rounded-lg shadow-md p-4">
            <UserToolbar />
            <div class="ml-8">
              <button
                onClick={() => setShowLogin(true)}
                class="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
              >
                Acceso Administrador
              </button>
            </div>
          </div>
        )}
        <ScheduleGrid isAdmin={isAdmin.value} />
      </div>
    </div>
  );
} 