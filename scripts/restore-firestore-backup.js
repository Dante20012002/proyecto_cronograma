import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

const BACKUP_FILENAME = 'cronograma-export-both-2026-03-30T15-36-00-207Z.xlsx';
const BACKUP_FILE = path.resolve(process.cwd(), BACKUP_FILENAME);
const FIRESTORE_BACKUP_FILE = path.resolve(process.cwd(), 'scripts', `firestore-backup-before-restore-${Date.now()}.json`);

const firebaseConfig = {
  apiKey: 'AIzaSyCQTvAp_CUNztd8xlq30aYxYpAM0VwNIY',
  authDomain: 'conograma-terpel.firebaseapp.com',
  projectId: 'conograma-terpel',
  storageBucket: 'conograma-terpel.firebasestorage.app',
  messagingSenderId: '553437786995',
  appId: '1:553437786995:web:e027a4f1cc3852a1c58b06'
};

const defaultTitle = 'Cronograma Escuelas Colombia';
const defaultViewMode = 'weekly';

const defaultPrograms = [
  'ESCUELA DE PROMOTORES',
  'INDUSTRIA LIMPIA',
  'ESCUELA DE ADMINISTRADORES',
  'LEALTAD',
  'RED VIRTUAL',
  'EDS CONFIABLE',
  'RUMBO',
  'ESCUELA DE TIENDAS',
  'PROYECTO',
  '-'
];

const defaultModules = [
  { name: 'Acompañamiento', color: 'bg-blue-600' },
  { name: 'Actualización de Contenidos', color: 'bg-blue-600' },
  { name: 'App Terpel', color: 'bg-purple-600' },
  { name: 'Campo de Entrenamiento de Industria Limpia', color: 'bg-green-600' },
  { name: 'Canastilla', color: 'bg-orange-600' },
  { name: 'Caravana Rumbo PITS', color: 'bg-purple-600' },
  { name: 'Capacitación Bucaros', color: 'bg-orange-600' },
  { name: 'Clientes Propios Administrativo', color: 'bg-indigo-600' },
  { name: 'Construyendo Equipos Altamente Efectivos', color: 'bg-green-600' },
  { name: 'EDS Confiable', color: 'bg-teal-600' },
  { name: 'Entrenamiento Terpel POS Administrativo', color: 'bg-orange-600' },
  { name: 'Entrenamiento Terpel POS Operativo', color: 'bg-orange-600' },
  { name: 'Excelencia Administrativa', color: 'bg-green-600' },
  { name: 'Facturación Electrónica Administrativa', color: 'bg-indigo-600' },
  { name: 'Facturación Electrónica Operativa', color: 'bg-indigo-600' },
  { name: 'Festivo', color: 'bg-red-600' },
  { name: 'Formación Inicial Terpel POS Administrativo', color: 'bg-orange-600' },
  { name: 'Formación Inicial Terpel POS Operativo', color: 'bg-orange-600' },
  { name: 'Gestión Administrativa', color: 'bg-green-600' },
  { name: 'Gestión Ambiental, Seguridad y Salud en el Trabajo', color: 'bg-green-600' },
  { name: 'La Toma Vive Terpel & Vive PITS', color: 'bg-purple-600' },
  { name: 'Masterlub Administrativo', color: 'bg-cyan-600' },
  { name: 'Masterlub Operativo', color: 'bg-cyan-600' },
  { name: 'Módulo Bebidas Calientes', color: 'bg-blue-600' },
  { name: 'Módulo Escuela de Industria', color: 'bg-blue-600' },
  { name: 'Módulo Formativo GNV', color: 'bg-blue-600' },
  { name: 'Módulo Formativo Líquidos', color: 'bg-blue-600' },
  { name: 'Módulo Formativo Lubricantes', color: 'bg-blue-600' },
  { name: 'Módulo Historia y Masa', color: 'bg-blue-600' },
  { name: 'Módulo Perros y Más Perros', color: 'bg-blue-600' },
  { name: 'Módulo Protagonistas del Servicio', color: 'bg-blue-600' },
  { name: 'Módulo Rollos', color: 'bg-blue-600' },
  { name: 'Módulo Sánduches', color: 'bg-blue-600' },
  { name: 'Módulo Sbarro', color: 'bg-blue-600' },
  { name: 'Módulo Strombolis', color: 'bg-blue-600' },
  { name: 'Protocolo de Servicio EDS', color: 'bg-green-600' },
  { name: 'Taller EDS Confiable', color: 'bg-teal-600' },
  { name: 'Traslado', color: 'bg-yellow-600' },
  { name: 'Vacaciones', color: 'bg-pink-600' },
  { name: 'Vive PITS', color: 'bg-purple-600' },
  { name: 'UDVA P', color: 'bg-indigo-600' },
  { name: 'Módulo Elementos ambientalmente sensibles', color: 'bg-green-600' },
  { name: 'Módulo Control de derrames y atención de emergencias', color: 'bg-green-600' },
  { name: 'Módulo Control de calidad', color: 'bg-green-600' },
  { name: 'Módulo Medida exacta', color: 'bg-green-600' },
  { name: 'Módulo Control de incendios', color: 'bg-red-600' },
  { name: 'Módulo Comportamiento seguro', color: 'bg-yellow-600' },
  { name: 'Módulo Primeros auxilios', color: 'bg-red-600' },
  { name: 'Módulo Investigación de accidentes', color: 'bg-orange-600' },
  { name: 'Bogotá', color: 'bg-indigo-600' },
  { name: 'Barranquilla', color: 'bg-cyan-600' },
  { name: 'Empleados Terpel', color: 'bg-purple-600' },
  { name: 'Seguimiento Apertura', color: 'bg-teal-600' },
  { name: 'Entrenamiento Tienda', color: 'bg-orange-600' },
  { name: 'Preparación de Formación', color: 'bg-blue-600' }
];

