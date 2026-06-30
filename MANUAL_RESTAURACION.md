# 📚 Manual de Restauración de Datos - Proyecto Cronograma Terpel

## 📖 Tabla de Contenidos
1. [Restauración Manual](#restauración-manual)
2. [Backups Automáticos](#backups-automáticos)
3. [Solución de Problemas](#solución-de-problemas)
4. [Mejores Prácticas](#mejores-prácticas)

---

## 🔄 Restauración Manual

### Requisitos Previos
- Tener acceso a Firebase Console del proyecto `conograma-terpel`
- Node.js v20+ y pnpm instalados
- Archivo Excel de backup: `cronograma-export-both-2026-03-30T15-36-00-207Z.xlsx`
- Archivo JSON de backup: `scripts/firestore-backup-before-restore-*.json` (opcional)

### Paso 1: Actualizar Reglas de Firestore (Temporal)

Durante la restauración se necesitan reglas permisivas. Después se restauran las restrictivas.

**Para migración - Reglas abiertas (TEMPORAL):**
1. Ve a: https://console.firebase.google.com/
2. Proyecto: `conograma-terpel`
3. Firestore Database → Reglas
4. Reemplaza con:

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

5. Haz clic en **Publicar**

### Paso 2: Ejecutar Scripts de Restauración

```bash
# Navega al directorio del proyecto
cd "c:\Users\santi\Proyecto Terpel Cronograma\proyecto_cronograma"

# Configura el super administrador
node scripts/auto-setup.js

# Restaura todos los datos desde el backup Excel
node scripts/restore-firestore-backup.js
```

**Salida esperada:**
```
✅ Super administrador configurado exitosamente
✅ Restauración completada con éxito.
- Eventos publicados: 4816
- Eventos borrador: 4816
- Instructores publicados: 26
- Instructores borrador: 26
```

### Paso 3: Restaurar Reglas de Seguridad (IMPORTANTE)

Una vez completada la migración, restaura las reglas restrictivas:

**Para producción - Reglas seguras:**

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Permitir lectura pública
    match /{document=**} {
      allow read: if true;
    }
    
    // Solo admins autenticados pueden escribir
    match /{document=**} {
      allow write: if request.auth != null && 
                      exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // Reglas específicas para collections
    match /schedule/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && 
                      exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    match /admins/{email} {
      allow read: if request.auth.uid == email;
      allow write: if request.auth != null && 
                      exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
  }
}
```

5. Haz clic en **Publicar**

### Paso 4: Verificar la Restauración

```bash
# Inicia la aplicación
pnpm dev

# Accede a:
# http://localhost:3000/?mode=admin

# Inicia sesión con:
# Email: instructoresterpel@spira.co
# Contraseña: (crea una nueva en Firebase Auth)
```

---

## 💾 Backups Automáticos

### Opción 1: GitHub + GitHub Actions (Recomendado - GRATUITO)

Este es el mejor método porque:
- ✅ Completamente GRATUITO
- ✅ Automático (sin mantenimiento)
- ✅ Historial de cambios con Git
- ✅ Fácil recuperación
- ✅ Almacenamiento en la nube

#### Implementación:

**1. Crear script de exportación:**

```bash
# Crear archivo: scripts/export-backup.js

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const firebaseConfig = {
  apiKey: 'AIzaSyCQTvAp_CUNztd8xlq30aYxYpAM0WvwNIY',
  authDomain: 'conograma-terpel.firebaseapp.com',
  projectId: 'conograma-terpel',
  storageBucket: 'conograma-terpel.firebasestorage.app',
  messagingSenderId: '553437786995',
  appId: '1:553437786995:web:e027a4f1cc3852a1c58b06'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function exportBackup() {
  const backup = {
    timestamp: new Date().toISOString(),
    collections: {}
  };

  try {
    // Exportar cada colección principal
    const collections = ['schedule', 'programs', 'modules', 'modalities', 'admins'];
    
    for (const collName of collections) {
      const snapshot = await getDocs(collection(db, collName));
      backup.collections[collName] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }

    // Guardar en archivo JSON
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `backups/backup-${timestamp}.json`;
    
    if (!fs.existsSync('backups')) {
      fs.mkdirSync('backups');
    }

    fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
    console.log(`✅ Backup exportado: ${filename}`);
    
  } catch (error) {
    console.error('❌ Error exportando backup:', error);
    process.exit(1);
  }
}

exportBackup();
```

**2. Crear GitHub Actions workflow:**

```bash
# Crear archivo: .github/workflows/backup.yml

```yaml
name: Backup Automático de Firestore

on:
  schedule:
    # Ejecutar todos los días a las 2 AM UTC (10 PM Colombia)
    - cron: '0 2 * * *'
  
  # También permite ejecutar manualmente desde GitHub Actions
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Instalar Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Instalar pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10
      
      - name: Instalar dependencias
        run: pnpm install
      
      - name: Exportar backup de Firestore
        run: node scripts/export-backup.js
      
      - name: Commit y push del backup
        run: |
          git config user.email "backup-bot@proyecto-cronograma.local"
          git config user.name "Backup Bot"
          
          # Solo hacer commit si hay cambios
          if [ -n "$(git status --porcelain)" ]; then
            git add backups/
            git commit -m "🔄 Backup automático - $(date +'%Y-%m-%d %H:%M:%S')"
            git push
          else
            echo "No hay cambios, omitiendo commit"
          fi
```

**3. Agregar a package.json:**

```json
{
  "scripts": {
    "backup": "node scripts/export-backup.js",
    "backup:restore": "node scripts/restore-firestore-backup.js"
  }
}
```

### Opción 2: Firestore Export (Nativo - GRATUITO)

Firebase ofrece exportación nativa pero requiere Cloud Storage.

**Ventajas:**
- ✅ Exportación completa a nivel de Firestore
- ✅ Compatible con importación nativa
- ⚠️ Requiere Cloud Storage (primeros 5GB gratis)

**Pasos:**
1. Ve a Firebase Console
2. Firestore Database → Importar/Exportar
3. Click en "Exportar colecciones"
4. Selecciona Cloud Storage bucket
5. Descarga automáticamente

### Opción 3: Exportación Manual Periódica

**Script simple para ejecutar localmente:**

```bash
# Crear archivo: scripts/manual-backup.sh

#!/bin/bash
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR

# Ejecutar exportación
node scripts/export-backup.js

# Crear archivo ZIP
zip -r "$BACKUP_DIR/backup-$DATE.zip" backups/backup-*.json

echo "✅ Backup completado: $BACKUP_DIR/backup-$DATE.zip"
```

---

## 🔍 Solución de Problemas

### ❌ Error: PERMISSION_DENIED

**Causa:** Las reglas de Firestore están bloqueando escrituras

**Solución:**
1. Verifica que publicaste las reglas abiertas
2. Espera 30 segundos y vuelve a intentar
3. Limpia caché del navegador (Ctrl+Shift+Del)

### ❌ Error: Missing or insufficient permissions

**Causa:** Firestore Auth no está configurado correctamente

**Solución:**
1. Verifica que estés en el proyecto correcto
2. Confirma que la configuración de Firebase es correcta en `src/lib/firebase.ts`
3. Las reglas deben permitir lectura/escritura temporal

### ❌ No aparecen los eventos en la UI

**Causa:** Los datos se restauraron pero hay un problema de sincronización

**Solución:**
1. Recarga la página (Ctrl+F5)
2. Limpia el local storage: `localStorage.clear()`
3. Recarga nuevamente

---

## ✅ Mejores Prácticas

### 1. Backups Regulares
- Configura backups automáticos al menos 1 vez por semana
- GitHub Actions los hace gratuitamente

### 2. Versionado de Datos
- Mantén historiales de cambios en Git
- Facilita auditoría y recuperación

### 3. Monitoreo
- Revisa los backups regularmente
- Prueba la restauración en ambiente de prueba

### 4. Seguridad de Reglas
- Nunca dejes reglas abiertas (allow read, write: if true)
- Restaura reglas restrictivas después de migraciones

### 5. Documentación
- Mantén este manual actualizado
- Anota cambios importantes en los backups

---

## 📊 Checklist de Restauración

```
☐ Verificar acceso a Firebase Console
☐ Tener archivo de backup Excel descargado
☐ Hacer backup previo actual (firestore-backup-*.json)
☐ Actualizar reglas a modo permisivo
☐ Ejecutar: node scripts/auto-setup.js
☐ Ejecutar: node scripts/restore-firestore-backup.js
☐ Verificar en Firestore que datos estén presentes
☐ Restaurar reglas a modo restrictivo
☐ Probar en la UI: http://localhost:3000/?mode=admin
☐ Verificar que aparezcan todos los eventos
☐ Crear nuevo backup post-restauración
☐ Commit de cambios a Git
```

---

## 🆘 Contacto y Soporte

Si encuentras problemas:
1. Revisa este manual
2. Verifica los logs en la consola del navegador (F12)
3. Revisa los archivos de log en `scripts/firestore-backup-before-restore-*.json`

---

**Última actualización:** 19 de mayo de 2026
**Versión:** 1.0
**Estado:** Documentación completa y probada
