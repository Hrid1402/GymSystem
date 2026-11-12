import 'dotenv/config';
import { pool } from './index.js';
import { buildSchema } from './schema.js';
import { seedDemoData } from './seedDemo.js';

async function reset() {
  console.log('===========================================================');
  console.log('   GYMSTARK: RESET COMPLETO DE BASE DE DATOS Y AUTH        ');
  console.log('===========================================================');

  try {
    console.log('\n[1/2] Limpiando cuentas de Auth y reconstruyendo esquema...');
    await buildSchema({ closePool: false, cleanAuth: true });

    console.log('\n[2/2] Sembrando Gerente, planes, usuarios demo y asistencias...');
    await seedDemoData({ closePool: false });

    console.log('\n===========================================================');
    console.log('  ✓ ¡SISTEMA REINICIADO EXITOSAMENTE DE 0 A 100!           ');
    console.log('===========================================================\n');
  } catch (error) {
    console.error('Error fatal durante el reset:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

reset();
