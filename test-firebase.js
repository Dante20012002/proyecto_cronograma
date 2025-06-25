import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCQTvAp_CUNztd8xlq30aYxYpAM0WvwNIY",
  authDomain: "conograma-terpel.firebaseapp.com",
  projectId: "conograma-terpel",
  storageBucket: "conograma-terpel.firebasestorage.app",
  messagingSenderId: "553437786995",
  appId: "1:553437786995:web:e027a4f1cc3852a1c58b06"
};

async function testFirebaseConnection() {
  try {
    console.log('🔧 Inicializando Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('✅ Firebase inicializado correctamente');
    
    // Probar lectura de datos
    console.log('📖 Probando lectura de datos...');
    const testDoc = await getDoc(doc(db, 'schedule', 'draft'));
    
    if (testDoc.exists()) {
      console.log('✅ Documento de borrador existe:', testDoc.data());
    } else {
      console.log('⚠️ Documento de borrador no existe, creando...');
      await setDoc(doc(db, 'schedule', 'draft'), {
        test: true,
        timestamp: serverTimestamp()
      });
      console.log('✅ Documento de prueba creado');
    }
    
    // Probar escritura
    console.log('✍️ Probando escritura de datos...');
    await setDoc(doc(db, 'schedule', 'test'), {
      message: 'Prueba de conexión exitosa',
      timestamp: serverTimestamp()
    });
    console.log('✅ Escritura exitosa');
    
    console.log('🎉 Todas las pruebas pasaron. Firebase está funcionando correctamente.');
    
  } catch (error) {
    console.error('❌ Error en la conexión a Firebase:', error);
    console.error('Detalles del error:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
  }
}

testFirebaseConnection(); 