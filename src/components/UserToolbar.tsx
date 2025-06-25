import { useState } from 'preact/hooks';
import { publishedGlobalConfig, selectedWeek, navigateWeek, formatDateDisplay } from '../stores/schedule';
import type { JSX } from 'preact';

/**
 * Barra de herramientas para usuarios.
 * Proporciona controles de navegación y muestra información general.
 * 
 * @component
 * @returns {JSX.Element} Componente UserToolbar
 * 
 * @example
 * ```tsx
 * <UserToolbar />
 * ```
 */
export default function UserToolbar(): JSX.Element {
  const config = publishedGlobalConfig.value;
  const week = selectedWeek.value;

  const handleDownload = () => {
    const element = document.createElement('a');
    const content = document.getElementById('schedule-grid')?.outerHTML;
    
    if (content) {
      const blob = new Blob([`
        <html>
          <head>
            <title>${config.title} - ${formatDateDisplay(week.startDate)}</title>
            <meta charset="utf-8">
            <style>
              body { font-family: system, -apple-system, sans-serif; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ccc; padding: 8px; }
              th { background: #f0f0f0; }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `], { type: 'text/html' });
      
      element.href = URL.createObjectURL(blob);
      element.download = `cronograma-${formatDateDisplay(week.startDate)}.html`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  return (
    <div class="flex items-center justify-between w-full">
      <div>
        <h2 class="text-lg font-bold text-gray-900">{config.title}</h2>
        <p class="text-sm text-gray-600">
          {formatDateDisplay(week.startDate)} - {formatDateDisplay(week.endDate)}
        </p>
      </div>
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-2">
          <button
            onClick={() => navigateWeek('prev')}
            class="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            <span class="mr-1">←</span> Anterior
          </button>
          <button
            onClick={() => navigateWeek('next')}
            class="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            Siguiente <span class="ml-1">→</span>
          </button>
        </div>
        <button
          onClick={handleDownload}
          class="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
          Descargar
        </button>
      </div>
    </div>
  );
} 