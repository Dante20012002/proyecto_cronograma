import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import ScheduleGrid from './ScheduleGrid.tsx';
import InstructorManager from './InstructorManager.tsx';
import GlobalConfig from './GlobalConfig.tsx';
import AdminToolbar from './AdminToolbar.tsx';
import UserToolbar from './UserToolbar.tsx';
import { initializeFirebase, cleanupFirebase, isConnected } from '../stores/schedule';

export default function CronogramaWrapper() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const connected = useStore(isConnected);

  useEffect(() => {
    // Leer el parámetro de la URL en el cliente
    const urlParams = new URLSearchParams(window.location.search);
    const adminMode = urlParams.get('mode') === 'admin';
    setIsAdmin(adminMode);
    
    // Inicializar Firebase
    initializeFirebase().then(() => {
      setIsLoading(false);
    }).catch((error) => {
      console.error('Error inicializando Firebase:', error);
      setIsLoading(false);
    });

    // Cleanup al desmontar
    return () => {
      cleanupFirebase();
    };
  }, []);

  if (isLoading) {
    return (
      <div class="max-w-7xl mx-auto space-y-8">
        <div class="animate-pulse">
          <div class="h-8 bg-gray-200 rounded mb-4"></div>
          <div class="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div class="max-w-7xl mx-auto space-y-8">
      {/* Indicador de estado de conexión */}
      {!connected && (
        <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong class="font-bold">Sin conexión: </strong>
          <span class="block sm:inline">Los cambios se guardarán localmente hasta que se restablezca la conexión.</span>
        </div>
      )}
      
      {isAdmin ? (
        <>
          <AdminToolbar />
          <GlobalConfig />
          <InstructorManager />
        </>
      ) : (
        <UserToolbar />
      )}
      <ScheduleGrid isAdmin={isAdmin} />
    </div>
  );
} 