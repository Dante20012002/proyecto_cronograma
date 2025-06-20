import { useEffect, useState } from 'preact/hooks';
import ScheduleGrid from './ScheduleGrid.tsx';
import InstructorManager from './InstructorManager.tsx';
import GlobalConfig from './GlobalConfig.tsx';
import AdminToolbar from './AdminToolbar.tsx';
import UserToolbar from './UserToolbar.tsx';

export default function CronogramaWrapper() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Leer el parámetro de la URL en el cliente
    const urlParams = new URLSearchParams(window.location.search);
    const adminMode = urlParams.get('mode') === 'admin';
    setIsAdmin(adminMode);
    setIsLoading(false);
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