const defaultModalities = ['Presencial', 'Virtual'];

function normalizeValue(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function normalizeRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [String(key || '').trim().toLowerCase(), normalizeValue(value)])
  );
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function makeInstructorId(name, regional) {
  const base = `${slugify(name)}-${slugify(regional)}`.replace(/-+/g, '-').slice(0, 60);
  return `instructor-${base}`;
}

function parseDateString(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return trimmed;
}

function parseEventRow(row) {
  const instructor = normalizeValue(row['instructor']);
  const regional = normalizeValue(row['regional']);
  const title = normalizeValue(row['titulo']);
  if (!instructor || !regional || !title) return null;

  const id = normalizeValue(row['id evento']) || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const fechaCompleta = parseDateString(row['fecha completa']);
  const dia = normalizeValue(row['dia']);
  const dayKey = fechaCompleta || dia || 'sin-fecha';

  const horaInicio = normalizeValue(row['hora inicio']);
  const horaFin = normalizeValue(row['hora fin']);
  const time = horaInicio && horaFin ? `${horaInicio} a ${horaFin}` : horaInicio || horaFin || '';

  const event = {
    id,
    title,
    details: normalizeValue(row['detalles']) || '',
    time: time || null,
    location: normalizeValue(row['ubicacion']) || '',
    color: normalizeValue(row['color']) || '#1f4299',
    modalidad: normalizeValue(row['modalidad']) || null,
    confirmed: String(row['confirmado'] || '').trim().toLowerCase().startsWith('s')
  };

  return {
    type: normalizeValue(row['tipo']).toLowerCase() || 'published',
    instructor,
    regional,
    dayKey,
    event
  };
}

function buildScheduleGroup(rows, typeName, config) {
  const rowsByInstructor = new Map();
  const instructorKeys = new Map();

  rows
    .filter((row) => String(row.type).toLowerCase() === typeName)
    .forEach((row) => {
      const instructorKey = `${row.instructor.toLowerCase()}|${row.regional.toLowerCase()}`;
      if (!rowsByInstructor.has(instructorKey)) {
        const instructorId = makeInstructorId(row.instructor, row.regional);
        rowsByInstructor.set(instructorKey, {
          id: instructorId,
          instructor: row.instructor,
          regional: row.regional,
          events: {}
        });
        instructorKeys.set(instructorKey, instructorId);
      }
      const scheduleRow = rowsByInstructor.get(instructorKey);
      const day = row.dayKey || 'sin-fecha';
      if (!scheduleRow.events[day]) scheduleRow.events[day] = [];
      scheduleRow.events[day].push(row.event);
    });

  const instructors = Array.from(rowsByInstructor.values()).map((row) => ({
    id: row.id,
    name: row.instructor,
    regional: row.regional
  }));

  const scheduleRows = Array.from(rowsByInstructor.values());
  const firstDate = scheduleRows
    .flatMap((row) => Object.keys(row.events))
    .filter(Boolean)[0] || '';

  const currentWeek = config || {
    startDate: firstDate || new Date().toISOString().slice(0, 10),
    endDate: firstDate || new Date().toISOString().slice(0, 10)
  };

  return {
    instructors,
    scheduleRows,
    globalConfig: {
      title: defaultTitle,
      weekTitles: {
        [currentWeek.startDate]: config?.weekTitle || defaultTitle
      },
      currentWeek: {
        startDate: currentWeek.startDate,
        endDate: currentWeek.endDate
      },
      viewMode: defaultViewMode
    }
  };
}

