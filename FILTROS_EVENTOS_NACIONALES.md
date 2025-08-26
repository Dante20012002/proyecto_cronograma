# Filtros para Eventos Nacionales

## Descripción de la Funcionalidad

Se ha implementado una nueva lógica en el sistema de filtros que permite que los eventos con ubicaciones que contengan la palabra "Nacional" o "Todas las Regionales" aparezcan siempre, independientemente del filtro de regional seleccionado.

## Comportamiento Implementado

### 1. Filtro por Regional con Excepciones Nacionales

Cuando se aplica un filtro por regional específica (ej: "NORTE"), el sistema ahora:

- **Muestra instructores de la regional seleccionada** con todos sus eventos
- **Muestra instructores de otras regionales** SOLO si tienen eventos nacionales
- **Para instructores de otras regionales**, solo se muestran los eventos nacionales, no todos sus eventos

### 2. Identificación de Eventos Nacionales

Un evento se considera "nacional" si su campo `location` contiene:
- La palabra "nacional" (sin distinguir mayúsculas/minúsculas)
- La frase "todas las regionales" (sin distinguir mayúsculas/minúsculas)

### 3. Ejemplos de Comportamiento

#### Escenario 1: Filtro por "NORTE"
- **Instructor de NORTE**: Se muestran todos sus eventos
- **Instructor de BUCARAMANGA con eventos nacionales**: Solo se muestran los eventos con ubicación "Nacional" o "Todas las Regionales"
- **Instructor de BUCARAMANGA sin eventos nacionales**: No se muestra

#### Escenario 2: Sin filtro de regional
- Se muestran todos los instructores con todos sus eventos (comportamiento normal)

## Implementación Técnica

### Archivos Modificados

1. **`src/stores/schedule.ts`**
   - Función `getFilteredRows()`: Para vista semanal
   - Función `getFilteredRowsForMonth()`: Para vista mensual

### Lógica Implementada

#### En el Filtro de Filas (`.filter()`)
```typescript
// Verificar si el instructor tiene eventos nacionales en el periodo actual
let hasNationalEvents = false;

Object.entries(row.events).forEach(([day, events]) => {
  // Solo considerar eventos del periodo actual (semana o mes)
  if (isCurrentPeriodDay) {
    events.forEach(event => {
      if (event.location && (
        event.location.toLowerCase().includes('nacional') ||
        event.location.toLowerCase().includes('todas las regionales')
      )) {
        hasNationalEvents = true;
      }
    });
  }
});

// Si no tiene eventos nacionales y no está en las regionales filtradas, excluir
if (!hasNationalEvents && !filters.regionales.includes(row.regional)) {
  return false;
}
```

#### En el Filtro de Eventos (`.map()`)
```typescript
// Verificar si este instructor está en las regionales filtradas
const isInFilteredRegionals = filters.regionales.length === 0 || 
                              filters.regionales.includes(row.regional);

const matchingEvents = events.filter(event => {
  // Si hay filtro de regionales y el instructor no está en las regionales filtradas,
  // solo mostrar eventos nacionales
  if (filters.regionales.length > 0 && !isInFilteredRegionals) {
    if (!event.location || !(
      event.location.toLowerCase().includes('nacional') ||
      event.location.toLowerCase().includes('todas las regionales')
    )) {
      return false;
    }
  }
  
  // Aplicar otros filtros (modalidad, programa, módulo)...
  return true;
});
```

## Casos de Uso

### 1. Capacitaciones Nacionales
- Eventos como "NUEVO PROTOCOLO DE SERVICIO TERPEL" con ubicación "Todas las Regionales"
- Aparecen para todas las regionales cuando se filtra por cualquier regional

### 2. Eventos Regionales Específicos
- Eventos como "ESCUELA DE PROMOTORES" con ubicación "Bucaramanga"
- Solo aparecen cuando se filtra por la regional correspondiente

### 3. Instructores con Eventos Mixtos
- Si un instructor tiene eventos regionales y nacionales
- Al filtrar por otra regional, solo aparecen los eventos nacionales

## Compatibilidad

- ✅ **Vista Semanal**: Funciona correctamente
- ✅ **Vista Mensual**: Funciona correctamente
- ✅ **Modo Admin**: Funciona correctamente
- ✅ **Modo Usuario**: Funciona correctamente
- ✅ **Filtros Combinados**: Compatible con otros filtros (instructor, modalidad, programa, módulo)

## Consideraciones

1. **Rendimiento**: La lógica adicional es mínima y no afecta significativamente el rendimiento
2. **Compatibilidad**: Mantiene compatibilidad con el formato anterior de fechas
3. **Flexibilidad**: Permite agregar más palabras clave para eventos nacionales fácilmente
4. **Mantenibilidad**: La lógica está centralizada en las funciones de filtrado

## Pruebas Recomendadas

1. Filtrar por una regional específica y verificar que aparezcan eventos nacionales de otras regionales
2. Verificar que solo aparezcan los eventos nacionales, no todos los eventos del instructor
3. Probar con diferentes combinaciones de filtros
4. Verificar en ambas vistas (semanal y mensual)
5. Probar con eventos que contengan "Nacional" en diferentes formatos
