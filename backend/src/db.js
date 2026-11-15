/**
 * ============================================================================
 * CONEXIÓN A BASE DE DATOS POSTGRESQL (backend/src/db.js)
 * ============================================================================
 * Administra el pool de conexiones y la ejecución de consultas vinculadas
 * al contexto del usuario autenticado (Políticas RLS de PostgreSQL).
 * ============================================================================
 */

import paquetePg from 'pg';
const { Pool, types: tiposPg } = paquetePg;
import dotenv from 'dotenv';

dotenv.config();

// Evitar que node-postgres convierta columnas DATE (OID 1082) en objetos Date con hora UTC,
// devolviendo siempre la cadena exacta 'YYYY-MM-DD' igual que PostgREST/Supabase.
tiposPg.setTypeParser(1082, (valorFecha) => valorFecha);

const cadenaConexion =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/contagestion_db';

function resolverConfiguracionSsl(urlConexion) {
  if (process.env.DATABASE_SSL === 'false') return false;
  if (process.env.DATABASE_SSL === 'true') return { rejectUnauthorized: false };
  const urlMinuscula = String(urlConexion).toLowerCase();
  const esRedPrivadaLocal =
    urlMinuscula.includes('localhost') ||
    urlMinuscula.includes('127.0.0.1') ||
    urlMinuscula.includes('contagestion-db') ||
    urlMinuscula.includes('.railway.internal');
  if (!esRedPrivadaLocal || urlMinuscula.includes('sslmode=require')) {
    return { rejectUnauthorized: false };
  }
  return false;
}

export const poolConexion = new Pool({
  connectionString: cadenaConexion,
  ssl: resolverConfiguracionSsl(cadenaConexion),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

poolConexion.on('error', (errorPool) => {
  console.error('[Error en Pool de Base de Datos]', errorPool);
});

/**
 * Ejecuta una consulta SQL dentro de una transacción vinculada al usuario autenticado actual.
 * Esto asegura que auth.uid() y las políticas RLS de PostgreSQL se apliquen fielmente.
 */
export async function consultarComoUsuario(idUsuario, rolUsuario, consultaSql, parametros = []) {
  const clienteBd = await poolConexion.connect();
  try {
    await clienteBd.query('BEGIN');
    if (idUsuario) {
      await clienteBd.query("SELECT set_config('app.current_user_id', $1, true)", [idUsuario]);
      await clienteBd.query("SELECT set_config('app.current_user_role', $1, true)", [rolUsuario || 'authenticated']);
      await clienteBd.query('SET LOCAL ROLE authenticated');
    } else {
      await clienteBd.query("SELECT set_config('app.current_user_id', '', true)");
      await clienteBd.query("SELECT set_config('app.current_user_role', 'anon', true)");
      await clienteBd.query('SET LOCAL ROLE anon');
    }
    const resultadoConsulta = await clienteBd.query(consultaSql, parametros);
    await clienteBd.query('COMMIT');
    return resultadoConsulta;
  } catch (errorConsulta) {
    await clienteBd.query('ROLLBACK');
    throw errorConsulta;
  } finally {
    clienteBd.release();
  }
}

// Alias de compatibilidad
export { poolConexion as pool, consultarComoUsuario as queryAsUser };
