/**
 * Script automatizado para configurar super admin y restaurar datos desde backup
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
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

const SUPER_ADMIN_EMAIL = 'instructoresterpel@spira.co';

async function setupSuperAdmin() {
  console.log('🔧 Configurando super administrador...');
  
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const superAdminData = {
      role: 'super_admin',
      permissions: {
        canPublish: true,
        canEditGlobalConfig: true,
        canManageInstructors: true,
        canUploadExcel: true,
        canManageAdmins: true,
        canAccessDebugPanel: true,
      },
      active: true,
      displayName: 'Super Administrador - Terpel',
      createdAt: serverTimestamp(),
      createdBy: 'system_automation',
      description: 'Cuenta principal de administrador con acceso completo'
    };

    await setDoc(doc(db, 'admins', SUPER_ADMIN_EMAIL), superAdminData);
    
    console.log('✅ Super administrador configurado exitosamente');
    console.log(`   📧 Email: ${SUPER_ADMIN_EMAIL}`);
    console.log('   🔧 Rol: super_admin');
    console.log('   ✓ Permisos: Acceso completo');
    
  } catch (error) {
    console.error('❌ Error configurando super admin:', error.message);
    if (error.code === 'permission-denied') {
      console.log('\n⚠️  Error de permisos. Verifica:');
      console.log('   1. Las reglas de Firestore en Firebase Console');
      console.log('   2. La configuración de Firebase está correcta');
      console.log('\n💡 Solución rápida - Actualiza las reglas en Firebase:');
      console.log('   Ve a Firebase Console > Firestore > Reglas');
      console.log('   Reemplaza todo con:');
      console.log(`
match /{document=**} {
  allow read, write: if true;
}
      `);
    }
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando configuración automática del sistema...\n');
    await setupSuperAdmin();
    console.log('\n🎉 ¡Configuración completada!');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Abre la aplicación en el navegador');
    console.log('   2. Ve a http://localhost:3000/?mode=admin');
    console.log(`   3. Inicia sesión con: ${SUPER_ADMIN_EMAIL}`);
    console.log('   4. Sube el archivo Excel desde el panel de administración');
    
  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

main();
