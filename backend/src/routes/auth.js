/**
 * ============================================================================
 * RUTAS DE AUTENTICACIÓN Y GESTIÓN DE USUARIOS (routes/auth.js)
 * ============================================================================
 * Maneja inicio de sesión, creación y administración de colaboradores,
 * restablecimiento de contraseñas y consulta de sesión activa.
 * ============================================================================
 */

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { poolConexion, consultarComoUsuario } from '../db.js';
import { SECRETO_JWT, requerirAutenticacion } from '../middleware/auth.js';

const enrutador = Router();

function generarTokenSesion(usuario) {
  return jwt.sign(
    {
      sub: usuario.id,
      id: usuario.id,
      email: usuario.email,
      role: 'authenticated',
      app_metadata: usuario.raw_app_meta_data || {},
      user_metadata: usuario.raw_user_meta_data || {},
    },
    SECRETO_JWT,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/login y /auth/v1/token
const procesarInicioSesion = async (solicitud, respuesta) => {
  try {
    const correoElectronico = solicitud.body.email?.trim().toLowerCase();
    const contrasena = solicitud.body.password;

    if (!correoElectronico || !contrasena) {
      return respuesta.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    // Consulta con verificación directa en PostgreSQL e inspección del estado en profiles
    const resultadoConsulta = await poolConexion.query(
      `SELECT u.id, u.email, u.encrypted_password, u.raw_user_meta_data, u.raw_app_meta_data, u.created_at,
              (u.encrypted_password = crypt($2, u.encrypted_password)) as clave_valida_pg,
              p.active as perfil_activo
       FROM auth.users u
       LEFT JOIN public.profiles p ON p.id = u.id
       WHERE LOWER(u.email) = LOWER($1)`,
      [correoElectronico, contrasena]
    );

    if (resultadoConsulta.rows.length === 0) {
      return respuesta.status(400).json({ error: 'Credenciales inválidas', message: 'Invalid login credentials' });
    }

    const usuarioEncontrado = resultadoConsulta.rows[0];
    let contrasenaEsValida = usuarioEncontrado.clave_valida_pg;

    if (!contrasenaEsValida && usuarioEncontrado.encrypted_password) {
      try {
        contrasenaEsValida = bcrypt.compareSync(contrasena, usuarioEncontrado.encrypted_password);
      } catch (errorFormato) {
        // Ignorar error de formato de hash
      }
    }

    if (!contrasenaEsValida) {
      return respuesta.status(400).json({ error: 'Credenciales inválidas', message: 'Invalid login credentials' });
    }

    if (usuarioEncontrado.perfil_activo === false) {
      return respuesta.status(403).json({
        error: 'Cuenta inactiva',
        message: 'Su cuenta de colaborador está desactivada. Contacte al Administrador.',
      });
    }

    const tokenAcceso = generarTokenSesion(usuarioEncontrado);
    const respuestaSesion = {
      access_token: tokenAcceso,
      token_type: 'bearer',
      expires_in: 604800,
      refresh_token: tokenAcceso,
      user: {
        id: usuarioEncontrado.id,
        email: usuarioEncontrado.email,
        role: 'authenticated',
        app_metadata: usuarioEncontrado.raw_app_meta_data || {},
        user_metadata: usuarioEncontrado.raw_user_meta_data || {},
        created_at: usuarioEncontrado.created_at,
      },
    };

    return respuesta.json(respuestaSesion);
  } catch (errorServidor) {
    console.error('[Error en Inicio de Sesión]', errorServidor);
    return respuesta.status(500).json({ error: 'Error del servidor al iniciar sesión' });
  }
};

enrutador.post('/login', procesarInicioSesion);
enrutador.post('/v1/token', procesarInicioSesion);

// POST /api/auth/admin/users y /auth/v1/admin/users (Alta de colaborador por Administrador)
const procesarCreacionUsuarioPorAdmin = async (solicitud, respuesta) => {
  if (!solicitud.user) {
    return respuesta.status(401).json({ error: 'No autenticado' });
  }

  try {
    const verificacionAdmin = await poolConexion.query(
      `SELECT role_id FROM public.profiles WHERE id = $1 AND active = true`,
      [solicitud.user.id]
    );
    if (verificacionAdmin.rows[0]?.role_id !== 'administrador') {
      return respuesta.status(403).json({
        error: 'Acceso denegado',
        message: 'Solo un Administrador puede dar de alta nuevos colaboradores.',
      });
    }

    const correoElectronico = solicitud.body.email?.trim().toLowerCase();
    const contrasena = solicitud.body.password;
    const nombreCompleto = solicitud.body.name?.trim();
    const idRol = solicitud.body.role_id || 'auxiliar_contable';
    const estadoActivo = solicitud.body.active !== undefined ? Boolean(solicitud.body.active) : true;

    if (!correoElectronico || !contrasena || !nombreCompleto) {
      return respuesta.status(400).json({ error: 'Nombre, correo y contraseña son requeridos.' });
    }

    const salEncriptacion = bcrypt.genSaltSync(10);
    const contrasenaEncriptada = bcrypt.hashSync(contrasena, salEncriptacion);

    const clienteBd = await poolConexion.connect();
    try {
      await clienteBd.query('BEGIN');
      await clienteBd.query("SELECT set_config('app.current_user_id', $1, true)", [solicitud.user.id]);
      await clienteBd.query("SELECT set_config('app.current_user_role', 'authenticated', true)");

      const resultadoUsuario = await clienteBd.query(
        `INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data)
         VALUES ($1, $2, $3)
         RETURNING id, email, created_at`,
        [correoElectronico, contrasenaEncriptada, JSON.stringify({ name: nombreCompleto, role_id: idRol })]
      );
      const nuevoUsuario = resultadoUsuario.rows[0];

      const resultadoPerfil = await clienteBd.query(
        `INSERT INTO public.profiles (id, name, email, role_id, active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [nuevoUsuario.id, nombreCompleto, correoElectronico, idRol, estadoActivo]
      );

      await clienteBd.query('COMMIT');
      return respuesta.status(201).json({ profile: resultadoPerfil.rows[0], user: nuevoUsuario });
    } catch (errorTransaccion) {
      await clienteBd.query('ROLLBACK');
      throw errorTransaccion;
    } finally {
      clienteBd.release();
    }
  } catch (errorGeneral) {
    if (errorGeneral.code === '23505') {
      return respuesta.status(409).json({ error: 'Ya existe un colaborador registrado con ese correo electrónico.' });
    }
    console.error('[Error al Crear Colaborador por Admin]', errorGeneral);
    return respuesta.status(500).json({ error: errorGeneral.message || 'Error al crear el colaborador' });
  }
};

enrutador.post('/admin/users', requerirAutenticacion, procesarCreacionUsuarioPorAdmin);
enrutador.post('/v1/admin/users', requerirAutenticacion, procesarCreacionUsuarioPorAdmin);

// PUT /api/auth/admin/users/:id/password y /auth/v1/admin/users/:id/password (Cambio de clave por Administrador)
const procesarCambioClavePorAdmin = async (solicitud, respuesta) => {
  if (!solicitud.user) {
    return respuesta.status(401).json({ error: 'No autenticado' });
  }

  try {
    const verificacionAdmin = await poolConexion.query(
      `SELECT role_id FROM public.profiles WHERE id = $1 AND active = true`,
      [solicitud.user.id]
    );
    if (verificacionAdmin.rows[0]?.role_id !== 'administrador') {
      return respuesta.status(403).json({
        error: 'Acceso denegado',
        message: 'Solo un Administrador puede restablecer contraseñas de otros colaboradores.',
      });
    }

    const idColaboradorDestino = solicitud.params.id;
    const nuevaContrasena = solicitud.body?.password;
    if (!idColaboradorDestino || !nuevaContrasena || String(nuevaContrasena).length < 6) {
      return respuesta.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    const salEncriptacion = bcrypt.genSaltSync(10);
    const contrasenaEncriptada = bcrypt.hashSync(String(nuevaContrasena), salEncriptacion);

    const resultadoActualizacion = await poolConexion.query(
      `UPDATE auth.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email`,
      [contrasenaEncriptada, idColaboradorDestino]
    );
    if (resultadoActualizacion.rows.length === 0) {
      return respuesta.status(404).json({ error: 'Colaborador no encontrado en autenticación.' });
    }

    return respuesta.json({ message: 'Contraseña actualizada correctamente', user: resultadoActualizacion.rows[0] });
  } catch (errorGeneral) {
    console.error('[Error al Cambiar Contraseña por Admin]', errorGeneral);
    return respuesta.status(500).json({ error: errorGeneral.message || 'Error al actualizar la contraseña' });
  }
};

enrutador.put('/admin/users/:id/password', requerirAutenticacion, procesarCambioClavePorAdmin);
enrutador.put('/v1/admin/users/:id/password', requerirAutenticacion, procesarCambioClavePorAdmin);

// POST /api/auth/register y /auth/v1/signup
const procesarRegistroUsuario = async (solicitud, respuesta) => {
  try {
    const correoElectronico = solicitud.body.email?.trim().toLowerCase();
    const contrasena = solicitud.body.password;
    const metadatos = solicitud.body.data || solicitud.body.metadata || {};

    if (!correoElectronico || !contrasena) {
      return respuesta.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const salEncriptacion = bcrypt.genSaltSync(10);
    const contrasenaEncriptada = bcrypt.hashSync(contrasena, salEncriptacion);

    const resultadoInsercion = await poolConexion.query(
      `INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data)
       VALUES ($1, $2, $3)
       RETURNING id, email, raw_user_meta_data, raw_app_meta_data, created_at`,
      [correoElectronico, contrasenaEncriptada, JSON.stringify(metadatos)]
    );

    const nuevoUsuario = resultadoInsercion.rows[0];

    if (metadatos.name || solicitud.body.name) {
      const nombreCompleto = (metadatos.name || solicitud.body.name).trim();
      const idRol = metadatos.role_id || solicitud.body.role_id || 'auxiliar_contable';
      await consultarComoUsuario(
        solicitud.user?.id || nuevoUsuario.id,
        'authenticated',
        `INSERT INTO public.profiles (id, name, email, role_id, active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (id) DO NOTHING`,
        [nuevoUsuario.id, nombreCompleto, correoElectronico, idRol]
      );
    }

    const tokenAcceso = generarTokenSesion(nuevoUsuario);

    return respuesta.status(201).json({
      access_token: tokenAcceso,
      token_type: 'bearer',
      expires_in: 604800,
      user: nuevoUsuario,
    });
  } catch (errorRegistro) {
    if (errorRegistro.code === '23505') {
      return respuesta.status(409).json({ error: 'El usuario ya existe' });
    }
    console.error('[Error en Registro de Usuario]', errorRegistro);
    return respuesta.status(500).json({ error: 'Error al registrar usuario' });
  }
};

enrutador.post('/register', procesarRegistroUsuario);
enrutador.post('/v1/signup', procesarRegistroUsuario);

// GET /api/auth/me y /auth/v1/user
const obtenerUsuarioActual = async (solicitud, respuesta) => {
  if (!solicitud.user) {
    return respuesta.status(401).json({ error: 'No autenticado' });
  }

  try {
    const resultadoConsulta = await poolConexion.query(
      `SELECT id, email, raw_user_meta_data, raw_app_meta_data, created_at
       FROM auth.users
       WHERE id = $1`,
      [solicitud.user.id]
    );

    if (resultadoConsulta.rows.length === 0) {
      return respuesta.status(404).json({ error: 'Usuario no encontrado' });
    }

    const datosUsuario = resultadoConsulta.rows[0];
    return respuesta.json({
      id: datosUsuario.id,
      email: datosUsuario.email,
      role: 'authenticated',
      app_metadata: datosUsuario.raw_app_meta_data || {},
      user_metadata: datosUsuario.raw_user_meta_data || {},
      created_at: datosUsuario.created_at,
    });
  } catch (errorConsulta) {
    console.error('[Error al Obtener Usuario Actual]', errorConsulta);
    return respuesta.status(500).json({ error: 'Error al obtener usuario' });
  }
};

enrutador.get('/me', obtenerUsuarioActual);
enrutador.get('/v1/user', obtenerUsuarioActual);

// PUT /api/auth/user y /auth/v1/user
const actualizarUsuarioActual = async (solicitud, respuesta) => {
  if (!solicitud.user) {
    return respuesta.status(401).json({ error: 'No autenticado' });
  }

  try {
    const { password: nuevaContrasena, data: nuevosMetadatos } = solicitud.body || {};
    const clausulasSet = ['updated_at = NOW()'];
    const parametrosSql = [solicitud.user.id];
    let indiceParametro = 2;

    if (nuevaContrasena) {
      const salEncriptacion = bcrypt.genSaltSync(10);
      const contrasenaEncriptada = bcrypt.hashSync(nuevaContrasena, salEncriptacion);
      clausulasSet.push(`encrypted_password = $${indiceParametro++}`);
      parametrosSql.push(contrasenaEncriptada);
    }

    if (nuevosMetadatos) {
      clausulasSet.push(`raw_user_meta_data = $${indiceParametro++}`);
      parametrosSql.push(JSON.stringify(nuevosMetadatos));
    }

    const consultaSql = `UPDATE auth.users SET ${clausulasSet.join(', ')} WHERE id = $1 RETURNING id, email, raw_user_meta_data, raw_app_meta_data, created_at`;
    const resultadoActualizacion = await poolConexion.query(consultaSql, parametrosSql);

    if (resultadoActualizacion.rows.length === 0) {
      return respuesta.status(404).json({ error: 'Usuario no encontrado' });
    }

    const datosUsuario = resultadoActualizacion.rows[0];
    return respuesta.json({
      id: datosUsuario.id,
      email: datosUsuario.email,
      role: 'authenticated',
      app_metadata: datosUsuario.raw_app_meta_data || {},
      user_metadata: datosUsuario.raw_user_meta_data || {},
      created_at: datosUsuario.created_at,
    });
  } catch (errorActualizacion) {
    console.error('[Error al Actualizar Usuario]', errorActualizacion);
    return respuesta.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

enrutador.put('/user', actualizarUsuarioActual);
enrutador.put('/v1/user', actualizarUsuarioActual);

// POST /api/auth/logout y /auth/v1/logout
const procesarCierreSesion = (_solicitud, respuesta) => {
  return respuesta.json({ message: 'Sesión cerrada exitosamente' });
};
enrutador.post('/logout', procesarCierreSesion);
enrutador.post('/v1/logout', procesarCierreSesion);

export default enrutador;
