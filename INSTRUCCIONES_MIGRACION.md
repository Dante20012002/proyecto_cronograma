# 🔧 GUÍA: Resolver problema de permisos de Firestore

## Problema Actual
❌ El script no puede escribir en Firestore porque las reglas de seguridad bloquean las solicitudes del cliente sin autenticación.

## Solución: Actualizar reglas de Firestore (Temporal para migración)

### Paso 1: Ir a Firebase Console
1. Abre: https://console.firebase.google.com/
2. Selecciona el proyecto **conograma-terpel**
3. Ve a **Firestore Database** → **Reglas**

### Paso 2: Reemplazar las reglas actuales
Copia y pega esto en el editor de reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Paso 3: Publicar las reglas
- Haz clic en **Publicar**
- Confirma el cambio

### Paso 4: Ejecutar la migración
Una vez actualizado, ejecuta:

```bash
cd "c:\Users\santi\Proyecto Terpel Cronograma\proyecto_cronograma"
node scripts/auto-setup.js
node scripts/restore-firestore-backup.js
```

### Paso 5: Restaurar reglas de seguridad originales (IMPORTANTE)
Una vez completada la migración, vuelve a las reglas restrictivas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Todos pueden leer
    match /{document=**} {
      allow read: if true;
    }
    
    // Solo admins pueden escribir
    match /{document=**} {
      allow write: if request.auth != null && 
                      exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
  }
}
```

## ⏱️ Tiempo estimado
- Cambiar reglas: 2-3 minutos
- Migración de datos: 1-2 minutos
- Total: ~5 minutos

---

**¿Ya completaste estos pasos? Dime cuando estén las reglas actualizadas y continúo con la migración.**
