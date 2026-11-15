/**
 * ============================================================================
 * MIDDLEWARE DE AUTENTICACIÓN JWT (middleware/auth.js)
 * ============================================================================
 * Verifica el token Bearer enviado por el cliente y adjunta el usuario
 * decodificado a `solicitud.user` y `solicitud.usuario`.
 * ============================================================================
 */

import jwt from 'jsonwebtoken';

export const SECRETO_JWT = process.env.JWT_SECRET || 'super-secret-jwt-token-key-2026-sirh-contagestion';

export function autenticarSolicitud(solicitud, respuesta, siguiente) {
  const encabezadoAutorizacion = solicitud.headers.authorization;
  if (!encabezadoAutorizacion) {
    solicitud.user = null;
    solicitud.usuario = null;
    return siguiente();
  }

  const tokenAcceso = encabezadoAutorizacion.replace(/^Bearer\s+/i, '').trim();
  if (!tokenAcceso) {
    solicitud.user = null;
    solicitud.usuario = null;
    return siguiente();
  }

  try {
    const usuarioDecodificado = jwt.verify(tokenAcceso, SECRETO_JWT);
    solicitud.user = usuarioDecodificado;
    solicitud.usuario = usuarioDecodificado;
    siguiente();
  } catch (errorVerificacion) {
    solicitud.user = null;
    solicitud.usuario = null;
    siguiente();
  }
}

export function requerirAutenticacion(solicitud, respuesta, siguiente) {
  if (!solicitud.user) {
    return respuesta.status(401).json({
      error: 'No autenticado',
      message: 'Se requiere un token de autenticación válido',
    });
  }
  siguiente();
}

// Alias de compatibilidad
export {
  SECRETO_JWT as JWT_SECRET,
  autenticarSolicitud as authenticate,
  requerirAutenticacion as requireAuth,
};
