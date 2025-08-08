# Manual de Carga de Excel

## Campos del Excel

| Campo | Descripción | Ejemplo | Obligatorio |
|-------|-------------|---------|-------------|
| **Instructor** | Nombre completo del instructor | JUAN PABLO HERNANDEZ | ✅ |
| **Regional** | Regional donde se realizará el evento | BUCARAMANGA | ✅ |
| **Titulo** | Título del evento (puedes usar cualquier título personalizado) | ESCUELA DE PROMOTORES | ✅ |
| **Detalles** | Detalles específicos del evento | Módulo Formativo Líquidos | ❌ |
| **Ubicacion** | Lugar específico del evento | Bucaramanga | ❌ |
| **Dia** | Día de la semana (lunes a viernes) | lunes | ✅ |
| **Hora Inicio** | Hora de inicio del evento | 8:00 a.m. | ❌ |
| **Hora Fin** | Hora de finalización del evento | 5:00 p.m. | ❌ |
| **Modalidad** | Modalidad del evento (Presencial/Virtual) | Presencial | ❌ |

## Características Principales

### Modo Incremental
- No elimina eventos existentes
- Agrega nuevos eventos a la semana actual
- Mantiene la información de regional
- Preserva el historial de eventos

### Validaciones Automáticas
- Formato de fechas y horas
- Campos obligatorios (título es obligatorio pero puede ser cualquier texto)
- Duplicados de eventos
- Conflictos de horarios

### Flexibilidad de Títulos
- **Títulos libres**: Puedes usar cualquier título personalizado para tus eventos
- **No hay restricciones**: No es necesario usar solo los títulos predefinidos
- **Ejemplos válidos**: "Capacitación Especial", "Taller Personalizado", "Reunión de Seguimiento", etc.

### Colores Automáticos
Los eventos se colorean automáticamente según su tipo:
- 🔵 Azul: Módulos formativos
- 🟢 Verde: Protocolos y gestión
- 🟣 Púrpura: Programas VIVE
- 🟡 Amarillo: Formación TERPEL POS

## Formato del Excel

### Estructura
| Instructor | Regional | Titulo | Detalles | Ubicacion | Dia | Hora Inicio | Hora Fin |
|------------|----------|---------|----------|-----------|-----|-------------|-----------|
| JUAN PABLO | BUCARAMANGA | ESCUELA | Módulo 1 | Sede Central | lunes | 8:00 a.m. | 5:00 p.m. |

### Reglas
1. Una fila por evento
2. Respetar mayúsculas/minúsculas en días
3. Formato de hora: "HH:MM a.m." o "HH:MM p.m."
4. Días válidos: lunes, martes, miércoles, jueves, viernes

## Solución de Problemas

### Error: Campos Obligatorios
**Error**: "El campo 'xxx' es requerido"
**Solución**: Llenar todos los campos obligatorios marcados con ✅ (Instructor, Regional, Titulo, Dia)

### Error: Formato de Hora
**Error**: "La hora debe estar en formato HH:MM a.m./p.m."
**Solución**: Usar formato "8:00 a.m." o "2:30 p.m."

### Error: Día Inválido
**Error**: "El día debe ser uno de: lunes, martes..."
**Solución**: Usar días en minúsculas, sin acentos

## Consejos
1. Usar la plantilla proporcionada
2. Verificar campos obligatorios
3. Revisar la vista previa antes de cargar
4. Mantener consistencia en nombres de instructores 