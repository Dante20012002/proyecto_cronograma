import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Configuración de Firebase - Usar variables de entorno o valores directos como fallback
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCQTvAp_CUNztd8xlq30aYxYpAM0WvwNIY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "conograma-terpel.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "conograma-terpel",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "conograma-terpel.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "553437786995",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:553437786995:web:e027a4f1cc3852a1c58b06"
};

let app, db;
try {
  // Inicializar Firebase
  app = initializeApp(firebaseConfig);
  // Inicializar Firestore
  db = getFirestore(app);
} catch (error) {
  console.error('❌ Error inicializando Firebase:', error);
}

// Conectar al emulador en desarrollo (opcional)
if (import.meta.env.DEV) {
  // Descomenta la siguiente línea si quieres usar el emulador local
  // connectFirestoreEmulator(db, 'localhost', 8080);
}

export { db };
export default app; 