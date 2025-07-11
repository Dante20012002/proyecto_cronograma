import { useState } from 'preact/hooks';
import { publishedGlobalConfig, selectedWeek, navigateWeek, formatDateDisplay, getPublishedWeekTitle } from '../stores/schedule';
import type { JSX } from 'preact';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  
  // Obtener el título específico de la semana actual
  const weekTitle = getPublishedWeekTitle();

  const handleDownload = async () => {
    const element = document.getElementById('schedule-grid');
    
    if (element) {
      try {
        // Capturar el elemento como imagen
        const canvas = await html2canvas(element, {
          scale: 2, // Mejor calidad de imagen
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });
        
        // Crear el PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'landscape', // Paisaje para mejor ajuste del cronograma
          unit: 'mm',
          format: 'a4'
        });
        
        // Calcular dimensiones para ajustar la imagen al PDF
        const imgWidth = 297; // Ancho A4 en paisaje
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Agregar título al PDF (usar el título específico de la semana)
        pdf.setFontSize(16);
        pdf.text(weekTitle, 20, 20);
        pdf.setFontSize(12);
        pdf.text(`${formatDateDisplay(week.startDate)} - ${formatDateDisplay(week.endDate)}`, 20, 30);
        
        // Agregar la imagen del cronograma
        pdf.addImage(imgData, 'PNG', 0, 40, imgWidth, imgHeight);
        
        // Descargar el PDF
        pdf.save(`cronograma-${formatDateDisplay(week.startDate)}.pdf`);
        
      } catch (error) {
        console.error('Error al generar el PDF:', error);
        alert('Error al generar el PDF. Por favor, inténtelo de nuevo.');
      }
    }
  };

  return (
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full space-y-2 sm:space-y-0">
      <div>
        <h2 class="text-lg font-bold text-gray-900">{weekTitle}</h2>
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