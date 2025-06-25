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
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full space-y-2 sm:space-y-0">
      <div>
        <h2 class="text-lg font-bold text-gray-900">{config.title}</h2>
        <p class="text-sm text-gray-600">
          {formatDateDisplay(week.startDate)} - {formatDateDisplay(week.endDate)}
        </p>
      </div>
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
        <div class="flex items-center space-x-2">
          <button
            onClick={() => navigateWeek('prev')}
            class="flex-1 sm:flex-none flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            <span class="mr-1">←</span> Anterior
          </button>
          <button
            onClick={() => navigateWeek('next')}
            class="flex-1 sm:flex-none flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            Siguiente <span class="ml-1">→</span>
          </button>
        </div>
        <button
          onClick={handleDownload}
          class="flex-1 sm:flex-none flex items-center justify-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
        >
          <span class="mr-1">↓</span> Descargar
        </button>
      </div>
    </div>
  );
} 