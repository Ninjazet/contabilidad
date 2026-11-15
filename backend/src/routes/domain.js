/**
 * ============================================================================
 * RUTAS DE DOMINIO DE NEGOCIO (routes/domain.js)
 * ============================================================================
 * Endpoints directos en español para consultas integradas de clientes,
 * expedientes, obligaciones fiscales, cobros, visitas a Quimistán y personal.
 * ============================================================================
 */

import { Router } from 'express';
import { consultarComoUsuario } from '../db.js';
import { requerirAutenticacion } from '../middleware/auth.js';

const enrutador = Router();

enrutador.use(requerirAutenticacion);

// GET /api/clientes
enrutador.get('/clientes', async (solicitud, respuesta) => {
  try {
    const resultadoConsulta = await consultarComoUsuario(
      solicitud.user.id,
      solicitud.user.role,
      `SELECT * FROM clients ORDER BY code ASC`
    );
    respuesta.json({ success: true, count: resultadoConsulta.rows.length, data: resultadoConsulta.rows });
  } catch (errorConsulta) {
    respuesta.status(500).json({ success: false, error: errorConsulta.message });
  }
});

// GET /api/clientes/:id
enrutador.get('/clientes/:id', async (solicitud, respuesta) => {
  try {
    const resultadoConsulta = await consultarComoUsuario(
      solicitud.user.id,
      solicitud.user.role,
      `SELECT * FROM clients WHERE id = $1`,
      [solicitud.params.id]
    );
    if (resultadoConsulta.rows.length === 0) {
      return respuesta.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }
    respuesta.json({ success: true, data: resultadoConsulta.rows[0] });
  } catch (errorConsulta) {
    respuesta.status(500).json({ success: false, error: errorConsulta.message });
  }
});

// GET /api/expedientes
enrutador.get('/expedientes', async (solicitud, respuesta) => {
  try {
    const resultadoConsulta = await consultarComoUsuario(
      solicitud.user.id,
      solicitud.user.role,
      `SELECT f.*, c.legal_name, c.commercial_name, c.rtn
       FROM files f
       JOIN clients c ON c.id = f.client_id
       ORDER BY f.code ASC`
    );
    respuesta.json({ success: true, count: resultadoConsulta.rows.length, data: resultadoConsulta.rows });
  } catch (errorConsulta) {
    respuesta.status(500).json({ success: false, error: errorConsulta.message });
  }
});

// GET /api/obligaciones
enrutador.get('/obligaciones', async (solicitud, respuesta) => {
  try {
    const resultadoConsulta = await consultarComoUsuario(
      solicitud.user.id,
      solicitud.user.role,
      `SELECT * FROM fiscal_obligations ORDER BY day_of_month ASC`
    );
    respuesta.json({ success: true, count: resultadoConsulta.rows.length, data: resultadoConsulta.rows });
  } catch (errorConsulta) {
    respuesta.status(500).json({ success: false, error: errorConsulta.message });
  }
});

// GET /api/cobros
enrutador.get('/cobros', async (solicitud, respuesta) => {
  try {
    const resultadoConsulta = await consultarComoUsuario(
      solicitud.user.id,
      solicitud.user.role,
      `SELECT col.*, c.legal_name, c.rtn
       FROM collections col
       JOIN clients c ON c.id = col.client_id
       ORDER BY col.period_year DESC, col.period_month DESC`
    );
    respuesta.json({ success: true, count: resultadoConsulta.rows.length, data: resultadoConsulta.rows });
  } catch (errorConsulta) {
    respuesta.status(500).json({ success: false, error: errorConsulta.message });
  }
});

// GET /api/visitas
enrutador.get('/visitas', async (solicitud, respuesta) => {
  try {
    const resultadoConsulta = await consultarComoUsuario(
      solicitud.user.id,
      solicitud.user.role,
      `SELECT q.*, c.legal_name 
       FROM quimistan_visits q
       LEFT JOIN clients c ON c.id = q.client_id
       ORDER BY q.visit_date DESC`
    );
    respuesta.json({ success: true, count: resultadoConsulta.rows.length, data: resultadoConsulta.rows });
  } catch (errorConsulta) {
    respuesta.status(500).json({ success: false, error: errorConsulta.message });
  }
});

// GET /api/personal
enrutador.get('/personal', async (solicitud, respuesta) => {
  try {
    const resultadoConsulta = await consultarComoUsuario(
      solicitud.user.id,
      solicitud.user.role,
      `SELECT p.*, r.description as role_description 
       FROM profiles p
       JOIN roles r ON r.id = p.role_id
       ORDER BY p.name ASC`
    );
    respuesta.json({ success: true, count: resultadoConsulta.rows.length, data: resultadoConsulta.rows });
  } catch (errorConsulta) {
    respuesta.status(500).json({ success: false, error: errorConsulta.message });
  }
});

export default enrutador;
