/**
 * ============================================================================
 * BÓVEDA DE ALMACENAMIENTO DE DOCUMENTOS (routes/storage.js)
 * ============================================================================
 * Gestiona la subida, firma criptográfica de enlaces de descarga y eliminación
 * física/lógica de archivos en la bóveda documental de ContaGestión.
 * ============================================================================
 */

import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { poolConexion } from '../db.js';
import { SECRETO_JWT, requerirAutenticacion } from '../middleware/auth.js';

const enrutador = Router();
const DIRECTORIO_RAIZ_SUBIDAS = path.resolve(process.env.STORAGE_PATH || './uploads');

if (!fs.existsSync(DIRECTORIO_RAIZ_SUBIDAS)) {
  fs.mkdirSync(DIRECTORIO_RAIZ_SUBIDAS, { recursive: true });
}

function sanearRutaRelativa(rutaCruda = '') {
  const rutaLimpia = String(rutaCruda)
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .filter((segmento) => segmento && segmento !== '.' && segmento !== '..')
    .join('/');
  return rutaLimpia || `archivo_${Date.now()}`;
}

function resolverArchivoEnContenedor(nombreContenedor, rutaRelativaCruda) {
  const contenedorSeguro = sanearRutaRelativa(nombreContenedor).replace(/\//g, '_');
  const rutaRelativa = sanearRutaRelativa(rutaRelativaCruda);
  const raizContenedor = path.resolve(DIRECTORIO_RAIZ_SUBIDAS, contenedorSeguro);
  const rutaExacta = path.resolve(raizContenedor, rutaRelativa);

  if (rutaExacta.startsWith(raizContenedor) && fs.existsSync(rutaExacta) && fs.statSync(rutaExacta).isFile()) {
    return rutaExacta;
  }

  // Respaldo de búsqueda para archivos subidos en la raíz del contenedor o con prefijo timestamp_
  const nombreBase = path.basename(rutaRelativa);
  const rutaPlana = path.resolve(raizContenedor, nombreBase);
  if (rutaPlana.startsWith(raizContenedor) && fs.existsSync(rutaPlana) && fs.statSync(rutaPlana).isFile()) {
    return rutaPlana;
  }

  if (fs.existsSync(raizContenedor)) {
    const entradasDirectorio = fs.readdirSync(raizContenedor);
    const coincidencia = entradasDirectorio.find(
      (entrada) => entrada === nombreBase || entrada.endsWith(`_${nombreBase}`)
    );
    if (coincidencia) {
      const rutaCandidata = path.resolve(raizContenedor, coincidencia);
      if (fs.statSync(rutaCandidata).isFile()) {
        return rutaCandidata;
      }
    }
  }

  return null;
}

const motorAlmacenamientoDisco = multer.diskStorage({
  destination: (solicitud, archivo, confirmarDestino) => {
    try {
      const contenedorSeguro = sanearRutaRelativa(solicitud.params.bucket || 'default').replace(/\//g, '_');
      const rutaComodin = sanearRutaRelativa(solicitud.params[0] || archivo.originalname);
      const subDirectorio = path.dirname(rutaComodin);
      const directorioDestino =
        subDirectorio && subDirectorio !== '.'
          ? path.resolve(DIRECTORIO_RAIZ_SUBIDAS, contenedorSeguro, subDirectorio)
          : path.resolve(DIRECTORIO_RAIZ_SUBIDAS, contenedorSeguro);

      if (!fs.existsSync(directorioDestino)) {
        fs.mkdirSync(directorioDestino, { recursive: true });
      }
      confirmarDestino(null, directorioDestino);
    } catch (errorDestino) {
      confirmarDestino(errorDestino);
    }
  },
  filename: (solicitud, archivo, confirmarNombre) => {
    const rutaComodin = sanearRutaRelativa(solicitud.params[0] || archivo.originalname);
    const nombreSeguro = path.basename(rutaComodin);
    confirmarNombre(null, nombreSeguro);
  },
});

const gestorSubidaArchivos = multer({
  storage: motorAlmacenamientoDisco,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// 1. POST /storage/v1/object/sign/:bucket/* (Crear URL firmada para un archivo)
enrutador.post('/object/sign/:bucket/*', requerirAutenticacion, async (solicitud, respuesta) => {
  try {
    const nombreContenedor = solicitud.params.bucket;
    const rutaArchivo = sanearRutaRelativa(solicitud.params[0] || '');
    const segundosExpiracion = Math.max(Number(solicitud.body?.expiresIn) || 300, 60);

    const tokenDescarga = jwt.sign(
      { bucket: nombreContenedor, path: rutaArchivo, type: 'storage_sign' },
      SECRETO_JWT,
      { expiresIn: segundosExpiracion }
    );

    const urlFirmada = `/object/sign/${nombreContenedor}/${rutaArchivo}?token=${encodeURIComponent(tokenDescarga)}`;
    return respuesta.status(200).json({ signedURL: urlFirmada, signedUrl: urlFirmada });
  } catch (errorFirma) {
    console.error('[Error al Firmar URL de Archivo]', errorFirma);
    return respuesta.status(500).json({ error: errorFirma.message });
  }
});

// 2. POST /storage/v1/object/sign/:bucket (Crear múltiples URLs firmadas)
enrutador.post('/object/sign/:bucket', requerirAutenticacion, async (solicitud, respuesta) => {
  try {
    const nombreContenedor = solicitud.params.bucket;
    const listaRutas = Array.isArray(solicitud.body?.paths) ? solicitud.body.paths : [];
    const segundosExpiracion = Math.max(Number(solicitud.body?.expiresIn) || 300, 60);

    const resultadoLote = listaRutas.map((rutaOriginal) => {
      const rutaArchivo = sanearRutaRelativa(rutaOriginal);
      const tokenDescarga = jwt.sign(
        { bucket: nombreContenedor, path: rutaArchivo, type: 'storage_sign' },
        SECRETO_JWT,
        { expiresIn: segundosExpiracion }
      );
      const urlFirmada = `/object/sign/${nombreContenedor}/${rutaArchivo}?token=${encodeURIComponent(tokenDescarga)}`;
      return { error: null, path: rutaOriginal, signedURL: urlFirmada, signedUrl: urlFirmada };
    });

    return respuesta.status(200).json(resultadoLote);
  } catch (errorFirmaLote) {
    console.error('[Error al Firmar Lote de Archivos]', errorFirmaLote);
    return respuesta.status(500).json({ error: errorFirmaLote.message });
  }
});

// 3. GET /storage/v1/object/sign/:bucket/* (Descargar archivo mediante URL firmada)
enrutador.get('/object/sign/:bucket/*', (solicitud, respuesta) => {
  try {
    const nombreContenedor = solicitud.params.bucket;
    const rutaArchivo = sanearRutaRelativa(solicitud.params[0] || '');
    const tokenDescarga = solicitud.query.token;

    if (!tokenDescarga) {
      return respuesta.status(401).json({ error: 'Token de descarga requerido para acceder a este documento' });
    }

    try {
      const datosToken = jwt.verify(String(tokenDescarga), SECRETO_JWT);
      if (datosToken.type !== 'storage_sign' || datosToken.bucket !== nombreContenedor || datosToken.path !== rutaArchivo) {
        return respuesta.status(403).json({ error: 'Token de descarga no corresponde al archivo solicitado' });
      }
    } catch (errorVerificacion) {
      return respuesta.status(403).json({ error: 'Enlace de descarga expirado o inválido' });
    }

    const rutaFisicaResuelta = resolverArchivoEnContenedor(nombreContenedor, rutaArchivo);
    if (!rutaFisicaResuelta) {
      return respuesta.status(404).json({ error: 'Archivo no encontrado en el almacenamiento' });
    }

    if (solicitud.query.download !== undefined) {
      const nombreDescargaPersonalizado =
        typeof solicitud.query.download === 'string' && solicitud.query.download.trim()
          ? solicitud.query.download.trim()
          : path.basename(rutaFisicaResuelta);
      return respuesta.download(rutaFisicaResuelta, nombreDescargaPersonalizado);
    }

    return respuesta.sendFile(rutaFisicaResuelta);
  } catch (errorDescarga) {
    console.error('[Error en Descarga de Archivo Firmado]', errorDescarga);
    return respuesta.status(500).json({ error: errorDescarga.message });
  }
});

// 4. POST y PUT /storage/v1/object/:bucket/* (Subir o reemplazar archivo)
const procesarSubidaArchivo = async (solicitud, respuesta) => {
  try {
    const nombreContenedor = solicitud.params.bucket;
    const archivoSubido = (Array.isArray(solicitud.files) && solicitud.files[0]) || solicitud.file;
    const rutaArchivo = sanearRutaRelativa(solicitud.params[0] || archivoSubido?.originalname || 'archivo');

    if (!archivoSubido) {
      return respuesta.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const urlPublica = `/storage/v1/object/public/${nombreContenedor}/${rutaArchivo}`;
    let idObjetoAlmacenado = archivoSubido.filename;

    try {
      const registroExistente = await poolConexion.query(
        `SELECT id FROM storage.objects WHERE bucket_id = $1 AND name = $2 LIMIT 1`,
        [nombreContenedor, rutaArchivo]
      );
      const metadatosArchivo = JSON.stringify({
        mimetype: archivoSubido.mimetype,
        size: archivoSubido.size,
        localPath: archivoSubido.path,
      });

      if (registroExistente.rows.length > 0) {
        idObjetoAlmacenado = registroExistente.rows[0].id;
        await poolConexion.query(
          `UPDATE storage.objects SET metadata = $1, updated_at = now() WHERE id = $2`,
          [metadatosArchivo, idObjetoAlmacenado]
        );
      } else {
        const resultadoInsercion = await poolConexion.query(
          `INSERT INTO storage.objects (bucket_id, name, owner, metadata)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [nombreContenedor, rutaArchivo, solicitud.user?.id || null, metadatosArchivo]
        );
        if (resultadoInsercion.rows[0]?.id) {
          idObjetoAlmacenado = resultadoInsercion.rows[0].id;
        }
      }
    } catch (errorBaseDatos) {
      console.warn('[Advertencia de Registro en storage.objects]', errorBaseDatos.message);
    }

    return respuesta.status(200).json({
      Key: `${nombreContenedor}/${rutaArchivo}`,
      Id: idObjetoAlmacenado,
      path: rutaArchivo,
      publicUrl: urlPublica,
    });
  } catch (errorSubida) {
    console.error('[Error al Subir Archivo]', errorSubida);
    return respuesta.status(500).json({ error: errorSubida.message });
  }
};

enrutador.post('/object/:bucket/*', requerirAutenticacion, gestorSubidaArchivos.any(), procesarSubidaArchivo);
enrutador.put('/object/:bucket/*', requerirAutenticacion, gestorSubidaArchivos.any(), procesarSubidaArchivo);

// 5. DELETE /storage/v1/object/:bucket (Eliminar lista de archivos vía supabase.storage.remove)
enrutador.delete('/object/:bucket', requerirAutenticacion, async (solicitud, respuesta) => {
  try {
    const nombreContenedor = solicitud.params.bucket;
    const listaPrefijos = Array.isArray(solicitud.body?.prefixes) ? solicitud.body.prefixes : [];
    const archivosEliminados = [];

    for (const entrada of listaPrefijos) {
      const rutaCruda = typeof entrada === 'string' ? entrada : entrada?.path;
      if (!rutaCruda) continue;
      const rutaRelativa = sanearRutaRelativa(rutaCruda);
      const rutaFisicaResuelta = resolverArchivoEnContenedor(nombreContenedor, rutaRelativa);
      if (rutaFisicaResuelta && fs.existsSync(rutaFisicaResuelta)) {
        try {
          fs.unlinkSync(rutaFisicaResuelta);
        } catch (errorBorradoDisco) {
          console.warn('[Advertencia al Borrar Archivo de Disco]', errorBorradoDisco.message);
        }
      }
      try {
        await poolConexion.query(
          `DELETE FROM storage.objects WHERE bucket_id = $1 AND name = $2`,
          [nombreContenedor, rutaRelativa]
        );
      } catch (errorBorradoBd) {
        console.warn('[Advertencia al Borrar Registro storage.objects]', errorBorradoBd.message);
      }
      archivosEliminados.push({ name: rutaRelativa, bucket_id: nombreContenedor });
    }

    return respuesta.status(200).json(archivosEliminados);
  } catch (errorEliminacionLote) {
    console.error('[Error al Eliminar Lote de Archivos]', errorEliminacionLote);
    return respuesta.status(500).json({ error: errorEliminacionLote.message });
  }
});

// 6. DELETE /storage/v1/object/:bucket/* (Eliminar un archivo individual por ruta)
enrutador.delete('/object/:bucket/*', requerirAutenticacion, async (solicitud, respuesta) => {
  try {
    const nombreContenedor = solicitud.params.bucket;
    const rutaRelativa = sanearRutaRelativa(solicitud.params[0] || '');
    const rutaFisicaResuelta = resolverArchivoEnContenedor(nombreContenedor, rutaRelativa);

    if (rutaFisicaResuelta && fs.existsSync(rutaFisicaResuelta)) {
      fs.unlinkSync(rutaFisicaResuelta);
    }

    await poolConexion.query(
      `DELETE FROM storage.objects WHERE bucket_id = $1 AND name = $2`,
      [nombreContenedor, rutaRelativa]
    );

    return respuesta.status(200).json({ message: 'Archivo eliminado', name: rutaRelativa });
  } catch (errorEliminacionIndividual) {
    console.error('[Error al Eliminar Archivo Individual]', errorEliminacionIndividual);
    return respuesta.status(500).json({ error: errorEliminacionIndividual.message });
  }
});

// 7. GET /storage/v1/object/:bucket/* (Descarga directa autenticada)
enrutador.get(['/object/public/:bucket/*', '/object/:bucket/*'], requerirAutenticacion, (solicitud, respuesta) => {
  const nombreContenedor = solicitud.params.bucket;
  const rutaArchivo = sanearRutaRelativa(solicitud.params[0] || '');
  const rutaFisicaResuelta = resolverArchivoEnContenedor(nombreContenedor, rutaArchivo);

  if (!rutaFisicaResuelta) {
    return respuesta.status(404).json({ error: 'Archivo no encontrado' });
  }

  return respuesta.sendFile(rutaFisicaResuelta);
});

export default enrutador;
