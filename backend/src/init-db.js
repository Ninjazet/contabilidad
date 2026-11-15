/**
 * ============================================================================
 * INICIALIZACIÓN AUTOMÁTICA DE BASE DE DATOS EN LA NUBE (backend/src/init-db.js)
 * ============================================================================
 * Si se conecta a un PostgreSQL recién creado y vacío (por ejemplo en Railway),
 * ejecuta automáticamente database/init-contagestion.sql una sola vez.
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { poolConexion } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function asegurarBaseDatosInicializada() {
  const clienteBd = await poolConexion.connect();
  try {
    const verificacion = await clienteBd.query(
      "SELECT to_regclass('public.profiles') AS tabla_perfiles"
    );
    if (verificacion.rows[0]?.tabla_perfiles) {
      return;
    }

    const posiblesRutasSql = [
      path.resolve(__dirname, '../database/init-contagestion.sql'),
      path.resolve(__dirname, '../../database/init-contagestion.sql'),
    ];
    const rutaSql = posiblesRutasSql.find((ruta) => fs.existsSync(ruta));
    if (!rutaSql) {
      console.warn('[Init-DB] No se encontró init-contagestion.sql; omitiendo semilla automática.');
      return;
    }

    console.log('[Init-DB] Base de datos vacía detectada. Ejecutando esquema inicial...');
    const contenidoSql = fs.readFileSync(rutaSql, 'utf8');
    await clienteBd.query(contenidoSql);

    // Garantizar que el usuario de conexión pueda ejecutar SET LOCAL ROLE en proveedores administrados
    await clienteBd.query(`
      DO $$
      BEGIN
        EXECUTE format('GRANT anon, authenticated, service_role TO %I', current_user);
      EXCEPTION WHEN others THEN
        NULL;
      END $$;
    `);

    console.log('[Init-DB] Esquema y usuarios iniciales de ContaGestión creados correctamente.');
  } finally {
    clienteBd.release();
  }
}

