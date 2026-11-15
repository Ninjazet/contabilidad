/**
 * ============================================================================
 * SERVIDOR PRINCIPAL DE LA API CONTAGESTIÓN (backend/src/index.js)
 * ============================================================================
 * Punto de entrada de Node.js/Express. Configura CORS, lectura de JSON,
 * middleware de autenticación y monta las rutas de Auth, REST, Storage y Dominio.
 * ============================================================================
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { autenticarSolicitud } from './middleware/auth.js';
import { asegurarBaseDatosInicializada } from './init-db.js';
import rutasAutenticacion from './routes/auth.js';
import rutasRest from './routes/rest.js';
import rutasAlmacenamiento from './routes/storage.js';
import rutasDominio from './routes/domain.js';

dotenv.config();

const aplicacionExpress = express();
const PUERTO_SERVIDOR = process.env.PORT || 3002;
const origenesPermitidos = (process.env.CORS_ORIGINS || '*').trim();

aplicacionExpress.use(
  cors({
    origin:
      origenesPermitidos === '*'
        ? '*'
        : origenesPermitidos.split(',').map((origen) => origen.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // Se reflejan los encabezados solicitados por el navegador (x-supabase-api-version, etc.)
    exposedHeaders: ['Content-Range', 'Range-Unit', 'Content-Length', 'ETag'],
  })
);

aplicacionExpress.use(express.json({ limit: '10mb' }));
aplicacionExpress.use(express.urlencoded({ extended: true }));

aplicacionExpress.use(autenticarSolicitud);

aplicacionExpress.use((solicitud, _respuesta, siguiente) => {
  const etiquetaUsuario = solicitud.user ? `[Usuario: ${solicitud.user.email}]` : '[Anónimo]';
  console.log(`[ContaGestion-API] ${solicitud.method} ${solicitud.url} ${etiquetaUsuario}`);
  siguiente();
});

aplicacionExpress.use('/api/auth', rutasAutenticacion);
aplicacionExpress.use('/auth', rutasAutenticacion);

aplicacionExpress.use('/api', rutasDominio);

aplicacionExpress.use('/rest/v1', rutasRest);
aplicacionExpress.use('/api/data', rutasRest);

aplicacionExpress.use('/storage/v1', rutasAlmacenamiento);

aplicacionExpress.get(['/', '/health'], (_solicitud, respuesta) => {
  respuesta.json({
    status: 'ok',
    system: 'ContaGestión API (Node.js/Express + PostgreSQL)',
    timestamp: new Date().toISOString(),
  });
});

aplicacionExpress.use((errorServidor, _solicitud, respuesta, _siguiente) => {
  console.error('[Error Interno ContaGestion-API]', errorServidor);
  respuesta.status(500).json({ error: 'Error interno del servidor', message: errorServidor.message });
});

async function iniciarServidor() {
  try {
    await asegurarBaseDatosInicializada();
  } catch (errorInit) {
    console.error('[Init-DB Error] No se pudo verificar/inicializar la BD al arrancar:', errorInit.message);
  }

  aplicacionExpress.listen(PUERTO_SERVIDOR, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 API ContaGestión corriendo en puerto ${PUERTO_SERVIDOR}`);
    console.log(`   Estado de salud: /health`);
    console.log(`====================================================`);
  });
}

void iniciarServidor();
