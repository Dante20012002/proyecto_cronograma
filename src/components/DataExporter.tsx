import { useState } from 'preact/hooks';
import * as XLSX from 'xlsx';
import { 
  draftScheduleRows, 
  publishedScheduleRows, 
  draftInstructors, 
  publishedInstructors,
  draftGlobalConfig,
  publishedGlobalConfig,
  getCurrentWeekTitle 
} from '../stores/schedule';
import { isSuperAdmin } from '../lib/auth';
import type { JSX } from 'preact';

interface DataExporterProps {
  onClose: () => void;
}

/**
 * Componente para exportar toda la data del sistema en formato Excel
 * Solo disponible para super administradores
 */
export default function DataExporter({ onClose }: DataExporterProps): JSX.Element {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'draft' | 'published' | 'both'>('both');

  // Verificar permisos
  if (!isSuperAdmin()) {
    return (
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div class="text-center">
            <div class="text-6xl mb-4">🚫</div>
            <h2 class="text-xl font-bold text-gray-900 mb-4">Acceso Denegado</h2>
            <p class="text-gray-600 mb-6">
              Solo los super administradores pueden acceder a la exportación completa del sistema.
            </p>
            <button
              onClick={onClose}
              class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Función para convertir eventos a formato Excel
   */
  const convertEventsToExcelFormat = (rows: any[], prefix: string) => {
    const events: any[] = [];

    rows.forEach(row => {
      Object.entries(row.events).forEach(([day, dayEvents]: [string, any[]]) => {
        dayEvents.forEach(event => {
          // Convertir día de fecha completa o número a nombre del día
          let dayName = '';
          if (day.includes('-')) {
            // Formato completo: 2024-01-15
            const date = new Date(day);
            const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            dayName = dayNames[date.getDay()];
          } else {
            // Formato número: necesitamos calcular basado en la semana actual
            try {
              const currentWeek = prefix === 'Draft' ? draftGlobalConfig.value.currentWeek : publishedGlobalConfig.value.currentWeek;
              const startDate = new Date(currentWeek.startDate);
              const targetDate = new Date(startDate);
              targetDate.setDate(parseInt(day));
              const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
              dayName = dayNames[targetDate.getDay()];
            } catch (error) {
              dayName = `dia_${day}`;
            }
          }

          // Separar hora de inicio y fin si existe
          let horaInicio = '';
          let horaFin = '';
          if (event.time) {
            const timeParts = event.time.split(' a ');
            if (timeParts.length === 2) {
              horaInicio = timeParts[0].trim();
              horaFin = timeParts[1].trim();
            } else {
              horaInicio = event.time;
            }
          }

          events.push({
            'Instructor': row.instructor,
            'Regional': row.regional,
            'Titulo': event.title,
            'Detalles': Array.isArray(event.details) ? event.details.join('; ') : event.details,
            'Ubicacion': event.location,
            'Dia': dayName,
            'Hora Inicio': horaInicio,
            'Hora Fin': horaFin,
            'Modalidad': event.modalidad || '',
            'Color': event.color,
            'Confirmado': event.confirmed ? 'SI' : 'NO',
            'ID Evento': event.id,
            'Fecha Completa': day,
            'Tipo': prefix
          });
        });
      });
    });

    return events;
  };

  /**
   * Función principal de exportación
   */
  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const wb = XLSX.utils.book_new();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // --- PESTAÑA 1: EVENTOS COMPLETOS ---
      let allEvents: any[] = [];
      
      if (exportType === 'draft' || exportType === 'both') {
        const draftEvents = convertEventsToExcelFormat(draftScheduleRows.value, 'Draft');
        allEvents = allEvents.concat(draftEvents);
      }
      
      if (exportType === 'published' || exportType === 'both') {
        const publishedEvents = convertEventsToExcelFormat(publishedScheduleRows.value, 'Published');
        allEvents = allEvents.concat(publishedEvents);
      }

      if (allEvents.length > 0) {
        const ws1 = XLSX.utils.json_to_sheet(allEvents);
        
        // Ajustar ancho de columnas
        const colWidths1 = [
          { wch: 25 }, // Instructor
          { wch: 15 }, // Regional
          { wch: 30 }, // Titulo
          { wch: 45 }, // Detalles
          { wch: 20 }, // Ubicacion
          { wch: 12 }, // Dia
          { wch: 15 }, // Hora Inicio
          { wch: 15 }, // Hora Fin
          { wch: 12 }, // Modalidad
          { wch: 15 }, // Color
          { wch: 10 }, // Confirmado
          { wch: 20 }, // ID Evento
          { wch: 15 }, // Fecha Completa
          { wch: 10 }  // Tipo
        ];
        ws1['!cols'] = colWidths1;
        
        XLSX.utils.book_append_sheet(wb, ws1, 'Eventos Completos');
      }

      // --- PESTAÑA 2: INSTRUCTORES ---
      let allInstructors: any[] = [];
      
      if (exportType === 'draft' || exportType === 'both') {
        const draftInstructorsData = draftInstructors.value.map(instructor => ({
          'Nombre': instructor.name,
          'Regional': instructor.regional,
          'ID': instructor.id,
          'Tipo': 'Draft'
        }));
        allInstructors = allInstructors.concat(draftInstructorsData);
      }
      
      if (exportType === 'published' || exportType === 'both') {
        const publishedInstructorsData = publishedInstructors.value.map(instructor => ({
          'Nombre': instructor.name,
          'Regional': instructor.regional,
          'ID': instructor.id,
          'Tipo': 'Published'
        }));
        allInstructors = allInstructors.concat(publishedInstructorsData);
      }

      if (allInstructors.length > 0) {
        const ws2 = XLSX.utils.json_to_sheet(allInstructors);
        
        const colWidths2 = [
          { wch: 30 }, // Nombre
          { wch: 20 }, // Regional
          { wch: 20 }, // ID
          { wch: 10 }  // Tipo
        ];
        ws2['!cols'] = colWidths2;
        
        XLSX.utils.book_append_sheet(wb, ws2, 'Instructores');
      }

      // --- PESTAÑA 3: CONFIGURACIÓN GLOBAL ---
      const configData: any[] = [];
      
      if (exportType === 'draft' || exportType === 'both') {
        configData.push({
          'Tipo': 'Draft',
          'Semana Inicio': draftGlobalConfig.value.currentWeek.startDate,
          'Semana Fin': draftGlobalConfig.value.currentWeek.endDate,
          'Titulo Semana': getCurrentWeekTitle(),
          'Exportado': timestamp
        });
      }
      
      if (exportType === 'published' || exportType === 'both') {
        configData.push({
          'Tipo': 'Published',
          'Semana Inicio': publishedGlobalConfig.value.currentWeek.startDate,
          'Semana Fin': publishedGlobalConfig.value.currentWeek.endDate,
          'Titulo Semana': getCurrentWeekTitle(),
          'Exportado': timestamp
        });
      }

      const ws3 = XLSX.utils.json_to_sheet(configData);
      
      const colWidths3 = [
        { wch: 12 }, // Tipo
        { wch: 15 }, // Semana Inicio
        { wch: 15 }, // Semana Fin
        { wch: 30 }, // Titulo Semana
        { wch: 25 }  // Exportado
      ];
      ws3['!cols'] = colWidths3;
      
      XLSX.utils.book_append_sheet(wb, ws3, 'Configuracion');

      // --- PESTAÑA 4: ESTADÍSTICAS ---
      const draftEventCount = draftScheduleRows.value.reduce((total, row) => {
        return total + Object.values(row.events).reduce((rowTotal, dayEvents) => {
          return rowTotal + dayEvents.length;
        }, 0);
      }, 0);

      const publishedEventCount = publishedScheduleRows.value.reduce((total, row) => {
        return total + Object.values(row.events).reduce((rowTotal, dayEvents) => {
          return rowTotal + dayEvents.length;
        }, 0);
      }, 0);

      const uniqueRegionals = [...new Set([
        ...draftInstructors.value.map(i => i.regional),
        ...publishedInstructors.value.map(i => i.regional)
      ])];

      const uniqueLocations = [...new Set([
        ...draftScheduleRows.value.flatMap(row => 
          Object.values(row.events).flatMap(dayEvents => 
            dayEvents.map(event => event.location)
          )
        ),
        ...publishedScheduleRows.value.flatMap(row => 
          Object.values(row.events).flatMap(dayEvents => 
            dayEvents.map(event => event.location)
          )
        )
      ])];

      const statsData = [
        { 'Estadistica': 'Instructores Draft', 'Valor': draftInstructors.value.length },
        { 'Estadistica': 'Instructores Published', 'Valor': publishedInstructors.value.length },
        { 'Estadistica': 'Eventos Draft', 'Valor': draftEventCount },
        { 'Estadistica': 'Eventos Published', 'Valor': publishedEventCount },
        { 'Estadistica': 'Regionales Únicas', 'Valor': uniqueRegionals.length },
        { 'Estadistica': 'Ubicaciones Únicas', 'Valor': uniqueLocations.length },
        { 'Estadistica': 'Fecha Exportación', 'Valor': new Date().toLocaleString('es-ES') },
        { 'Estadistica': 'Exportado Por', 'Valor': 'Super Administrator' },
        { 'Estadistica': 'Tipo Exportación', 'Valor': exportType.toUpperCase() }
      ];

      const ws4 = XLSX.utils.json_to_sheet(statsData);
      
      const colWidths4 = [
        { wch: 25 }, // Estadistica
        { wch: 30 }  // Valor
      ];
      ws4['!cols'] = colWidths4;
      
      XLSX.utils.book_append_sheet(wb, ws4, 'Estadisticas');

      // --- PESTAÑA 5: REGIONALES Y UBICACIONES ---
      const maxLength = Math.max(uniqueRegionals.length, uniqueLocations.length);
      const regionalesUbicaciones = [];
      
      for (let i = 0; i < maxLength; i++) {
        regionalesUbicaciones.push({
          'Regionales Únicas': i < uniqueRegionals.length ? uniqueRegionals[i] : '',
          'Ubicaciones Únicas': i < uniqueLocations.length ? uniqueLocations[i] : ''
        });
      }

      const ws5 = XLSX.utils.json_to_sheet(regionalesUbicaciones);
      
      const colWidths5 = [
        { wch: 25 }, // Regionales Únicas
        { wch: 35 }  // Ubicaciones Únicas
      ];
      ws5['!cols'] = colWidths5;
      
      XLSX.utils.book_append_sheet(wb, ws5, 'Regionales y Ubicaciones');

      // Generar nombre del archivo
      const fileName = `cronograma-export-${exportType}-${timestamp}.xlsx`;
      
      // Guardar el archivo
      XLSX.writeFile(wb, fileName);
      
      // Mostrar mensaje de éxito
      const message = `✅ Exportación completa exitosa!

📊 Archivo generado: ${fileName}

📋 Contenido exportado:
• ${allEvents.length} eventos totales
• ${allInstructors.length} instructores
• Configuración del sistema
• Estadísticas completas
• Regionales y ubicaciones

🎯 Tipo de exportación: ${exportType.toUpperCase()}

El archivo se ha descargado automáticamente.`;

      alert(message);
      onClose();

    } catch (error) {
      console.error('❌ Error al exportar datos:', error);
      alert('❌ Error al exportar los datos del sistema. Revisa la consola para más detalles.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-900">📤 Exportar Sistema Completo</h2>
            <button
              onClick={onClose}
              class="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Descripción */}
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 class="font-semibold text-blue-900 mb-2">📋 Sobre esta exportación:</h3>
            <ul class="text-sm text-blue-800 space-y-1">
              <li>• Exporta toda la información del sistema en formato Excel</li>
              <li>• Compatible con el formato de importación del sistema</li>
              <li>• Incluye eventos, instructores, configuración y estadísticas</li>
              <li>• Solo disponible para super administradores</li>
              <li>• Útil para respaldos y análisis de datos</li>
            </ul>
          </div>

          {/* Selección de tipo de exportación */}
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-3">
              Tipo de datos a exportar:
            </label>
            <div class="space-y-2">
              <label class="flex items-center">
                <input
                  type="radio"
                  name="exportType"
                  value="both"
                  checked={exportType === 'both'}
                  onChange={(e) => setExportType((e.target as HTMLInputElement).value as any)}
                  class="mr-2"
                />
                <span class="text-sm">📊 <strong>Ambos</strong> - Datos en borrador y publicados (Recomendado)</span>
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  name="exportType"
                  value="draft"
                  checked={exportType === 'draft'}
                  onChange={(e) => setExportType((e.target as HTMLInputElement).value as any)}
                  class="mr-2"
                />
                <span class="text-sm">📝 <strong>Solo Borrador</strong> - Datos en edición</span>
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  name="exportType"
                  value="published"
                  checked={exportType === 'published'}
                  onChange={(e) => setExportType((e.target as HTMLInputElement).value as any)}
                  class="mr-2"
                />
                <span class="text-sm">📢 <strong>Solo Publicados</strong> - Datos visibles para usuarios</span>
              </label>
            </div>
          </div>

          {/* Información del contenido */}
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h3 class="font-semibold text-gray-900 mb-2">📁 Contenido del archivo Excel:</h3>
            <ul class="text-sm text-gray-700 space-y-1">
              <li>• <strong>Eventos Completos:</strong> Todos los eventos con detalles completos</li>
              <li>• <strong>Instructores:</strong> Lista completa de instructores</li>
              <li>• <strong>Configuración:</strong> Configuración global del sistema</li>
              <li>• <strong>Estadísticas:</strong> Resumen numérico del sistema</li>
              <li>• <strong>Regionales y Ubicaciones:</strong> Listas únicas de regionales y ubicaciones</li>
            </ul>
          </div>

          {/* Botones de acción */}
          <div class="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isExporting}
              class="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              class={`px-6 py-2 rounded-lg transition-colors ${
                isExporting
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isExporting ? '⏳ Exportando...' : '📤 Exportar Excel'}
            </button>
          </div>

          {/* Advertencia de seguridad */}
          <div class="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div class="flex items-start space-x-2">
              <span class="text-yellow-600">⚠️</span>
              <div class="text-yellow-800 text-sm">
                <strong>Importante:</strong> Esta exportación contiene toda la información del sistema. 
                Maneja el archivo con cuidado y no lo compartas con usuarios no autorizados.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
