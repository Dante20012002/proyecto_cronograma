# 📊 Manual de Carga Masiva de Eventos desde Excel

## 🎯 Descripción General

La funcionalidad de carga masiva permite importar múltiples eventos desde un archivo Excel de forma rápida y sencilla. Esta herramienta está diseñada para ser fácil de usar, incluso para personas con pocos conocimientos técnicos.

## 🚀 Cómo Usar la Funcionalidad

### 1. Acceso a la Herramienta

1. Inicia sesión como administrador
2. Busca el botón **"📊 Excel"** en la barra de herramientas de administración
3. Haz clic en el botón para abrir el modal de carga masiva

### 2. Descargar la Plantilla

1. En el modal, haz clic en **"📥 Descargar Plantilla Excel"**
2. Se descargará un archivo llamado `plantilla_eventos.xlsx`
3. Abre el archivo en Excel, LibreOffice Calc o Google Sheets

### 3. Llenar la Plantilla

La plantilla contiene las siguientes columnas:

| Columna | Descripción | Ejemplo | Obligatorio |
|---------|-------------|---------|-------------|
| **Instructor** | Nombre completo del instructor | JUAN PABLO HERNANDEZ | ✅ |
| **Ciudad** | Ciudad donde se realizará el evento | Bucaramanga | ✅ |
| **Regional** | Regional a la que pertenece | BUCARAMANGA | ✅ |
| **Titulo** | Título del evento | ESCUELA DE PROMOTORES | ✅ |
| **Detalles** | Detalles específicos del evento | MODULO PROTAGONISTAS DEL SERVICIO | ⚪ |
| **Ubicacion** | Lugar específico del evento | Bucaramanga | ⚪ |
| **Dia** | Día de la semana | lunes | ✅ |
| **Hora Inicio** | Hora de inicio | 8:00 a.m. | ⚪ |
| **Hora Fin** | Hora de finalización | 5:00 p.m. | ⚪ |

### 4. Reglas Importantes

#### ✅ Días Válidos
- `lunes`, `martes`, `miércoles` (o `miercoles`), `jueves`, `viernes`
- Usar solo minúsculas

#### ✅ Formato de Horas
- **Correcto**: `8:00 a.m.`, `2:30 p.m.`, `12:00 p.m.`
- **Incorrecto**: `8:00`, `8 AM`, `14:30`

#### ✅ Campos Opcionales
- **Detalles**: Si se deja vacío, se asignará "Sin detalles especificados"
- **Ubicación**: Si se deja vacío, se asignará "Por definir"
- **Horas**: Si se dejan vacías, el evento no tendrá horario específico

#### ✅ Detalles Predefinidos (Colores Automáticos)
Si usas uno de estos detalles, el color se asignará automáticamente:

**Módulos Formativos (Azul):**
- MODULO PROTAGONISTAS DEL SERVICIO
- MODULO FORMATIVO GNV
- MODULO FORMATIVO LIQUIDOS
- MODULO FORMATIVO LUBRICANTES
- MODULO ESCUELA DE INDUSTRIA

**Protocolos y Gestión (Verde):**
- PROTOCOLO DE SERVICIO EDS
- GESTION AMBIENTAL, SEGURIDAD Y SALUD EN EL TRABAJO
- EXCELENCIA ADMINISTRATIVA

**Programas VIVE (Púrpura):**
- VIVE PITS
- LA TOMA VIVE TERPEL & VIVE PITS
- CARAVANA RUMBO PITS

**Formación TERPEL POS (Naranja):**
- FORMACION INICIAL TERPEL POS OPERATIVO
- FORMACION INICIAL TERPEL POS ADMINISTRATIVO
- ENTRENAMIENTO TERPEL POS OPERATIVO
- ENTRENAMIENTO TERPEL POS ADMINISTRATIVO

**Y muchos más...**

### 5. Subir el Archivo

1. Una vez completada la plantilla, guarda el archivo
2. En el modal, haz clic en **"Seleccionar archivo Excel"**
3. Selecciona tu archivo completado
4. Haz clic en **"🔍 Procesar Archivo"**

### 6. Revisión y Confirmación

