import { useState, useEffect } from 'preact/hooks';
import { publishedGlobalConfig, selectedWeek, navigateWeek, navigateMonth, formatDateDisplay, getPublishedWeekTitle, getCurrentMonth, userViewMode } from '../stores/schedule';
import ViewModeToggle from './ViewModeToggle';
import type { JSX } from 'preact';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import FilterBar from './FilterBar';

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
  const [isDownloading, setIsDownloading] = useState(false);
  
  const config = publishedGlobalConfig.value;
  const week = selectedWeek.value;
  const viewMode = userViewMode.value; // Usar el modo de vista específico para usuarios
  const currentMonth = getCurrentMonth();
  
  // Obtener el título específico de la semana actual
  const weekTitle = getPublishedWeekTitle();

  const handleNavigate = (direction: 'prev' | 'next') => {
    console.log('🔄 UserToolbar - Navegando:', { direction, viewMode, week });
    
    if (viewMode === 'weekly') {
      navigateWeek(direction);
    } else {
      navigateMonth(direction);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    const element = document.getElementById('schedule-grid');
    
    if (element) {
      // Encontrar el contenedor con scroll para expandirlo temporalmente
      const scrollContainer = element.querySelector('.overflow-x-auto.overflow-y-auto');
      let originalStyles: { [key: string]: string } = {};
      
      try {
        // Guardar estilos originales y remover restricciones de altura para capturar todo el contenido
        if (scrollContainer instanceof HTMLElement) {
          originalStyles = {
            maxHeight: scrollContainer.style.maxHeight || '',
            height: scrollContainer.style.height || '',
            overflow: scrollContainer.style.overflow || '',
            overflowY: scrollContainer.style.overflowY || '',
            overflowX: scrollContainer.style.overflowX || ''
          };
          
          // Remover restricciones para mostrar todo el contenido
          scrollContainer.style.maxHeight = 'none';
          scrollContainer.style.height = 'auto';
          scrollContainer.style.overflow = 'visible';
          scrollContainer.style.overflowY = 'visible';
          scrollContainer.style.overflowX = 'visible';
          
          // Esperar un momento para que el DOM se actualice
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
                // Capturar el elemento como imagen con todo el contenido visible
        const canvas = await html2canvas(element, {
          scale: 1.5, // Reducir escala para evitar problemas de memoria y tamaño
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          height: element.scrollHeight, // Capturar altura completa
          width: element.scrollWidth,   // Capturar ancho completo
          scrollX: 0,
          scrollY: 0,
          logging: false, // Desactivar logs para mejor rendimiento
          removeContainer: true
        });
        
        // Crear el PDF con tamaño automático basado en el contenido
        const imgData = canvas.toDataURL('image/png');
        
        // Calcular dimensiones del contenido
        const canvasAspectRatio = canvas.width / canvas.height;
        
        // Configurar PDF en orientación landscape por defecto
        let pdfWidth = 297; // A4 landscape width in mm
        let pdfHeight = 210; // A4 landscape height in mm
        
        // Si el contenido es muy alto, usar formato personalizado
        const contentHeightInMM = pdfWidth / canvasAspectRatio;
        if (contentHeightInMM > pdfHeight - 60) { // Dejar espacio para títulos
          pdfHeight = contentHeightInMM + 60; // Ajustar altura + espacio para títulos
        }
        
        const pdf = new jsPDF({
          orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [pdfWidth, pdfHeight]
        });
        
        // Agregar título
        pdf.setFontSize(16);
        pdf.text(weekTitle, 20, 20);
        pdf.setFontSize(12);
        pdf.text(`${formatDateDisplay(week.startDate)} - ${formatDateDisplay(week.endDate)}`, 20, 30);
        
        // Calcular dimensiones de la imagen respetando el aspect ratio
        const maxImageWidth = pdfWidth - 40; // Dejar márgenes
        const maxImageHeight = pdfHeight - 50; // Dejar espacio para título
        
        let imgWidth = maxImageWidth;
        let imgHeight = imgWidth / canvasAspectRatio;
        
        // Si la imagen es muy alta, ajustar por altura
        if (imgHeight > maxImageHeight) {
          imgHeight = maxImageHeight;
          imgWidth = imgHeight * canvasAspectRatio;
        }
        
        // Centrar la imagen
        const xPos = (pdfWidth - imgWidth) / 2;
        const yPos = 40;
        
        // Agregar la imagen del cronograma
        pdf.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight, undefined, 'FAST');
        
        // Descargar el PDF
        pdf.save(`cronograma-${formatDateDisplay(week.startDate)}.pdf`);
        
      } catch (error) {
        console.error('Error al generar el PDF:', error);
        alert('Error al generar el PDF. Por favor, inténtelo de nuevo.');
      } finally {
        setIsDownloading(false);
        // Restaurar estilos originales
        if (scrollContainer instanceof HTMLElement) {
          scrollContainer.style.maxHeight = originalStyles.maxHeight;
          scrollContainer.style.height = originalStyles.height;
          scrollContainer.style.overflow = originalStyles.overflow;
          scrollContainer.style.overflowY = originalStyles.overflowY;
          scrollContainer.style.overflowX = originalStyles.overflowX;
        }
      }
    }
  };

  return (
    <div class="space-y-4 w-full">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full space-y-2 sm:space-y-0">
        <div>
          <h2 class="text-lg font-bold text-gray-900">{weekTitle}</h2>
          <p class="text-sm text-gray-600">
            {formatDateDisplay(week.startDate)} - {formatDateDisplay(week.endDate)}
          </p>
        </div>
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <ViewModeToggle isAdmin={false} />
          <div class="flex items-center space-x-2">
            <button
              onClick={() => handleNavigate('prev')}
              class="flex-1 sm:flex-none flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              <span class="mr-1">←</span> Anterior
            </button>
            <button
              onClick={() => handleNavigate('next')}
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
      
      {/* Filtros */}
      <FilterBar isAdmin={false} />
    </div>
  );
} 