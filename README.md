# Proyecto Cronograma

Una aplicación web moderna para gestionar cronogramas y eventos, construida con Astro, Preact y Tailwind CSS, con sincronización en tiempo real usando Firebase.

## 🚀 Características

- Interfaz moderna y responsiva
- Gestión de eventos y cronogramas
- Componentes interactivos con Preact
- Diseño optimizado con Tailwind CSS
- Exportación a PDF
- Funcionalidades de arrastrar y soltar
- **Sincronización en tiempo real con Firebase**
- **Modo administrador y usuario**

## 🛠️ Tecnologías

- **Astro** - Framework web moderno
- **Preact** - Biblioteca de componentes ligeros
- **Tailwind CSS** - Framework de CSS utilitario
- **TypeScript** - Tipado estático
- **Nanostores** - Gestión de estado
- **Firebase Firestore** - Base de datos en tiempo real

## 📦 Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/Dante20012002/proyecto_cronograma.git
cd proyecto_cronograma
```

2. Instala las dependencias:
```bash
npm install
# o
pnpm install
```

3. Configura Firebase:
   - Ve a [Firebase Console](https://console.firebase.google.com/)
   - Crea un nuevo proyecto
   - Habilita Firestore Database
   - Ve a Configuración del proyecto > General
   - Copia la configuración de la app web
   - Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
VITE_FIREBASE_API_KEY=tu_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

4. Ejecuta el servidor de desarrollo:
```bash
npm run dev
# o
pnpm dev
```

## 🏗️ Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye el proyecto para producción
- `npm run preview` - Vista previa de la build de producción

## 🔧 Configuración de Firebase

### 1. Crear proyecto en Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Crear proyecto"
3. Dale un nombre a tu proyecto
4. Sigue los pasos de configuración

### 2. Habilitar Firestore
1. En el panel de Firebase, ve a "Firestore Database"
2. Haz clic en "Crear base de datos"
3. Selecciona "Comenzar en modo de prueba" (para desarrollo)
4. Elige una ubicación para tu base de datos

### 3. Configurar reglas de seguridad
En Firestore Database > Reglas, usa estas reglas para desarrollo:

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

**⚠️ Importante:** Estas reglas permiten acceso total. Para producción, deberías implementar autenticación y reglas más restrictivas.

### 4. Obtener configuración
1. Ve a Configuración del proyecto > General
2. En "Tus apps", haz clic en el ícono de web
3. Copia la configuración y úsala en tu archivo `.env`

## 🌐 Deploy

Este proyecto está configurado para deploy automático en Vercel.

### Variables de entorno en Vercel
Asegúrate de configurar las variables de entorno de Firebase en tu proyecto de Vercel:
1. Ve a tu proyecto en Vercel
2. Settings > Environment Variables
3. Agrega todas las variables de Firebase (VITE_FIREBASE_*)

## 📱 Uso

### Modo Usuario
- Accede a la aplicación normalmente
- Ve los eventos publicados en tiempo real
- No puede hacer cambios

### Modo Administrador
- Accede a la aplicación con `?mode=admin` en la URL
- Puede crear, editar y eliminar eventos
- Puede gestionar instructores
- Puede publicar cambios para que todos los usuarios los vean

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

```sh
pnpm create astro@latest -- --template basics
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/basics)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/basics)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/basics/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

![just-the-basics](https://github.com/withastro/astro/assets/2244813/a0a5533c-a856-4198-8470-2d67b1d7c554)

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`             | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
