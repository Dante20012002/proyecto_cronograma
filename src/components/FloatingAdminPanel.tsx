import { useState } from 'preact/hooks';
import { hasPermission, isSuperAdmin } from '../lib/auth';
import GlobalConfig from './GlobalConfig';
import InstructorManager from './InstructorManager';
import AdminManager from './AdminManager';
import AdminDebugPanel from './AdminDebugPanel';
import DataExporter from './DataExporter';
import ModulesAndProgramsManager from './ModulesAndProgramsManager';
import type { JSX } from 'preact';

interface TooltipProps {
  text: string;
  children: JSX.Element;
}

/**
 * Componente tooltip para mostrar texto en hover
 */
function Tooltip({ text, children }: TooltipProps): JSX.Element {
  const [show, setShow] = useState(false);

  return (
    <div 
      class="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div class="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap z-50 shadow-lg">
          {text}
          <div class="absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-[6px] border-l-gray-900 border-t-[6px] border-b-[6px] border-t-transparent border-b-transparent"></div>
        </div>
      )}
    </div>
  );
}

interface FloatingButtonProps {
  icon: string;
  tooltip: string;
  onClick: () => void;
  color: string;
}

/**
 * Botón flotante individual con icono y tooltip
 */
function FloatingButton({ icon, tooltip, onClick, color }: FloatingButtonProps): JSX.Element {
  return (
    <Tooltip text={tooltip}>
      <button
        onClick={onClick}
        class={`w-12 h-12 ${color} text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center text-lg font-semibold border-2 border-white`}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: JSX.Element;
  maxWidth?: string;
}

/**
 * Modal flotante para los paneles
 */
function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-4xl" }: ModalProps): JSX.Element {
  if (!isOpen) return <></>;

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class={`bg-white rounded-lg ${maxWidth} w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl`}>
        {/* Header del modal */}
        <div class="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h2 class="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        {/* Contenido del modal */}
        <div class="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Panel flotante de herramientas administrativas.
 * Proporciona acceso rápido a todas las funciones de administración mediante botones flotantes.
 * Solo visible para administradores autenticados.
 * Se oculta automáticamente cuando hay otros modales abiertos.
 * 
 * @component
 * @returns {JSX.Element} Componente FloatingAdminPanel
 */
export default function FloatingAdminPanel(): JSX.Element {
  const [activePanel, setActivePanel] = useState<string | null>(null);

  const openPanel = (panel: string) => setActivePanel(panel);
  const closePanel = () => setActivePanel(null);

  // Detectar si hay otros modales abiertos en la página
  const hasOtherModalsOpen = () => {
    // Buscar elementos con z-index alto que indiquen modales activos
    const existingModals = document.querySelectorAll('[class*="z-80"], [class*="z-50"]');
    return existingModals.length > 0;
  };

  const buttons = [
    {
      id: 'config',
      icon: '⚙️',
      tooltip: 'Filtros de Fecha y Titulo Semanal',
      color: 'bg-indigo-600 hover:bg-indigo-700',
      permission: 'canEditGlobalConfig',
      title: '⚙️ Filtros de Fecha y Titulo Semanal'
    },
    {
      id: 'instructors',
      icon: '👨‍🏫',
      tooltip: 'Gestionar Instructores',
      color: 'bg-purple-600 hover:bg-purple-700',
      permission: 'canManageInstructors',
      title: '👨‍🏫 Gestión de Instructores'
    },
    {
      id: 'modules',
      icon: '🎯',
      tooltip: 'Gestionar Módulos y Programas',
      color: 'bg-blue-600 hover:bg-blue-700',
      permission: 'canManageAdmins', // Solo Super Admins
      title: '🎯 Gestión de Módulos y Programas'
    },
    {
      id: 'admins',
      icon: '👥',
      tooltip: 'Gestionar Administradores',
      color: 'bg-red-600 hover:bg-red-700',
      permission: 'canManageAdmins',
      title: '👥 Gestión de Administradores'
    },
    {
      id: 'debug',
      icon: '🛠️',
      tooltip: 'Panel de Debugging',
      color: 'bg-yellow-600 hover:bg-yellow-700',
      permission: 'canAccessDebugPanel',
      title: '🛠️ Panel de Debugging'
    },
    {
      id: 'export',
      icon: '📤',
      tooltip: 'Exportar Toda la Data',
      color: 'bg-green-600 hover:bg-green-700',
      permission: 'canPublish', // Super Admins y Admins
      title: '📤 Exportar Sistema'
    }
  ];

  // Filtrar botones basados en permisos
  const visibleButtons = buttons.filter(button => hasPermission(button.permission as any));

  if (visibleButtons.length === 0) {
    return <></>;
  }

  return (
    <>
      {/* Panel flotante de botones - solo visible cuando no hay otros modales */}
      <div 
        class={`fixed right-4 top-1/2 transform -translate-y-1/2 z-30 flex flex-col space-y-3 transition-opacity duration-300 ${
          activePanel ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {visibleButtons.map((button) => (
          <FloatingButton
            key={button.id}
            icon={button.icon}
            tooltip={button.tooltip}
            onClick={() => openPanel(button.id)}
            color={button.color}
          />
        ))}
      </div>

      {/* Modales para cada panel */}
      <Modal
        isOpen={activePanel === 'config'}
        onClose={closePanel}
        title="⚙️ Filtros de Fecha y Titulo Semanal"
        maxWidth="max-w-2xl"
      >
        <GlobalConfig />
      </Modal>

      <Modal
        isOpen={activePanel === 'instructors'}
        onClose={closePanel}
        title="👨‍🏫 Gestión de Instructores"
        maxWidth="max-w-4xl"
      >
        <InstructorManager />
      </Modal>

      <Modal
        isOpen={activePanel === 'modules'}
        onClose={closePanel}
        title="🎯 Gestión de Módulos y Programas"
        maxWidth="max-w-5xl"
      >
        <ModulesAndProgramsManager />
      </Modal>

      <Modal
        isOpen={activePanel === 'admins'}
        onClose={closePanel}
        title="👥 Gestión de Administradores"
        maxWidth="max-w-5xl"
      >
        <AdminManager />
      </Modal>

      <Modal
        isOpen={activePanel === 'debug'}
        onClose={closePanel}
        title="🛠️ Panel de Debugging"
        maxWidth="max-w-6xl"
      >
        <AdminDebugPanel />
      </Modal>

      {/* Modal para exportación de datos - renderizado directamente sin Modal wrapper */}
      {activePanel === 'export' && (
        <DataExporter onClose={closePanel} />
      )}
    </>
  );
}