1. El sistema validará automáticamente todos los datos
2. Si hay errores, se mostrarán en pantalla con detalles específicos
3. Si todo está correcto, verás una **Vista Previa** de los eventos
4. Revisa que todo esté correcto
5. Haz clic en **"✅ Cargar X Eventos"** para confirmar

## 🔧 Funcionalidades Adicionales

### 🎨 Colores Automáticos
- Los eventos con detalles predefinidos reciben colores automáticamente
- Esto facilita la identificación visual de tipos de eventos
- Los colores están agrupados por categorías temáticas

### 🔍 Validación Inteligente
- Verifica que todos los campos obligatorios estén completos
- Valida el formato de las horas
- Confirma que los días sean válidos
- Muestra errores específicos por fila

### 👥 Gestión de Instructores
- Si un instructor no existe, se crea automáticamente
- Si ya existe, se agrega el evento a su cronograma
- Mantiene la información de ciudad y regional

### 📝 Integración Completa
- Los eventos cargados se pueden editar normalmente después
- Se integran con el sistema de drag & drop
- Funcionan con todas las validaciones de conflictos de horarios

## 📋 Ejemplo Práctico

### Archivo Excel de Ejemplo:

| Instructor | Ciudad | Regional | Titulo | Detalles | Ubicacion | Dia | Hora Inicio | Hora Fin |
|------------|---------|----------|---------|-----------|-----------|-----|-------------|----------|
| JUAN PABLO HERNANDEZ | Bucaramanga | BUCARAMANGA | ESCUELA DE PROMOTORES | MODULO PROTAGONISTAS DEL SERVICIO | Bucaramanga | lunes | 8:00 a.m. | 5:00 p.m. |
| ZULAY VERA | Cúcuta | NORTE | INDUSTRIA LIMPIA | MODULO FORMATIVO LIQUIDOS | Cúcuta | martes | 9:00 a.m. | 4:00 p.m. |
| MARIA GONZALEZ | Medellín | ANTIOQUIA | LEALTAD | CANASTILLA | Medellín | miércoles | 10:00 a.m. | 3:00 p.m. |

### Resultado:
- Se crearán 3 eventos
- JUAN PABLO HERNANDEZ: evento azul (módulo formativo)
- ZULAY VERA: evento azul (módulo formativo)  
- MARIA GONZALEZ: evento índigo (producto específico)

## ⚠️ Solución de Problemas

### Error: "El día debe ser uno de..."
**Causa**: Día no válido o con mayúsculas
**Solución**: Usar solo: lunes, martes, miércoles, jueves, viernes (en minúsculas)

### Error: "La hora debe estar en formato..."
**Causa**: Formato de hora incorrecto
**Solución**: Usar formato `HH:MM a.m.` o `HH:MM p.m.`

### Error: "El campo X es requerido"
**Causa**: Campo obligatorio vacío
**Solución**: Llenar todos los campos obligatorios marcados con ✅ (Instructor, Ciudad, Regional, Titulo, Dia)

### ℹ️ Nota sobre campos opcionales
**Detalles y Ubicación** son ahora **opcionales**. Si los dejas vacíos:
- **Detalles vacío** → Se asignará "Sin detalles especificados" y color azul por defecto
- **Ubicación vacía** → Se asignará "Por definir"

### Error: "Error al leer el archivo"
**Causa**: Archivo corrupto o formato no válido
**Solución**: Verificar que sea un archivo .xlsx o .xls válido

## 🎉 Consejos de Uso

1. **Empieza pequeño**: Prueba con 2-3 eventos primero
2. **Revisa la vista previa**: Siempre revisa antes de cargar
3. **Usa detalles predefinidos**: Para obtener colores automáticos
4. **Mantén consistencia**: Usa los mismos nombres de instructores
5. **Guarda frecuentemente**: Guarda el Excel mientras lo editas

## 🔄 Flujo Completo Recomendado

1. 📥 Descargar plantilla
2. ✏️ Llenar datos en Excel
3. 💾 Guardar archivo
4. 📤 Subir archivo
5. 🔍 Procesar y validar
6. 👁️ Revisar vista previa  
7. ✅ Cargar eventos
8. 💾 Guardar borrador
9. 📦 Publicar cambios

---

**¡Listo!** Con esta funcionalidad puedes cargar decenas de eventos en pocos minutos. Los eventos se integran perfectamente con el sistema existente y se pueden editar normalmente después de la carga. 