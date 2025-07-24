# Componentes del Sistema

## Estructura General

### Componentes Principales
- `Cronograma.astro`: Componente principal que integra todo
- `CronogramaWrapper.tsx`: Wrapper de Preact para el cronograma
- `ScheduleGrid.tsx`: Grid principal del cronograma
- `EventCard.tsx`: Tarjeta individual de evento

### Componentes de Administración
- `AdminToolbar.tsx`: Barra de herramientas administrativa
- `AdminManager.tsx`: Gestión de administradores
- `AdminDebugPanel.tsx`: Panel de depuración
- `InstructorManager.tsx`: Gestión de instructores
- `ExcelUploader.tsx`: Carga masiva de eventos

### Componentes de Usuario
- `UserToolbar.tsx`: Barra de herramientas para usuarios
- `FilterBar.tsx`: Filtros de visualización
- `LoginForm.tsx`: Formulario de inicio de sesión

## Funcionalidades Principales

### Gestión de Eventos
- Creación y edición de eventos
- Drag & drop para mover eventos
- Validación de conflictos de horario
- Asignación de regionales
- Colores automáticos por tipo

### Administración
- Panel de administración completo
- Gestión de permisos
- Carga masiva desde Excel
- Modo borrador y publicación

### Filtros y Búsqueda
- Filtrado por instructor
- Filtrado por regional
- Filtrado por modalidad
- Vista semanal

## Tipos de Datos

### Instructor
```typescript
interface Instructor {
  id: string;
  name: string;
  regional: string;
}
```

### ScheduleRow
```typescript
interface ScheduleRow {
  id: string;
  instructor: string;
  regional: string;
  events: {
    [day: string]: Event[];
  };
}
```

### Event
```typescript
interface Event {
  id: string;
  title: string;
  details: string | string[];
  time?: string;
  location: string;
  color: string;
  modalidad?: string;
}
```

## Mejores Prácticas

### Manejo de Estado
- Usar señales de Preact para estado reactivo
- Mantener estado global en stores
- Sincronizar con Firebase en tiempo real

### Validaciones
- Validar datos antes de guardar
- Verificar conflictos de horario
- Validar permisos de usuario

### Rendimiento
- Lazy loading de componentes pesados
- Optimización de re-renders
- Caché de datos frecuentes

### Seguridad
- Validación de permisos
- Sanitización de datos
- Logs de operaciones críticas 