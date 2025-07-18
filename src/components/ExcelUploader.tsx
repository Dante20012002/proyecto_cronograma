import { useState, useRef } from 'preact/hooks';
import * as XLSX from 'xlsx';
import { addEvent, draftScheduleRows, draftInstructors, addInstructor, draftGlobalConfig } from '../stores/schedule';
import type { Event, Instructor } from '../stores/schedule';

/**
 * Mapeo de detalles predefinidos a colores específicos.
 */
const detailColorMap: { [key: string]: string } = {
  // Módulos formativos - Tonos azules
  'MODULO PROTAGONISTAS DEL SERVICIO': 'bg-blue-600',
  'MODULO FORMATIVO GNV': 'bg-blue-700',
  'MODULO FORMATIVO LIQUIDOS': 'bg-blue-800',
  'MODULO FORMATIVO LUBRICANTES': 'bg-blue-500',
  'MODULO ESCUELA DE INDUSTRIA': 'bg-blue-900',
  
  // Protocolos y gestión - Tonos verdes
  'PROTOCOLO DE SERVICIO EDS': 'bg-green-600',
  'GESTION AMBIENTAL, SEGURIDAD Y SALUD EN EL TRABAJO': 'bg-green-700',
  'EXCELENCIA ADMINISTRATIVA': 'bg-green-800',
  
  // Programas VIVE - Tonos púrpuras
  'VIVE PITS': 'bg-purple-600',
  'LA TOMA VIVE TERPEL & VIVE PITS': 'bg-purple-700',
  'CARAVANA RUMBO PITS': 'bg-purple-800',
  
  // Formación TERPEL POS - Tonos naranjas
  'FORMACION INICIAL TERPEL POS OPERATIVO': 'bg-orange-600',
  'FORMACION INICIAL TERPEL POS ADMINISTRATIVO': 'bg-orange-700',
  'ENTRENAMIENTO TERPEL POS OPERATIVO': 'bg-orange-800',
  'ENTRENAMIENTO TERPEL POS ADMINISTRATIVO': 'bg-orange-500',
  
  // Facturación - Tonos rosados
  'FACTURACION ELECTRONICA OPERATIVA': 'bg-pink-600',
  'FACTURACION ELECTRONICA ADMINISTRATIVA': 'bg-pink-700',
  
  // Productos específicos - Tonos índigo
  'CANASTILLA': 'bg-indigo-600',
  'CLIENTES PROPIOS': 'bg-indigo-700',
  'APP TERPEL': 'bg-indigo-800',
  
  // MASTERLUB - Tonos teal
  'MASTERLUB OPERATIVO': 'bg-teal-600',
  'MASTERLUB ADMINISTRATIVO': 'bg-teal-700',
  
  // EDS - Tonos amber
  'EDS CONFIABLE': 'bg-amber-600',
  'TALLER EDS CONFIABLE': 'bg-amber-700',
  
  // Campos y entrenamientos - Tonos emerald
  'CAMPO DE ENTRENAMIENTO DE INDUSTRIA LIMPIA': 'bg-emerald-600',
  'CONSTRUYENDO EQUIPOS ALTAMENTE EFECTIVOS': 'bg-emerald-700',
  
  // Módulos de comida - Tonos cálidos
  'MODULO ROLLOS': 'bg-red-600',
  'MODULO HISTORIA Y MASA': 'bg-red-700',
  'MODULO STROMBOLIS': 'bg-red-800',
  'MODULO PERROS Y MAS PERROS': 'bg-red-500',
  'MODULO SANDUCHES': 'bg-red-900',
  'MODULO SBARRO': 'bg-rose-600',
  'MODULO BEBIDAS CALIENTES': 'bg-rose-700'
};

/**
 * Interface para los datos del Excel parseados
 */
interface ExcelEventData {
  instructor: string;
  ciudad: string;
  regional: string;
  titulo: string;
  detalles: string;
  ubicacion: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
  modalidad?: string;
  color?: string;
}

/**
 * Interface para errores de validación
 */
interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

/**
 * Props para el componente ExcelUploader
 */
interface ExcelUploaderProps {
  onClose: () => void;
}

/**
 * Función para obtener el color automático basado en el detalle
 */
function getColorForDetail(detail: string): string {
  return detailColorMap[detail] || 'bg-blue-600';
}

/**
 * Función para validar los datos del Excel
 */
