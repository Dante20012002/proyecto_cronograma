import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Configuración de Firebase - Usar variables de entorno o valores por defecto
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "TU_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tu-proyecto.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tu-proyecto",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "tu-proyecto.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
export const db = getFirestore(app);

// Conectar al emulador en desarrollo (opcional)
if (import.meta.env.DEV) {
  // Descomenta la siguiente línea si quieres usar el emulador local
  // connectFirestoreEmulator(db, 'localhost', 8080);
}

export default app; 