function parseConfigRows(rows) {
  const result = {
    draft: null,
    published: null
  };

  rows.forEach((row) => {
    const type = normalizeValue(row['tipo']).toLowerCase();
    const startDate = parseDateString(row['semana inicio']);
    const endDate = parseDateString(row['semana fin']);
    const title = normalizeValue(row['titulo semana']) || defaultTitle;

    if (!startDate || !endDate) return;

    const config = {
      startDate,
      endDate,
      weekTitle: title
    };

    if (type === 'draft') {
      result.draft = config;
    } else if (type === 'published') {
      result.published = config;
    }
  });

  return result;
}

async function backupCurrentFirestore(db) {
  const scheduleDraftDoc = doc(db, 'schedule', 'draft');
  const schedulePublishedDoc = doc(db, 'schedule', 'published');
  const programsSnapshot = await getDocs(collection(db, 'programs'));
  const modulesSnapshot = await getDocs(collection(db, 'modules'));
  const modalitiesSnapshot = await getDocs(collection(db, 'modalities'));

  const scheduleDraft = scheduleDraftDoc ? (await getDocs(collection(db, 'schedule'))).docs : [];
  const programs = programsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  const modules = modulesSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  const modalities = modalitiesSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  const backup = {
    createdAt: new Date().toISOString(),
    programs,
    modules,
    modalities
  };

  fs.writeFileSync(FIRESTORE_BACKUP_FILE, JSON.stringify(backup, null, 2), 'utf8');
  return FIRESTORE_BACKUP_FILE;
}

async function backupScheduleDocs(db) {
  const draftSnapshot = await getDocs(collection(db, 'schedule'));
  const data = {};
  draftSnapshot.docs.forEach((d) => {
    data[d.id] = { id: d.id, ...d.data() };
  });
  return data;
}

async function dedupeCollection(db, collectionName) {
  const snapshot = await getDocs(collection(db, collectionName));
  const uniqueKeys = new Map();
  const docsToDelete = [];

  snapshot.docs.forEach((docRef) => {
    const data = docRef.data();
    const name = normalizeValue(data.name || data.nombre || '');
    const key = name.toLowerCase();
    if (!key) return;
    if (uniqueKeys.has(key)) {
      docsToDelete.push(docRef.ref);
    } else {
      uniqueKeys.set(key, docRef.ref);
    }
  });

  if (docsToDelete.length === 0) {
    return { removed: 0, total: snapshot.size };
  }

  const batch = writeBatch(db);
  docsToDelete.forEach((ref) => batch.delete(ref));
  await batch.commit();

  return { removed: docsToDelete.length, total: snapshot.size };
}

async function ensureDefaultCollection(db, collectionName, defaults) {
  const snapshot = await getDocs(collection(db, collectionName));
  if (!snapshot.empty) {
    return false;
  }

  console.log(`Collection '${collectionName}' está vacía. Restaurando valores por defecto...`);
  const batch = writeBatch(db);
  const now = Date.now();

  if (collectionName === 'programs') {
    defaults.forEach((name, index) => {
      const ref = doc(db, collectionName, `program-${now}-${index}-${Math.random().toString(36).slice(2, 8)}`);
      batch.set(ref, { name, active: true, createdAt: serverTimestamp(), createdBy: 'restore-script' });
    });
  } else if (collectionName === 'modules') {
    defaults.forEach((item, index) => {
      const ref = doc(db, collectionName, `module-${now}-${index}-${Math.random().toString(36).slice(2, 8)}`);
      batch.set(ref, { name: item.name, color: item.color || 'bg-blue-600', active: true, createdAt: serverTimestamp(), createdBy: 'restore-script' });
    });
  } else if (collectionName === 'modalities') {
    defaults.forEach((name, index) => {
      const ref = doc(db, collectionName, `modality-${now}-${index}-${Math.random().toString(36).slice(2, 8)}`);
      batch.set(ref, { name, active: true, createdAt: serverTimestamp(), createdBy: 'restore-script' });
    });
  }

  await batch.commit();
  return true;
}

