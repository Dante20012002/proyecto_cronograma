/**
 * Script de inicialización para crear el primer super administrador en Firestore
 * 
 * Este script debe ejecutarse UNA SOLA VEZ para configurar el sistema inicial.
 * Migra de la lista hardcoded de administradores a Firestore.
 * 
 * Uso:
 * node scripts/init-super-admin.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyCQTvAp_CUNztd8xlq30aYxYpAM0WvwNIY",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "conograma-terpel.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "conograma-terpel",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "conograma-terpel.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "553437786995",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:553437786995:web:e027a4f1cc3852a1c58b06"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Super administrador inicial
const SUPER_ADMIN_EMAIL = 'instructoresterpel@spira.co';

/**
 * Función principal para inicializar el super administrador
 */
async function initializeSuperAdmin() {
  try {
    console.log('🚀 Iniciando configuración del super administrador...');
    console.log(`📧 Email del super admin: ${SUPER_ADMIN_EMAIL}`);

    // Verificar si ya existe
    const adminDoc = await getDoc(doc(db, 'admins', SUPER_ADMIN_EMAIL));
    
    if (adminDoc.exists()) {
      console.log('✅ El super administrador ya existe en Firestore');
      console.log('📋 Datos actuales:', adminDoc.data());
      
      const shouldUpdate = await askQuestion('¿Quieres actualizar los datos existentes? (s/N): ');
      if (!shouldUpdate.toLowerCase().startsWith('s')) {
        console.log('🔄 Operación cancelada');
        return;
      }
    }

    // Datos del super administrador
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
      createdBy: 'system_initialization',
      description: 'Cuenta principal de administrador con acceso completo al sistema'
    };

    // Crear/actualizar el documento en Firestore
    await setDoc(doc(db, 'admins', SUPER_ADMIN_EMAIL), superAdminData);
    
    console.log('✅ Super administrador creado/actualizado exitosamente en Firestore');
    console.log('🔧 Configuración aplicada:');
    console.log('   - Rol: super_admin');
    console.log('   - Permisos: Acceso completo');
    console.log('   - Estado: Activo');
    console.log('   - Email:', SUPER_ADMIN_EMAIL);
    
    console.log('\n🎉 ¡Configuración completada!');
    console.log('📝 Próximos pasos:');
    console.log('   1. El usuario puede ahora iniciar sesión con Firebase Auth');
    console.log('   2. Tendrá acceso completo al panel de administración');
    console.log('   3. Puede agregar otros administradores desde el panel de gestión');
    console.log('\n⚠️  IMPORTANTE:');
    console.log('   - Asegúrate de que el usuario tenga cuenta en Firebase Auth');
    console.log('   - Guarda estas credenciales de forma segura');
    console.log('   - Considera agregar otros super admins como respaldo');

  } catch (error) {
    console.error('❌ Error al inicializar super administrador:', error);
    
    if (error.code === 'permission-denied') {
      console.log('\n🔒 Error de permisos. Verifica:');
      console.log('   1. Las reglas de Firestore permiten escritura');
      console.log('   2. Las credenciales de Firebase son correctas');
      console.log('   3. El proyecto de Firebase está configurado correctamente');
    }
    
    process.exit(1);
  }
}

/**
 * Función para crear administradores adicionales
 */