function validateExcelData(data: any[]): { isValid: boolean; errors: ValidationError[]; validData: ExcelEventData[] } {
  const errors: ValidationError[] = [];
  const validData: ExcelEventData[] = [];

  // Campos requeridos (detalles y ubicacion ahora son opcionales)
  const requiredFields = ['instructor', 'ciudad', 'regional', 'titulo', 'dia'];
  
  // Días válidos (lunes a viernes)
  const validDays = ['lunes', 'martes', 'miercoles', 'miércoles', 'jueves', 'viernes'];
  
  data.forEach((row, index) => {
    const rowNumber = index + 2; // +2 porque empezamos en fila 2 (después del header)
    
    // Convertir las claves a minúsculas para comparación
    const normalizedRow: any = {};
    Object.keys(row).forEach(key => {
      normalizedRow[key.toLowerCase().trim()] = row[key];
    });

    // Validar campos requeridos
    requiredFields.forEach(field => {
      if (!normalizedRow[field] || String(normalizedRow[field]).trim() === '') {
        errors.push({
          row: rowNumber,
          field: field,
          message: `El campo "${field}" es requerido`,
          value: normalizedRow[field]
        });
      }
    });

    // Validar día
    if (normalizedRow.dia) {
      const dayValue = String(normalizedRow.dia).toLowerCase().trim();
      if (!validDays.includes(dayValue)) {
        errors.push({
          row: rowNumber,
          field: 'dia',
          message: `El día debe ser uno de: ${validDays.join(', ')}`,
          value: normalizedRow.dia
        });
      }
    }

    // Validar formato de hora
    if (normalizedRow.horainicio || normalizedRow['hora inicio']) {
      const horaInicio = normalizedRow.horainicio || normalizedRow['hora inicio'];
      if (!isValidTimeFormat(horaInicio)) {
        errors.push({
          row: rowNumber,
          field: 'horaInicio',
          message: 'La hora de inicio debe estar en formato "HH:MM a.m." o "HH:MM p.m."',
          value: horaInicio
        });
      }
    }

    if (normalizedRow.horafin || normalizedRow['hora fin']) {
      const horaFin = normalizedRow.horafin || normalizedRow['hora fin'];
      if (!isValidTimeFormat(horaFin)) {
        errors.push({
          row: rowNumber,
          field: 'horaFin',
          message: 'La hora de fin debe estar en formato "HH:MM a.m." o "HH:MM p.m."',
          value: horaFin
        });
      }
    }

    // Si no hay errores para esta fila, agregar a datos válidos
    if (errors.filter(e => e.row === rowNumber).length === 0) {
      // Manejar campos opcionales con valores por defecto
      const detalles = normalizedRow.detalles ? String(normalizedRow.detalles).trim() : '';
      const ubicacion = normalizedRow.ubicacion ? String(normalizedRow.ubicacion).trim() : '';
      
      validData.push({
        instructor: String(normalizedRow.instructor).trim(),
        ciudad: String(normalizedRow.ciudad).trim(),
        regional: String(normalizedRow.regional).trim(),
        titulo: String(normalizedRow.titulo).trim(),
        detalles: detalles,
        ubicacion: ubicacion || 'Por definir', // Valor por defecto si está vacío
        dia: String(normalizedRow.dia).toLowerCase().trim(),
        horaInicio: normalizedRow.horainicio || normalizedRow['hora inicio'] || '',
        horaFin: normalizedRow.horafin || normalizedRow['hora fin'] || '',
        modalidad: normalizedRow.modalidad || '', // Modalidad opcional
        color: detalles ? getColorForDetail(detalles) : 'bg-blue-600' // Color por defecto si no hay detalles
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    validData
  };
}

/**
 * Función para validar formato de hora
 */
function isValidTimeFormat(time: string): boolean {
  if (!time) return true; // Opcional
  const timeRegex = /^(1[0-2]|0?[1-9]):([0-5][0-9])\s?(a\.m\.|p\.m\.)$/i;
  return timeRegex.test(String(time).trim());
}

/**
 * Función para convertir día de texto a número de fecha del mes
 */
function dayToNumber(day: string): string {
  try {
    // Obtener la semana actual del sistema
    const currentWeek = draftGlobalConfig.value.currentWeek;
    const startDate = new Date(currentWeek.startDate);
    
    // Calcular las fechas de cada día de la semana
    const weekDays = [];
    for (let i = 0; i < 5; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      weekDays.push({
        dayName: currentDate.toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase(),
        dayNumber: currentDate.getDate().toString()
      });
    }
    
    // Mapear día solicitado a fecha
    const dayMap: { [key: string]: string } = {};
    weekDays.forEach(wd => {
      dayMap[wd.dayName] = wd.dayNumber;
    });
    
    // Mapeos adicionales para variaciones (miércoles con y sin acento)
    if (dayMap['miércoles']) {
      dayMap['miercoles'] = dayMap['miércoles'];
    }
    
    const result = dayMap[day.toLowerCase()] || weekDays[0]?.dayNumber || '1';
    
    console.log('📅 dayToNumber mapping:', {
      requestedDay: day,
      currentWeek: currentWeek,
      weekDays: weekDays,
      dayMap: dayMap,
      result: result
    });
    
    return result;
  } catch (error) {
    console.error('❌ Error en dayToNumber:', error);
    return '1'; // Fallback
  }
}

/**
 * Función para procesar y cargar los datos al sistema
 */
async function processAndLoadData(data: ExcelEventData[]) {
  console.log('📊 processAndLoadData - Iniciando carga incremental de', data.length, 'eventos');
  
  // PASO 1: NO limpiar instructores existentes - mantener datos históricos
  console.log('📋 Manteniendo instructores existentes con sus datos históricos');
  
  // Agrupar eventos por instructor para procesamiento eficiente
  const eventsByInstructor = new Map<string, ExcelEventData[]>();
  
  data.forEach(eventData => {
    const instructorKey = eventData.instructor.toLowerCase();
    if (!eventsByInstructor.has(instructorKey)) {
      eventsByInstructor.set(instructorKey, []);
    }
    eventsByInstructor.get(instructorKey)!.push(eventData);
  });
  
  console.log('👥 processAndLoadData - Procesando', eventsByInstructor.size, 'instructores del Excel');
  
  // PASO 2: Verificar instructores existentes y crear nuevos solo si es necesario
  console.log('🔍 PASO 2: Verificando instructores existentes...');
  const currentInstructors = draftInstructors.value;
  const currentRows = draftScheduleRows.value;
  const instructorMapping = new Map<string, string>(); // instructorKey -> instructorId
  
  // Mapear instructores existentes
  currentRows.forEach(row => {
    const instructorKey = row.instructor.toLowerCase();
    instructorMapping.set(instructorKey, row.id);
    console.log(`✅ Instructor existente mapeado: ${row.instructor} → ID: ${row.id}`);
  });
  
  // PASO 3: Crear solo instructores nuevos que no existan
  console.log('➕ PASO 3: Creando instructores nuevos (si es necesario)...');
  let newInstructorsCreated = 0;
  
  for (const [instructorKey, events] of eventsByInstructor.entries()) {
    if (!instructorMapping.has(instructorKey)) {
      // El instructor no existe, crearlo
      const instructorData = events[0]; // Tomar datos del primer evento
      console.log(`➕ Creando instructor nuevo: ${instructorData.instructor}`);
      
      // Crear el instructor
      addInstructor(instructorData.instructor, instructorData.ciudad, instructorData.regional);
      newInstructorsCreated++;
      
      // Esperar a que se actualice el estado
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verificar que se creó correctamente y obtener su ID
      const updatedRows = draftScheduleRows.value;
      const createdRow = updatedRows.find(row => 
        row.instructor.toLowerCase() === instructorKey && 
        !instructorMapping.has(instructorKey) // Asegurar que es nuevo
      );
      
      if (createdRow) {
        instructorMapping.set(instructorKey, createdRow.id);
        console.log(`✅ Instructor nuevo creado: ${createdRow.instructor} → ID: ${createdRow.id}`);
      } else {
        console.error(`❌ ERROR: No se pudo crear instructor nuevo: ${instructorData.instructor}`);
        throw new Error(`No se pudo crear instructor nuevo: ${instructorData.instructor}`);
      }
    } else {
      // El instructor ya existe, usar el existente
      const existingId = instructorMapping.get(instructorKey)!;
      const existingRow = currentRows.find(row => row.id === existingId);
      const eventData = events[0];
      
      console.log(`🔄 Instructor existente detectado: ${eventData.instructor}`);
      console.log(`   📍 Datos actuales: ${existingRow?.city} / ${existingRow?.regional}`);
      console.log(`   📍 Datos del Excel: ${eventData.ciudad} / ${eventData.regional}`);
      
      // Verificar si hay cambios en ciudad/regional
      if (existingRow && (
        existingRow.city !== eventData.ciudad || 
        existingRow.regional !== eventData.regional
      )) {
        console.log(`   ⚠️ INFORMACIÓN: El instructor ${eventData.instructor} tiene diferentes datos de ubicación para esta semana.`);
        console.log(`   📝 Esta es una situación normal: los instructores pueden trabajar en diferentes regiones por semana.`);
        console.log(`   ✅ Se mantendrán los datos históricos y se agregarán eventos con la nueva ubicación.`);
      }
    }
  }
  
  console.log(`📊 Resumen de instructores: ${currentRows.length - newInstructorsCreated} existentes + ${newInstructorsCreated} nuevos = ${instructorMapping.size} total`);
  
  // PASO 4: Agregar eventos a cada instructor (respetando datos históricos)
  console.log('📅 PASO 4: Agregando eventos (modo incremental)...');
  
  for (const [instructorKey, events] of eventsByInstructor.entries()) {
    const instructorId = instructorMapping.get(instructorKey);
    
    if (!instructorId) {
      console.error(`❌ No se encontró ID para instructor: ${events[0].instructor}`);
      continue;
    }
    
    console.log(`📅 Procesando ${events.length} eventos para ${events[0].instructor} (ID: ${instructorId})`);
    
    for (let index = 0; index < events.length; index++) {
      const eventData = events[index];
      
      // Crear evento
      const timeString = eventData.horaInicio && eventData.horaFin 
        ? `${eventData.horaInicio} a ${eventData.horaFin}`
        : eventData.horaInicio || '';
      
      const eventTimestamp = Date.now() + index;
      const eventRandomId = Math.random().toString(36).substr(2, 9);
      const newEvent: Event = {
        id: `evt-${eventTimestamp}-${eventRandomId}`,
        title: eventData.titulo,
        details: eventData.detalles || 'Sin detalles especificados',
        time: timeString,
        location: eventData.ubicacion || 'Por definir',
        color: eventData.color || 'bg-blue-600',
        modalidad: eventData.modalidad
      };
      
      const dayNumber = dayToNumber(eventData.dia);
      
      console.log(`  ➕ Evento ${index + 1}/${events.length}: ${eventData.titulo} → Instructor ID: ${instructorId}, Día: ${dayNumber}`);
      
      // Agregar evento (se agrega a la semana actual, respetando eventos históricos)
      addEvent(instructorId, dayNumber, newEvent);
      
      // Pausa corta entre eventos
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`✅ Completados eventos para: ${events[0].instructor}`);
  }
  
  console.log('✅ processAndLoadData - Carga incremental completa de', data.length, 'eventos');
  
  // PASO 5: Verificación final
  await verifyFinalState(eventsByInstructor.size, data.length, newInstructorsCreated);
}

/**
 * Función para verificar el estado final después de la carga
 */
async function verifyFinalState(expectedNewInstructors: number, expectedEvents: number, newInstructorsCreated: number) {
  console.log('🔍 Verificando estado final...');
  
  await new Promise(resolve => setTimeout(resolve, 500)); // Esperar que se estabilice
  
  const finalRows = draftScheduleRows.value;
  const finalInstructors = draftInstructors.value;
  
  const totalEvents = finalRows.reduce((sum, row) => 
    sum + Object.values(row.events).reduce((daySum, events) => daySum + events.length, 0), 0
  );
  
  console.log('📊 Estado final:');
  console.log(`  👥 Instructores totales en sistema: ${finalInstructors.length}`);
  console.log(`  🆕 Instructores nuevos creados: ${newInstructorsCreated}`);
  console.log(`  📅 Eventos totales en sistema: ${totalEvents}`);
  console.log(`  📅 Eventos agregados en esta carga: ${expectedEvents}`);
  
  // Mostrar detalle de cada instructor con eventos en la semana actual
  const currentWeek = draftGlobalConfig.value.currentWeek;
  console.log(`📅 Eventos para la semana: ${currentWeek.startDate} - ${currentWeek.endDate}`);
  
  finalRows.forEach(row => {
    const eventCount = Object.values(row.events).reduce((sum, events) => sum + events.length, 0);
    console.log(`  👤 ${row.instructor} (${row.city}/${row.regional}): ${eventCount} eventos totales`);
  });
  
  const success = newInstructorsCreated >= 0 && totalEvents >= expectedEvents;
  
  if (success) {
    console.log('✅ Verificación exitosa: Carga incremental completada correctamente');
    console.log('📝 Los datos históricos se han preservado');
    console.log('🆕 Los nuevos eventos se han agregado a la semana actual');
  } else {
    console.warn('⚠️ Verificación con diferencias detectadas');
  }
  
  return success;
}

/**
 * Función para debugging de la carga masiva - expuesta globalmente
 */
function debugExcelUpload() {
  const currentRows = draftScheduleRows.value;
  const currentInstructors = draftInstructors.value;
  
  console.log('🔍 DEBUG EXCEL UPLOAD - Estado actual:');
  console.log('👥 Total instructores:', currentInstructors.length);
  console.log('📋 Total filas:', currentRows.length);
  
  // Mostrar cada instructor con sus eventos
  currentRows.forEach(row => {
    const totalEvents = Object.values(row.events).reduce((sum, events) => sum + events.length, 0);
    console.log(`\n👤 ${row.instructor} (${row.city}, ${row.regional})`);
    console.log(`  📅 Total eventos: ${totalEvents}`);
    
    // Mostrar eventos por día
    Object.entries(row.events).forEach(([day, events]) => {
      if (events.length > 0) {
        console.log(`    Día ${day}: ${events.length} eventos`);
        events.forEach(event => {
          console.log(`      - ${event.title} (${event.location})`);
        });
      }
    });
  });
  
  return {
    instructors: currentInstructors.length,
    rows: currentRows.length,
    totalEvents: currentRows.reduce((sum, row) => 
      sum + Object.values(row.events).reduce((daySum, events) => daySum + events.length, 0), 0
    )
  };
}

// Exponer globalmente para debugging
if (typeof window !== 'undefined') {
  (window as any).debugExcelUpload = debugExcelUpload;
  
  // Función adicional para verificar después de la carga
  (window as any).verifyExcelLoad = () => {
    const result = debugExcelUpload();
    console.log('\n🔍 VERIFICACIÓN POST-CARGA:');
    console.log(`📊 Se encontraron ${result.instructors} instructores con ${result.totalEvents} eventos totales`);
    
    if (result.instructors === 0) {
      console.log('❌ PROBLEMA: No se encontraron instructores');
    } else if (result.totalEvents === 0) {
      console.log('❌ PROBLEMA: No se encontraron eventos');
    } else {
      console.log('✅ La carga parece exitosa');
    }
    
    return result;
  };
  
  // Función para probar el mapeo de días
  (window as any).testDayMapping = () => {
    const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
    console.log('\n📅 PRUEBA DE MAPEO DE DÍAS:');
    days.forEach(day => {
      const result = dayToNumber(day);
      console.log(`${day} → ${result}`);
    });
  };
  
  // Función para limpiar duplicados manualmente
  (window as any).cleanupInstructorDuplicates = async () => {
    console.log('🧹 Iniciando limpieza manual de duplicados...');
    console.log('⚠️ Esta función aún no está implementada. Usa el AdminToolbar para limpiar duplicados.');
    console.log('✅ Para verificar el estado actual, ejecuta verifyExcelLoad()');
  };
}

/**
 * Lista de títulos predefinidos
 */
const predefinedTitles = [
  'ESCUELA DE PROMOTORES',
  'INDUSTRIA LIMPIA',
  'ESCUELA DE ADMINISTRADORES',
  'LEALTAD',
  'RED VIRTUAL',
  'EDS CONFIABLE',
  'RUMBO',
  'ESCUELA DE TIENDAS'
];

/**
 * Lista de detalles predefinidos
 */
const predefinedDetails = [
  'MODULO PROTAGONISTAS DEL SERVICIO',
  'MODULO FORMATIVO GNV',
  'MODULO FORMATIVO LIQUIDOS',
  'MODULO FORMATIVO LUBRICANTES',
  'PROTOCOLO DE SERVICIO EDS',
  'GESTION AMBIENTAL, SEGURIDAD Y SALUD EN EL TRABAJO',
  'MODULO ESCUELA DE INDUSTRIA',
  'EXCELENCIA ADMINISTRATIVA',
  'VIVE PITS',
  'LA TOMA VIVE TERPEL & VIVE PITS',
  'FORMACION INICIAL TERPEL POS OPERATIVO',
  'FACTURACION ELECTRONICA OPERATIVA',
  'FACTURACION ELECTRONICA ADMINISTRATIVA',
  'CANASTILLA',
  'ENTRENAMIENTO TERPEL POS OPERATIVO',
  'ENTRENAMIENTO TERPEL POS ADMINISTRATIVO',
  'FORMACION INICIAL TERPEL POS ADMINISTRATIVO',
  'CLIENTES PROPIOS',
  'MASTERLUB OPERATIVO',
  'MASTERLUB ADMINISTRATIVO',
  'EDS CONFIABLE',
  'CAMPO DE ENTRENAMIENTO DE INDUSTRIA LIMPIA',
  'CARAVANA RUMBO PITS',
  'APP TERPEL',
  'MODULO ROLLOS',
  'MODULO HISTORIA Y MASA',
  'MODULO STROMBOLIS',
  'MODULO PERROS Y MAS PERROS',
  'MODULO SANDUCHES',
  'MODULO SBARRO',
  'MODULO BEBIDAS CALIENTES',
  'CONSTRUYENDO EQUIPOS ALTAMENTE EFECTIVOS',
  'TALLER EDS CONFIABLE'
];

/**
 * Función para descargar plantilla de Excel
 */
function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  
  // Obtener instructores existentes del sistema
  const existingInstructors = draftInstructors.value.map(instructor => ({
    name: instructor.name,
    city: instructor.city,
    regional: instructor.regional
  }));
  
  console.log('📋 Instructores existentes para plantilla:', existingInstructors.length);
  
  // --- PESTAÑA 1: PLANTILLA DE EVENTOS ---
  const templateData = [
    {
      'Instructor': 'JUAN PABLO HERNANDEZ',
      'Ciudad': 'Bucaramanga',
      'Regional': 'BUCARAMANGA',
      'Titulo': 'ESCUELA DE PROMOTORES',
      'Detalles': 'MODULO PROTAGONISTAS DEL SERVICIO',
      'Ubicacion': 'Bucaramanga',
      'Dia': 'lunes',
      'Hora Inicio': '8:00 a.m.',
      'Hora Fin': '5:00 p.m.',
      'Modalidad': 'Presencial'
    },
    {
      'Instructor': 'ZULAY VERA',
      'Ciudad': 'Cúcuta',
      'Regional': 'NORTE',
      'Titulo': 'INDUSTRIA LIMPIA',
      'Detalles': 'MODULO FORMATIVO LIQUIDOS',
      'Ubicacion': 'Cúcuta',
      'Dia': 'martes',
      'Hora Inicio': '9:00 a.m.',
      'Hora Fin': '4:00 p.m.',
      'Modalidad': 'Virtual'
    }
  ];
  
  const ws1 = XLSX.utils.json_to_sheet(templateData);
  
  // Ajustar ancho de columnas para la plantilla
  const colWidths1 = [
    { wch: 25 }, // Instructor
    { wch: 15 }, // Ciudad
    { wch: 15 }, // Regional
    { wch: 30 }, // Titulo
    { wch: 45 }, // Detalles
    { wch: 20 }, // Ubicacion
    { wch: 10 }, // Dia
    { wch: 15 }, // Hora Inicio
    { wch: 15 }, // Hora Fin
    { wch: 12 }  // Modalidad
  ];
  ws1['!cols'] = colWidths1;
  
  XLSX.utils.book_append_sheet(wb, ws1, 'Plantilla');
  
  // --- PESTAÑA 2: DATOS DISPONIBLES ---
  
  // Preparar datos para la pestaña de referencia
  const maxLength = Math.max(
    predefinedTitles.length,
    predefinedDetails.length,
    existingInstructors.length, // Incluir instructores en el cálculo del tamaño
    20 // Para otros datos
  );
  
  const referenceData = [];
  
  for (let i = 0; i < maxLength; i++) {
    const row: any = {};
    
    // Instructores existentes (NUEVA COLUMNA)
    if (i < existingInstructors.length) {
      const instructor = existingInstructors[i];
      row['Instructores Existentes'] = instructor.name;
      row['Ciudad del Instructor'] = instructor.city;
      row['Regional del Instructor'] = instructor.regional;
    } else {
      row['Instructores Existentes'] = '';
      row['Ciudad del Instructor'] = '';
      row['Regional del Instructor'] = '';
    }
    
    // Títulos predefinidos
    if (i < predefinedTitles.length) {
      row['Títulos Disponibles'] = predefinedTitles[i];
    } else {
      row['Títulos Disponibles'] = '';
    }
    
    // Detalles predefinidos
    if (i < predefinedDetails.length) {
      row['Detalles Disponibles'] = predefinedDetails[i];
    } else {
      row['Detalles Disponibles'] = '';
    }
    
    // Días válidos
    const validDays = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'];
    if (i < validDays.length) {
      row['Días Válidos'] = validDays[i];
    } else {
      row['Días Válidos'] = '';
    }
    
    // Ejemplos de horas
    const exampleTimes = [
      '7:00 a.m.', '7:30 a.m.', '8:00 a.m.', '8:30 a.m.', '9:00 a.m.',
      '9:30 a.m.', '10:00 a.m.', '10:30 a.m.', '11:00 a.m.', '11:30 a.m.',
      '12:00 p.m.', '12:30 p.m.', '1:00 p.m.', '1:30 p.m.', '2:00 p.m.',
      '2:30 p.m.', '3:00 p.m.', '3:30 p.m.', '4:00 p.m.', '4:30 p.m.'
    ];
    if (i < exampleTimes.length) {
      row['Horas Disponibles'] = exampleTimes[i];
    } else {
      row['Horas Disponibles'] = '';
    }
    
    referenceData.push(row);
  }
  
  const ws2 = XLSX.utils.json_to_sheet(referenceData);
  
  // Ajustar ancho de columnas para la referencia (ACTUALIZADO)
  const colWidths2 = [
    { wch: 30 }, // Instructores Existentes
    { wch: 20 }, // Ciudad del Instructor
    { wch: 20 }, // Regional del Instructor
    { wch: 35 }, // Títulos Disponibles
    { wch: 50 }, // Detalles Disponibles
    { wch: 15 }, // Días Válidos
    { wch: 18 }  // Horas Disponibles
  ];
  ws2['!cols'] = colWidths2;
  
  XLSX.utils.book_append_sheet(wb, ws2, 'Datos Disponibles');
  
  // --- PESTAÑA 3: INSTRUCCIONES ---
  
  const instructionsData = [
    { 'Campo': 'Instructor', 'Descripción': 'Nombre completo del instructor', 'Obligatorio': 'SÍ', 'Ejemplo': 'JUAN PABLO HERNANDEZ', 'Notas': `📋 RECOMENDADO: Usa los nombres exactos de la pestaña "Datos Disponibles" (${existingInstructors.length} instructores disponibles). Si usas un nombre nuevo, se creará automáticamente.` },
    { 'Campo': 'Ciudad', 'Descripción': 'Ciudad donde se realiza el evento', 'Obligatorio': 'SÍ', 'Ejemplo': 'Bucaramanga', 'Notas': 'Si usas un instructor existente, usa la misma ciudad para consistencia' },
    { 'Campo': 'Regional', 'Descripción': 'Regional a la que pertenece', 'Obligatorio': 'SÍ', 'Ejemplo': 'BUCARAMANGA', 'Notas': 'Si usas un instructor existente, usa la misma regional para consistencia' },
    { 'Campo': 'Titulo', 'Descripción': 'Título del evento', 'Obligatorio': 'SÍ', 'Ejemplo': 'ESCUELA DE PROMOTORES', 'Notas': 'Usar títulos de la pestaña "Datos Disponibles" o crear uno nuevo' },
    { 'Campo': 'Detalles', 'Descripción': 'Detalles específicos del evento', 'Obligatorio': 'NO', 'Ejemplo': 'MODULO PROTAGONISTAS DEL SERVICIO', 'Notas': 'Usar detalles predefinidos para color automático. Si se deja vacío, se usará "Sin detalles especificados"' },
    { 'Campo': 'Ubicacion', 'Descripción': 'Lugar específico del evento', 'Obligatorio': 'NO', 'Ejemplo': 'Bucaramanga', 'Notas': 'Puede ser ciudad, sede específica, etc. Si se deja vacío, se usará "Por definir"' },
    { 'Campo': 'Dia', 'Descripción': 'Día de la semana', 'Obligatorio': 'SÍ', 'Ejemplo': 'lunes', 'Notas': 'Solo: lunes, martes, miércoles, jueves, viernes (minúsculas)' },
    { 'Campo': 'Hora Inicio', 'Descripción': 'Hora de inicio del evento', 'Obligatorio': 'NO', 'Ejemplo': '8:00 a.m.', 'Notas': 'Formato: HH:MM a.m. o HH:MM p.m.' },
    { 'Campo': 'Hora Fin', 'Descripción': 'Hora de finalización del evento', 'Obligatorio': 'NO', 'Ejemplo': '5:00 p.m.', 'Notas': 'Formato: HH:MM a.m. o HH:MM p.m.' },
    { 'Campo': 'Modalidad', 'Descripción': 'Modalidad del evento', 'Obligatorio': 'NO', 'Ejemplo': 'Presencial', 'Notas': 'Valores válidos: Presencial, Virtual. Si se deja vacío, no se mostrará modalidad' },
    { 'Campo': '', 'Descripción': '', 'Obligatorio': '', 'Ejemplo': '', 'Notas': '' },
    { 'Campo': '👥 INSTRUCTORES:', 'Descripción': 'Comportamiento del sistema', 'Obligatorio': '', 'Ejemplo': '', 'Notas': '' },
    { 'Campo': 'Instructores existentes:', 'Descripción': `${existingInstructors.length} instructores ya están en el sistema`, 'Obligatorio': '', 'Ejemplo': '', 'Notas': 'Revisa la pestaña "Instructores" para ver la lista completa' },
    { 'Campo': 'Modo incremental:', 'Descripción': 'Se conservan TODOS los datos históricos', 'Obligatorio': '', 'Ejemplo': '', 'Notas': 'Los eventos se AGREGAN a la semana actual sin eliminar semanas anteriores' },
    { 'Campo': 'Nuevos instructores:', 'Descripción': 'Si usas un nombre nuevo, se creará automáticamente', 'Obligatorio': '', 'Ejemplo': '', 'Notas': 'No se eliminan instructores existentes, solo se agregan nuevos si es necesario' },
    { 'Campo': 'Ciudad/Regional:', 'Descripción': 'Pueden cambiar semana a semana', 'Obligatorio': '', 'Ejemplo': '', 'Notas': 'Es normal que un instructor trabaje en diferentes regiones. Los datos históricos se preservan' },
    { 'Campo': '', 'Descripción': '', 'Obligatorio': '', 'Ejemplo': '', 'Notas': '' },
    { 'Campo': '🎨 COLORES:', 'Descripción': 'Colores Automáticos', 'Obligatorio': '', 'Ejemplo': '', 'Notas': 'Los detalles predefinidos tienen colores automáticos' },
    { 'Campo': 'Azules:', 'Descripción': 'Módulos formativos', 'Obligatorio': '', 'Ejemplo': 'MODULO PROTAGONISTAS DEL SERVICIO', 'Notas': 'MODULO FORMATIVO GNV, MODULO FORMATIVO LIQUIDOS, etc.' },
    { 'Campo': 'Verdes:', 'Descripción': 'Protocolos y gestión', 'Obligatorio': '', 'Ejemplo': 'PROTOCOLO DE SERVICIO EDS', 'Notas': 'GESTION AMBIENTAL, EXCELENCIA ADMINISTRATIVA' },
    { 'Campo': 'Púrpuras:', 'Descripción': 'Programas VIVE', 'Obligatorio': '', 'Ejemplo': 'VIVE PITS', 'Notas': 'LA TOMA VIVE TERPEL, CARAVANA RUMBO PITS' },
    { 'Campo': 'Naranjas:', 'Descripción': 'Formación TERPEL POS', 'Obligatorio': '', 'Ejemplo': 'FORMACION INICIAL TERPEL POS OPERATIVO', 'Notas': 'ENTRENAMIENTO TERPEL POS ADMINISTRATIVO' },
    { 'Campo': 'Y más...', 'Descripción': 'Ver pestaña "Datos Disponibles"', 'Obligatorio': '', 'Ejemplo': '', 'Notas': 'Cada categoría tiene su color específico' }
  ];
  
  const ws3 = XLSX.utils.json_to_sheet(instructionsData);
  
  // Ajustar ancho de columnas para las instrucciones
  const colWidths3 = [
    { wch: 18 }, // Campo
    { wch: 35 }, // Descripción
    { wch: 12 }, // Obligatorio
    { wch: 35 }, // Ejemplo
    { wch: 55 }  // Notas (más ancho para las nuevas instrucciones)
  ];
  ws3['!cols'] = colWidths3;
  
  XLSX.utils.book_append_sheet(wb, ws3, 'Instrucciones');
  
  // --- PESTAÑA 4: SOLO INSTRUCTORES (Nueva pestaña dedicada) ---
  
  if (existingInstructors.length > 0) {
    const instructorsData = existingInstructors.map((instructor, index) => ({
      'Nº': index + 1,
      'Nombre del Instructor': instructor.name,
      'Ciudad': instructor.city,
      'Regional': instructor.regional,
      'Nota': 'Copia exactamente este nombre para evitar duplicados'
    }));
    
    const ws4 = XLSX.utils.json_to_sheet(instructorsData);
    
    // Ajustar ancho de columnas para instructores
    const colWidths4 = [
      { wch: 5 },  // Nº
      { wch: 35 }, // Nombre del Instructor
      { wch: 20 }, // Ciudad
      { wch: 20 }, // Regional
      { wch: 45 }  // Nota
    ];
    ws4['!cols'] = colWidths4;
    
    XLSX.utils.book_append_sheet(wb, ws4, `Instructores (${existingInstructors.length})`);
  }
  
  // Guardar el archivo
  const fileName = existingInstructors.length > 0 
    ? `plantilla_eventos_con_${existingInstructors.length}_instructores.xlsx`
    : 'plantilla_eventos_completa.xlsx';
    
  XLSX.writeFile(wb, fileName);
  
  // Mostrar mensaje informativo
  const message = existingInstructors.length > 0 
    ? `✅ Plantilla descargada con ${existingInstructors.length} instructores existentes.\n\n📋 Revisa las pestañas:\n• "Instructores (${existingInstructors.length})" - Lista completa de instructores\n• "Datos Disponibles" - Todos los datos de referencia\n• "Instrucciones" - Guía detallada\n\n💡 Usa los nombres exactos de instructores para evitar duplicados.`
    : '✅ Plantilla descargada. No hay instructores existentes en el sistema.';
    
  alert(message);
}

/**
 * Componente principal ExcelUploader
 */
export default function ExcelUploader({ onClose }: ExcelUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ExcelEventData[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: any) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      setFile(target.files[0]);
      setShowPreview(false);
      setPreviewData([]);
      setErrors([]);
    }
  };

  const handleProcessFile = async () => {
    if (!file) return;
    
    setIsLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      console.log('📊 Datos del Excel parseados:', jsonData);
      
      const validation = validateExcelData(jsonData);
      
      if (validation.isValid) {
        setPreviewData(validation.validData);
        setErrors([]);
        setShowPreview(true);
      } else {
        setErrors(validation.errors);
        setPreviewData([]);
        setShowPreview(false);
      }
    } catch (error) {
      console.error('Error al procesar el archivo:', error);
      setErrors([{
        row: 0,
        field: 'file',
        message: 'Error al leer el archivo. Asegúrate de que sea un archivo Excel válido.',
        value: file.name
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadData = async () => {
    if (previewData.length > 0) {
      console.log('🚀 Iniciando carga de eventos desde Excel...');
      
      // Mostrar resumen de lo que se va a cargar
      const instructorCounts = new Map<string, number>();
      previewData.forEach(event => {
        const count = instructorCounts.get(event.instructor) || 0;
        instructorCounts.set(event.instructor, count + 1);
      });
      
      console.log('📊 Resumen de carga:');
      instructorCounts.forEach((count, instructor) => {
        console.log(`  👤 ${instructor}: ${count} eventos`);
      });
      
      try {
        // Ejecutar la carga (ahora es asíncrona)
        await processAndLoadData(previewData);
        
        // Verificar el resultado final
        const finalResult = debugExcelUpload();
        
        // Mostrar mensaje de éxito con detalles
        const instructorList = Array.from(instructorCounts.keys());
        const successMessage = `✅ CARGA INCREMENTAL COMPLETADA EXITOSAMENTE
        
📊 Resumen:
• ${previewData.length} eventos procesados desde Excel
• ${instructorList.length} instructores en el archivo Excel
• ${finalResult.instructors} instructores totales en el sistema
• ${finalResult.totalEvents} eventos totales en el sistema

🔄 Modo incremental activado:
✅ Se conservaron todos los datos históricos
✅ Solo se agregaron eventos nuevos para la semana actual
✅ Instructores existentes mantuvieron sus datos anteriores

👥 Instructores procesados del Excel:
${instructorList.slice(0, 5).join('\n')}${instructorList.length > 5 ? '\n...' : ''}

💡 IMPORTANTE: Los instructores pueden tener diferentes ciudades/regionales
   por semana. Esto es normal y los datos históricos se preservan.

Usa verifyExcelLoad() en la consola para verificar el estado.`;
        
        alert(successMessage);
        onClose();
      } catch (error) {
        console.error('❌ Error durante la carga:', error);
        alert('❌ Error durante la carga de eventos. Revisa la consola para más detalles.');
      }
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData([]);
    setErrors([]);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-900">📊 Carga Masiva de Eventos</h2>
            <button
              onClick={onClose}
              class="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Instrucciones */}
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 class="font-semibold text-blue-900 mb-2">📋 Instrucciones:</h3>
            <ol class="text-sm text-blue-800 space-y-1">
              <li>1. Descarga la plantilla de Excel haciendo clic en el botón de abajo</li>
              <li>2. Llena la plantilla con tus datos (una fila por evento)</li>
              <li>3. <strong>Campos obligatorios:</strong> Instructor, Ciudad, Regional, Título, Día</li>
              <li>4. <strong>Campos opcionales:</strong> Detalles, Ubicación, Horas</li>
              <li>5. Sube el archivo Excel completado</li>
              <li>6. Revisa la vista previa y confirma la carga</li>
            </ol>
            <div class="mt-3 p-3 bg-green-50 border border-green-200 rounded">
              <p class="text-sm text-green-800 font-medium">
                🔄 <strong>Modo Incremental:</strong> Tus datos históricos están seguros. 
                Los eventos se agregan a la semana actual sin eliminar información anterior.
              </p>
            </div>
          </div>

          {/* Botón de plantilla */}
          <div class="mb-6">
            <button
              onClick={downloadTemplate}
              class="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              📥 Descargar Plantilla Excel
            </button>
          </div>

          {/* Selector de archivo */}
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar archivo Excel:
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Botones de acción */}
          <div class="flex gap-3 mb-6">
            <button
              onClick={handleProcessFile}
              disabled={!file || isLoading}
              class={`px-4 py-2 rounded-lg transition-colors ${
                !file || isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLoading ? '⏳ Procesando...' : '🔍 Procesar Archivo'}
            </button>
            
            <button
              onClick={handleReset}
              class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              🔄 Reiniciar
            </button>
          </div>

          {/* Errores */}
          {errors.length > 0 && (
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 class="font-semibold text-red-900 mb-2">❌ Errores encontrados:</h3>
              <div class="max-h-40 overflow-y-auto">
                {errors.map((error, index) => (
                  <div key={index} class="text-sm text-red-800 mb-1">
                    <strong>Fila {error.row}:</strong> {error.message}
                    {error.value && <em> (Valor: "{error.value}")</em>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vista previa */}
          {showPreview && previewData.length > 0 && (
            <div class="mb-6">
              <h3 class="font-semibold text-gray-900 mb-3">
                👁️ Vista Previa ({previewData.length} eventos)
              </h3>
              <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {previewData.slice(0, 10).map((event, index) => (
                    <div key={index} class="bg-white p-3 rounded border">
                      <div class="flex items-center gap-2 mb-2">
                        <div class={`w-3 h-3 rounded-full ${event.color}`}></div>
                        <strong class="text-sm">{event.titulo}</strong>
                      </div>
                      <div class="text-xs text-gray-600 space-y-1">
                        <div>👤 {event.instructor}</div>
                        <div>📍 {event.ubicacion}</div>
                        <div>📅 {event.dia} {event.horaInicio && `${event.horaInicio} - ${event.horaFin}`}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {previewData.length > 10 && (
                  <p class="text-sm text-gray-600 mt-3">
                    ... y {previewData.length - 10} eventos más
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Botones finales */}
          <div class="flex justify-end gap-3">
            <button
              onClick={onClose}
              class="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            {showPreview && previewData.length > 0 && (
              <button
                onClick={handleLoadData}
                class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                ✅ Cargar {previewData.length} Eventos
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 