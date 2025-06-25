const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
require('dotenv').config();

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Función para crear el primer administrador
async function createFirstAdmin(email, password) {
  try {
    // Crear usuario en Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Agregar a la colección de administradores
    await setDoc(doc(db, 'admins', email), {
      email,
      createdAt: new Date().toISOString(),
      isFirstAdmin: true
    });

    console.log('Administrador creado exitosamente:', email);
    process.exit(0);
  } catch (error) {
    console.error('Error al crear administrador:', error);
    process.exit(1);
  }
}

// Uso:
// node scripts/init-admin.js <email> <password>
const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('Uso: node scripts/init-admin.js <email> <password>');
  process.exit(1);
}

createFirstAdmin(email, password); 