async function createAdditionalAdmin() {
  try {
    console.log('\n👥 Creación de administrador adicional');
    
    const email = await askQuestion('📧 Email del nuevo administrador: ');
    if (!email || !email.includes('@')) {
      console.log('❌ Email inválido');
      return;
    }

    const displayName = await askQuestion('👤 Nombre de visualización (opcional): ');
    
    console.log('\n📋 Roles disponibles:');
    console.log('   1. editor - Gestión de instructores y eventos');
    console.log('   2. admin - Todas las funciones excepto gestión de admins');
    console.log('   3. super_admin - Acceso completo');
    
    const roleChoice = await askQuestion('🔧 Selecciona rol (1-3): ');
    
    const roles = {
      '1': 'editor',
      '2': 'admin', 
      '3': 'super_admin'
    };
    
    const role = roles[roleChoice];
    if (!role) {
      console.log('❌ Opción inválida');
      return;
    }

    const permissions = {
      editor: {
        canPublish: false,
        canEditGlobalConfig: false,
        canManageInstructors: true,
        canUploadExcel: true,
        canManageAdmins: false,
        canAccessDebugPanel: false,
      },
      admin: {
        canPublish: true,
        canEditGlobalConfig: true,
        canManageInstructors: true,
        canUploadExcel: true,
        canManageAdmins: false,
        canAccessDebugPanel: true,
      },
      super_admin: {
        canPublish: true,
        canEditGlobalConfig: true,
        canManageInstructors: true,
        canUploadExcel: true,
        canManageAdmins: true,
        canAccessDebugPanel: true,
      }
    };

    const adminData = {
      role: role,
      permissions: permissions[role],
      active: true,
      displayName: displayName || undefined,
      createdAt: serverTimestamp(),
      createdBy: 'system_initialization'
    };

    await setDoc(doc(db, 'admins', email), adminData);
    
    console.log(`✅ Administrador ${role} creado exitosamente:`);
    console.log(`   📧 Email: ${email}`);
    console.log(`   👤 Nombre: ${displayName || 'No especificado'}`);
    console.log(`   🔧 Rol: ${role}`);

  } catch (error) {
    console.error('❌ Error creando administrador adicional:', error);
  }
}

/**
 * Función para verificar el estado actual de administradores
 */
async function checkAdminStatus() {
  try {
    console.log('🔍 Verificando estado de administradores...');
    
    const adminDoc = await getDoc(doc(db, 'admins', SUPER_ADMIN_EMAIL));
    
    if (adminDoc.exists()) {
      console.log('✅ Super administrador encontrado:');
      const data = adminDoc.data();
      console.log(`   📧 Email: ${SUPER_ADMIN_EMAIL}`);
      console.log(`   👤 Nombre: ${data.displayName || 'No especificado'}`);
      console.log(`   🔧 Rol: ${data.role}`);
      console.log(`   🟢 Activo: ${data.active ? 'Sí' : 'No'}`);
      console.log(`   📅 Creado: ${data.createdAt?.toDate?.()?.toLocaleString() || 'Fecha no disponible'}`);
    } else {
      console.log('❌ Super administrador no encontrado en Firestore');
      console.log('💡 Ejecuta la opción 1 para crearlo');
    }

  } catch (error) {
    console.error('❌ Error verificando estado:', error);
  }
}

/**
 * Función auxiliar para leer input del usuario
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
}

/**
 * Menú principal
 */
async function main() {
  console.log('🔧 INICIALIZADOR DE ADMINISTRADORES - PROYECTO CRONOGRAMA');
  console.log('=' .repeat(60));
  
  while (true) {
    console.log('\n📋 Opciones disponibles:');
    console.log('   1. Inicializar super administrador principal');
    console.log('   2. Crear administrador adicional');
    console.log('   3. Verificar estado actual');
    console.log('   4. Salir');
    
    const choice = await askQuestion('\n🔧 Selecciona una opción (1-4): ');
    
    switch (choice) {
      case '1':
        await initializeSuperAdmin();
        break;
      case '2':
        await createAdditionalAdmin();
        break;
      case '3':
        await checkAdminStatus();
        break;
      case '4':
        console.log('👋 ¡Hasta luego!');
        process.exit(0);
        break;
      default:
        console.log('❌ Opción inválida. Por favor selecciona 1-4.');
    }
  }
}

// Configurar stdin para modo raw
process.stdin.setRawMode(false);
process.stdin.resume();
process.stdin.setEncoding('utf8');

// Ejecutar script principal
main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
}); 