async function main() {
  console.log('Iniciando restauración de backup...');

  if (!fs.existsSync(BACKUP_FILE)) {
    throw new Error(`No se encontró el archivo de respaldo: ${BACKUP_FILE}`);
  }

  const workbook = XLSX.readFile(BACKUP_FILE, { cellDates: false, raw: false });
  const eventRowsRaw = workbook.SheetNames.includes('Eventos Completos')
    ? XLSX.utils.sheet_to_json(workbook.Sheets['Eventos Completos'], { defval: '' })
    : [];
  const configRowsRaw = workbook.SheetNames.includes('Configuracion')
    ? XLSX.utils.sheet_to_json(workbook.Sheets['Configuracion'], { defval: '' })
    : [];

  const eventRows = eventRowsRaw.map(normalizeRow).map(parseEventRow).filter(Boolean);
  const configRows = configRowsRaw.map(normalizeRow);
  const configByType = parseConfigRows(configRows);

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log('Realizando respaldo local de estructuras existentes...');
  const backupFile = await backupCurrentFirestore(db);
  console.log(`Respaldo previo guardado en: ${backupFile}`);

  console.log('Eliminando duplicados en collections de estructura...');
  const programsResult = await dedupeCollection(db, 'programs');
  const modulesResult = await dedupeCollection(db, 'modules');
  const modalitiesResult = await dedupeCollection(db, 'modalities');
  console.log(`programs: ${programsResult.removed} duplicados eliminados, total ${programsResult.total}`);
  console.log(`modules: ${modulesResult.removed} duplicados eliminados, total ${modulesResult.total}`);
  console.log(`modalities: ${modalitiesResult.removed} duplicados eliminados, total ${modalitiesResult.total}`);

  await ensureDefaultCollection(db, 'programs', defaultPrograms);
  await ensureDefaultCollection(db, 'modules', defaultModules);
  await ensureDefaultCollection(db, 'modalities', defaultModalities);

  console.log('Construyendo datos de cronograma desde backup...');
  const publishedData = buildScheduleGroup(eventRows, 'published', configByType.published || null);
  const draftData = buildScheduleGroup(eventRows, 'draft', configByType.draft || null);

  if (publishedData.scheduleRows.length === 0 && draftData.scheduleRows.length === 0) {
    throw new Error('No se encontraron eventos válidos en el backup para publicar o restaurar.');
  }

  if (publishedData.scheduleRows.length === 0) {
    console.log('No se encontraron eventos publicados en el backup. Copiando datos de borrador a publicados.');
    publishedData.instructors = draftData.instructors;
    publishedData.scheduleRows = draftData.scheduleRows;
    publishedData.globalConfig = draftData.globalConfig;
  }

  if (draftData.scheduleRows.length === 0) {
    console.log('No se encontraron eventos de borrador en el backup. Copiando datos publicados a borrador.');
    draftData.instructors = publishedData.instructors;
    draftData.scheduleRows = publishedData.scheduleRows;
    draftData.globalConfig = publishedData.globalConfig;
  }

  console.log('Escribiendo datos de cronograma en Firestore...');
  await setDoc(doc(db, 'schedule', 'published'), { ...publishedData, lastUpdated: serverTimestamp() });
  await setDoc(doc(db, 'schedule', 'draft'), { ...draftData, lastUpdated: serverTimestamp() });

  console.log('Restauración completada con éxito.');
  console.log(`Eventos publicados: ${publishedData.scheduleRows.reduce((sum, row) => sum + Object.values(row.events).reduce((d, ev) => d + ev.length, 0), 0)}`);
  console.log(`Eventos borrador: ${draftData.scheduleRows.reduce((sum, row) => sum + Object.values(row.events).reduce((d, ev) => d + ev.length, 0), 0)}`);
  console.log(`Instructores publicados: ${publishedData.instructors.length}`);
  console.log(`Instructores borrador: ${draftData.instructors.length}`);
  console.log('Asegúrate de abrir la app y revisar que los datos aparezcan correctamente.');
}

main().catch((error) => {
  console.error('Error durante la restauración:', error);
  process.exit(1);
});
