import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCQTvAp_CUNztd8xlq30aYxYpAM0WvwNIY",
  authDomain: "conograma-terpel.firebaseapp.com",
  projectId: "conograma-terpel",
  storageBucket: "conograma-terpel.firebasestorage.app",
  messagingSenderId: "553437786995",
  appId: "1:553437786995:web:e027a4f1cc3852a1c58b06"
};

async function testSubscriptions() {
  try {
    console.log('🔧 Inicializando Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('✅ Firebase inicializado correctamente');
    
    // Crear datos de prueba
    const testData = {
      instructors: [
        { id: 'test-1', name: 'TEST INSTRUCTOR', city: 'Test City', regional: 'TEST' }
      ],
      scheduleRows: [
        {
          id: 'test-1',
          instructor: 'TEST INSTRUCTOR',
          city: 'Test City',
          regional: 'TEST',
          events: {
            '25': [{ id: 'test-event', title: 'Test Event', details: 'Test Details', location: 'Test Location', color: 'bg-blue-600' }]
          }
        }
      ],
      globalConfig: {
        title: 'Test Cronograma',
        currentWeek: {
          startDate: '2024-06-24',
          endDate: '2024-06-28'
        }
      },
      lastUpdated: serverTimestamp()
    };
    
    // Escribir datos de prueba
    console.log('✍️ Escribiendo datos de prueba...');
    await setDoc(doc(db, 'schedule', 'draft'), testData);
    await setDoc(doc(db, 'schedule', 'published'), testData);
    console.log('✅ Datos de prueba escritos');
    
    // Probar suscripción a draft
    console.log('📡 Probando suscripción a draft...');
    let draftReceived = false;
    const unsubscribeDraft = onSnapshot(doc(db, 'schedule', 'draft'), (doc) => {
      if (doc.exists()) {
        console.log('✅ Suscripción draft funcionando:', doc.data());
        draftReceived = true;
      } else {
        console.log('⚠️ Documento draft no existe');
      }
    }, (error) => {
      console.error('❌ Error en suscripción draft:', error);
    });
    
    // Probar suscripción a published
    console.log('📡 Probando suscripción a published...');
    let publishedReceived = false;
    const unsubscribePublished = onSnapshot(doc(db, 'schedule', 'published'), (doc) => {
      if (doc.exists()) {
        console.log('✅ Suscripción published funcionando:', doc.data());
        publishedReceived = true;
      } else {
        console.log('⚠️ Documento published no existe');
      }
    }, (error) => {
      console.error('❌ Error en suscripción published:', error);
    });
    
    // Esperar un poco para que lleguen las suscripciones
    setTimeout(() => {
      console.log('📊 Estado de las suscripciones:');
      console.log('- Draft recibido:', draftReceived);
      console.log('- Published recibido:', publishedReceived);
      
      if (draftReceived && publishedReceived) {
        console.log('🎉 Todas las suscripciones funcionan correctamente');
      } else {
        console.log('⚠️ Algunas suscripciones no están funcionando');
      }
      
      // Limpiar suscripciones
      unsubscribeDraft();
      unsubscribePublished();
      console.log('🧹 Suscripciones limpiadas');
    }, 3000);
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

testSubscriptions(); 