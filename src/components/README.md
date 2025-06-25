# Documentación de Componentes

## Índice
1. [AddEventCard](#addeventcard)
2. [EventCard](#eventcard)
3. [ScheduleGrid](#schedulegrid)
4. [CronogramaWrapper](#cronogramawrapper)
5. [EventEditor](#eventeditor)
6. [UserToolbar](#usertoolbar)
7. [GlobalConfig](#globalconfig)
8. [InstructorManager](#instructormanager)
9. [Cronograma](#cronograma)
10. [AdminToolbar](#admintoolbar)

## AddEventCard
**Descripción**: Componente modal para agregar nuevos eventos al cronograma.

**Props**:
- `rowId: string` - ID del instructor/fila donde se agregará el evento
- `day: string` - Día del mes donde se agregará el evento
- `onClose: () => void` - Función para cerrar el modal

**Características**:
- Selector de títulos predefinidos con opción de título personalizado
- Selector de descripciones predefinidas con opción de descripción personalizada
- Selector de horario de inicio y fin
- Campo de ubicación
- Selector de color para el evento
- Validación de campos requeridos

## EventCard
**Descripción**: Componente modal para editar eventos existentes en el cronograma.

**Props**:
- `event: Event` - Datos del evento a editar
- `rowId: string` - ID del instructor/fila donde está el evento
- `day: string` - Día del mes donde está el evento
- `onClose: () => void` - Función para cerrar el modal

**Características**:
- Editor de título
- Selector de descripciones predefinidas con opción de descripción personalizada
- Editor de horario con validación de conflictos
- Editor de ubicación
- Selector de color
- Opción de eliminar evento
- Atajos de teclado para eliminar (Ctrl/Cmd + Delete/Backspace)

## ScheduleGrid
**Descripción**: Componente principal que muestra la cuadrícula del cronograma.

**Props**:
- `isAdmin: boolean` - Determina si se muestran las funciones de administración

**Características**:
- Vista de semana con días y fechas
- Eventos organizados por instructor y día
- Funcionalidad de arrastrar y soltar eventos (solo admin)
- Botones de agregar evento fijos en cada celda (solo admin)
- Visualización de conflictos de horario
- Diseño responsivo

## CronogramaWrapper
**Descripción**: Contenedor principal que maneja el estado global del cronograma.

**Características**:
- Manejo de estado de borrador vs publicado
- Sincronización con Firebase
- Control de permisos de administrador
- Manejo de cambios sin publicar

## EventEditor
**Descripción**: Componente legado para edición de eventos (reemplazado por EventCard).

**Props**:
- `event: Event` - Evento a editar
- `rowId: string` - ID del instructor
- `day: string` - Día del evento
- `isOpen: boolean` - Estado de visibilidad
- `onClose: () => void` - Función para cerrar

## UserToolbar
**Descripción**: Barra de herramientas para usuarios no administradores.

**Características**:
- Vista de información básica
- Controles de visualización
- Filtros de vista

## GlobalConfig
**Descripción**: Panel de configuración global del cronograma.

**Características**:
- Editor de título del cronograma
- Selector de semana actual
- Configuraciones generales
- Guardado automático de cambios

## InstructorManager
**Descripción**: Panel de administración de instructores.

**Características**:
- Lista de instructores
- Agregar/Editar/Eliminar instructores
- Asignación de regionales y ciudades
- Validación de datos

## Cronograma
**Descripción**: Componente Astro que sirve como punto de entrada.

**Características**:
- Integración con Astro
- Carga inicial de datos
- Manejo de SSR

## AdminToolbar
**Descripción**: Barra de herramientas para administradores.

**Características**:
- Botones de publicación
- Estado de cambios sin publicar
- Acceso a configuraciones
- Acciones administrativas rápidas

## Uso de Tipos

Los componentes utilizan los siguientes tipos principales:

```typescript
interface Event {
  id: string;
  title: string;
  details: string | string[];
  time?: string;
  location: string;
  color: string;
}

interface Instructor {
  id: string;
  name: string;
  city: string;
  regional: string;
}

interface ScheduleRow {
  id: string;
  instructor: string;
  city: string;
  regional: string;
  events: {
    [day: string]: Event[];
  };
}

interface GlobalConfig {
  title: string;
  currentWeek: {
    startDate: string;
    endDate: string;
  };
}
```

## Estilos

Los componentes utilizan Tailwind CSS para los estilos. Las clases principales incluyen:

- Colores de eventos: `bg-{color}-{intensity}` (ej: `bg-red-600`)
- Espaciado: `p-{size}`, `m-{size}`, `gap-{size}`
- Flexbox: `flex`, `flex-col`, `items-center`, `justify-between`
- Grid: `grid`, `grid-cols-{number}`
- Estados: `hover:`, `focus:`, `disabled:`
- Efectos: `transition-{property}`, `transform`, `scale-{amount}`
- Utilidades: `rounded-{size}`, `shadow-{size}`, `text-{size}`

## Mejores Prácticas

1. **Estado**:
   - Usar `useState` para estado local
   - Usar `useStore` para estado global
   - Mantener el estado mínimo necesario

2. **Efectos**:
   - Limpiar efectos con return function
   - Especificar dependencias correctamente
   - Evitar efectos innecesarios

3. **Rendimiento**:
   - Memoizar callbacks cuando sea necesario
   - Evitar re-renders innecesarios
   - Usar claves únicas en listas

4. **Accesibilidad**:
   - Usar roles ARIA apropiados
   - Mantener contraste de color adecuado
   - Soportar navegación por teclado

5. **Manejo de Errores**:
   - Validar props y entrada de usuario
   - Manejar casos de error gracefully
   - Proporcionar feedback al usuario

6. **Firebase**:
   - Mantener operaciones atómicas
   - Manejar desconexiones
   - Validar permisos 