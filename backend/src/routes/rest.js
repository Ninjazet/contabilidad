/**
 * ============================================================================
 * EMULADOR POSTGREST / SUPABASE REST API (routes/rest.js)
 * ============================================================================
 * Traduce las peticiones REST del cliente `@supabase/supabase-js` a consultas
 * SQL parametrizadas seguras ejecutadas bajo el rol del usuario autenticado.
 * ============================================================================
 */

import { Router } from 'express';
import { consultarComoUsuario } from '../db.js';
import { requerirAutenticacion } from '../middleware/auth.js';

const enrutador = Router();

// Exigir sesión autenticada válida en todas las operaciones REST
enrutador.use(requerirAutenticacion);

function validarIdentificadorSeguro(identificador) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identificador)) {
    throw new Error(`Identificador no válido o inseguro: ${identificador}`);
  }
  return `"${identificador}"`;
}

function construirClausulaSelect(seleccionCruda) {
  if (!seleccionCruda) return '*';
  const cadenaSeleccion = String(seleccionCruda).trim();
  if (!cadenaSeleccion || cadenaSeleccion === '*') return '*';

  const partesSeleccion = cadenaSeleccion.split(',').map((segmento) => segmento.trim()).filter(Boolean);
  if (partesSeleccion.length === 0) return '*';

  // Si todas las partes son nombres simples de columna, proyectarlas de forma segura;
  // si incluye '*' o relaciones anidadas de PostgREST, devolver '*' para no romper la consulta.
  const todasSonColumnasSimples = partesSeleccion.every((parte) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(parte));
  if (!todasSonColumnasSimples) {
    return '*';
  }
  return partesSeleccion.map(validarIdentificadorSeguro).join(', ');
}

function analizarCondicionFiltro(nombreColumna, valorCrudo, obtenerSiguienteIndice, listaParametros) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(nombreColumna)) return null;
  const columnaSegura = validarIdentificadorSeguro(nombreColumna);
  const valorTexto = String(valorCrudo).trim();

  if (valorTexto.startsWith('eq.')) {
    listaParametros.push(valorTexto.slice(3));
    return `${columnaSegura} = $${obtenerSiguienteIndice()}`;
  } else if (valorTexto.startsWith('neq.')) {
    listaParametros.push(valorTexto.slice(4));
    return `${columnaSegura} != $${obtenerSiguienteIndice()}`;
  } else if (valorTexto.startsWith('gt.')) {
    listaParametros.push(valorTexto.slice(3));
    return `${columnaSegura} > $${obtenerSiguienteIndice()}`;
  } else if (valorTexto.startsWith('gte.')) {
    listaParametros.push(valorTexto.slice(4));
    return `${columnaSegura} >= $${obtenerSiguienteIndice()}`;
  } else if (valorTexto.startsWith('lt.')) {
    listaParametros.push(valorTexto.slice(3));
    return `${columnaSegura} < $${obtenerSiguienteIndice()}`;
  } else if (valorTexto.startsWith('lte.')) {
    listaParametros.push(valorTexto.slice(4));
    return `${columnaSegura} <= $${obtenerSiguienteIndice()}`;
  } else if (valorTexto.startsWith('like.')) {
    listaParametros.push(valorTexto.slice(5));
    return `${columnaSegura} LIKE $${obtenerSiguienteIndice()}`;
  } else if (valorTexto.startsWith('ilike.')) {
    listaParametros.push(valorTexto.slice(6));
    return `${columnaSegura} ILIKE $${obtenerSiguienteIndice()}`;
  } else if (valorTexto === 'is.null') {
    return `${columnaSegura} IS NULL`;
  } else if (valorTexto === 'is.not.null') {
    return `${columnaSegura} IS NOT NULL`;
  } else if (valorTexto === 'is.true') {
    return `${columnaSegura} IS TRUE`;
  } else if (valorTexto === 'is.false') {
    return `${columnaSegura} IS FALSE`;
  } else if (valorTexto.startsWith('in.(') && valorTexto.endsWith(')')) {
    const elementosLista = valorTexto
      .slice(4, -1)
      .split(',')
      .map((elemento) => elemento.trim().replace(/^['"]|['"]$/g, ''));
    listaParametros.push(elementosLista);
    return `${columnaSegura} = ANY($${obtenerSiguienteIndice()})`;
  } else {
    listaParametros.push(valorTexto);
    return `${columnaSegura} = $${obtenerSiguienteIndice()}`;
  }
}

function analizarFiltrosConsulta(parametrosUrl, indiceInicial = 1) {
  const clausulasWhere = [];
  const listaParametros = [];
  let indiceParametro = indiceInicial;
  const siguienteIndice = () => indiceParametro++;

  for (const [claveParametro, valorCrudo] of Object.entries(parametrosUrl)) {
    const claveMinuscula = claveParametro.toLowerCase();
    if (['select', 'order', 'limit', 'offset', 'apikey', 'on_conflict', 'onconflict', 'columns'].includes(claveMinuscula)) {
      continue;
    }

    // Filtro OR: or=(col1.ilike.%q%,col2.ilike.%q%)
    if (claveMinuscula === 'or') {
      let cadenaOr = String(valorCrudo).trim();
      if (cadenaOr.startsWith('(') && cadenaOr.endsWith(')')) {
        cadenaOr = cadenaOr.slice(1, -1);
      }
      const partesOr = cadenaOr.split(',');
      const subClausulasOr = [];
      for (const parte of partesOr) {
        const primerPunto = parte.indexOf('.');
        if (primerPunto === -1) continue;
        const nombreColumna = parte.slice(0, primerPunto).trim();
        const condicion = parte.slice(primerPunto + 1).trim();
        const condicionSql = analizarCondicionFiltro(nombreColumna, condicion, siguienteIndice, listaParametros);
        if (condicionSql) subClausulasOr.push(condicionSql);
      }
      if (subClausulasOr.length > 0) {
        clausulasWhere.push(`(${subClausulasOr.join(' OR ')})`);
      }
      continue;
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(claveParametro)) continue;

    const nombreColumna = claveParametro.includes('.') ? claveParametro.split('.').pop() : claveParametro;
    const condicionSql = analizarCondicionFiltro(nombreColumna, valorCrudo, siguienteIndice, listaParametros);
    if (condicionSql) {
      clausulasWhere.push(condicionSql);
    }
  }

  const sqlWhere = clausulasWhere.length > 0 ? `WHERE ${clausulasWhere.join(' AND ')}` : '';
  return { sqlWhere, listaParametros, siguienteIndice: indiceParametro };
}

function solicitaObjetoUnico(solicitud) {
  const encabezadoAccept = solicitud.headers.accept || '';
  return encabezadoAccept.includes('application/vnd.pgrst.object+json');
}

// GET / HEAD /rest/v1/:table
const procesarConsultaGet = async (solicitud, respuesta) => {
  try {
    const nombreTabla = validarIdentificadorSeguro(solicitud.params.table);
    const clausulaSelect = construirClausulaSelect(solicitud.query.select);
    const { sqlWhere, listaParametros } = analizarFiltrosConsulta(solicitud.query);

    const esPeticionHead = solicitud.method === 'HEAD';
    const encabezadoPrefer = solicitud.headers.prefer || '';
    const solicitaConteoTotal = esPeticionHead || encabezadoPrefer.includes('count=');

    let conteoTotal = 0;
    if (solicitaConteoTotal) {
      const sqlConteo = `SELECT count(*)::int AS total FROM ${nombreTabla} ${sqlWhere}`;
      const idUsuario = solicitud.user?.id || null;
      const rolUsuario = solicitud.user?.role || 'authenticated';
      const resultadoConteo = await consultarComoUsuario(idUsuario, rolUsuario, sqlConteo, listaParametros);
      conteoTotal = parseInt(resultadoConteo.rows[0]?.total ?? 0, 10);

      respuesta.setHeader('Range-Unit', 'items');
    }

    if (esPeticionHead) {
      respuesta.setHeader('Content-Range', conteoTotal > 0 ? `0-${conteoTotal - 1}/${conteoTotal}` : `*/0`);
      return respuesta.status(200).end();
    }

    let consultaSql = `SELECT ${clausulaSelect} FROM ${nombreTabla} ${sqlWhere}`;

    if (solicitud.query.order) {
      const partesOrden = String(solicitud.query.order).split(',').map((segmentoOrden) => {
        const [columna, direccionCruda] = segmentoOrden.split('.');
        const columnaSegura = validarIdentificadorSeguro(columna);
        const direccionOrden = direccionCruda && direccionCruda.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        return `${columnaSegura} ${direccionOrden}`;
      });
      consultaSql += ` ORDER BY ${partesOrden.join(', ')}`;
    }

    if (solicitud.query.limit) {
      const valorLimite = parseInt(solicitud.query.limit, 10);
      if (!isNaN(valorLimite)) consultaSql += ` LIMIT ${valorLimite}`;
    }
    if (solicitud.query.offset) {
      const valorDesplazamiento = parseInt(solicitud.query.offset, 10);
      if (!isNaN(valorDesplazamiento)) consultaSql += ` OFFSET ${valorDesplazamiento}`;
    }

    const idUsuario = solicitud.user?.id || null;
    const rolUsuario = solicitud.user?.role || 'authenticated';
    const resultadoConsulta = await consultarComoUsuario(idUsuario, rolUsuario, consultaSql, listaParametros);

    if (solicitaConteoTotal) {
      const desplazamiento = parseInt(solicitud.query.offset, 10) || 0;
      const cantidadFilas = resultadoConsulta.rows.length;
      const indiceDesde = desplazamiento;
      const indiceHasta = cantidadFilas > 0 ? desplazamiento + cantidadFilas - 1 : desplazamiento;
      respuesta.setHeader('Content-Range', conteoTotal > 0 ? `${indiceDesde}-${indiceHasta}/${conteoTotal}` : `*/0`);
    }

    if (solicitaObjetoUnico(solicitud)) {
      if (resultadoConsulta.rows.length === 0) {
        return respuesta.status(200).json(null);
      }
      return respuesta.json(resultadoConsulta.rows[0]);
    }

    return respuesta.json(resultadoConsulta.rows);
  } catch (errorConsulta) {
    console.error(`[Error en REST GET/HEAD /${solicitud.params.table}]`, errorConsulta.message);
    return respuesta.status(400).json({ error: errorConsulta.message, code: errorConsulta.code });
  }
};

enrutador.get('/:table', procesarConsultaGet);
enrutador.head('/:table', procesarConsultaGet);

// POST /rest/v1/:table (INSERT / UPSERT)
enrutador.post('/:table', async (solicitud, respuesta) => {
  try {
    const nombreTabla = validarIdentificadorSeguro(solicitud.params.table);
    const cuerpoPeticion = solicitud.body;
    const listaRegistros = Array.isArray(cuerpoPeticion) ? cuerpoPeticion : [cuerpoPeticion];

    if (listaRegistros.length === 0) {
      return respuesta.status(400).json({ error: 'El cuerpo de la petición está vacío' });
    }

    // Unión de todas las columnas presentes en cualquiera de los registros del lote
    const listaColumnas = Array.from(
      new Set(listaRegistros.flatMap((registro) => (registro && typeof registro === 'object' ? Object.keys(registro) : [])))
    );

    if (listaColumnas.length === 0) {
      return respuesta.status(400).json({ error: 'No se especificaron columnas para insertar' });
    }

    const columnasSegurasSql = listaColumnas.map(validarIdentificadorSeguro).join(', ');

    const clausulasValores = [];
    const listaParametros = [];
    let indiceParametro = 1;

    for (const registro of listaRegistros) {
      const variablesFila = [];
      for (const nombreColumna of listaColumnas) {
        if (registro[nombreColumna] === undefined) {
          variablesFila.push('DEFAULT');
        } else {
          variablesFila.push(`$${indiceParametro++}`);
          listaParametros.push(registro[nombreColumna]);
        }
      }
      clausulasValores.push(`(${variablesFila.join(', ')})`);
    }

    // Soporte para UPSERT con on_conflict
    const parametroConflicto = solicitud.query.on_conflict || solicitud.query.onConflict;
    let sqlEnConflicto = '';
    if (parametroConflicto) {
      const columnasConflicto = String(parametroConflicto)
        .split(',')
        .map((columna) => validarIdentificadorSeguro(columna.trim()))
        .join(', ');
      const encabezadoPrefer = solicitud.headers.prefer || '';
      if (encabezadoPrefer.includes('resolution=ignore-duplicates')) {
        sqlEnConflicto = ` ON CONFLICT (${columnasConflicto}) DO NOTHING`;
      } else {
        const conjuntoConflicto = new Set(String(parametroConflicto).split(',').map((columna) => columna.trim()));
        const columnasActualizar = listaColumnas.filter((columna) => !conjuntoConflicto.has(columna));
        if (columnasActualizar.length > 0) {
          const asignacionesActualizacion = columnasActualizar
            .map((columna) => `${validarIdentificadorSeguro(columna)} = EXCLUDED.${validarIdentificadorSeguro(columna)}`)
            .join(', ');
          sqlEnConflicto = ` ON CONFLICT (${columnasConflicto}) DO UPDATE SET ${asignacionesActualizacion}`;
        } else {
          sqlEnConflicto = ` ON CONFLICT (${columnasConflicto}) DO NOTHING`;
        }
      }
    }

    const clausulaSelect = construirClausulaSelect(solicitud.query.select);
    const consultaSql = `INSERT INTO ${nombreTabla} (${columnasSegurasSql}) VALUES ${clausulasValores.join(', ')}${sqlEnConflicto} RETURNING ${clausulaSelect}`;
    const idUsuario = solicitud.user?.id || null;
    const rolUsuario = solicitud.user?.role || 'authenticated';
    const resultadoInsercion = await consultarComoUsuario(idUsuario, rolUsuario, consultaSql, listaParametros);

    if (!Array.isArray(cuerpoPeticion) || solicitaObjetoUnico(solicitud)) {
      return respuesta.status(201).json(resultadoInsercion.rows[0] || null);
    }
    return respuesta.status(201).json(resultadoInsercion.rows);
  } catch (errorInsercion) {
    console.error(`[Error en REST POST /${solicitud.params.table}]`, errorInsercion.message);
    return respuesta.status(400).json({ error: errorInsercion.message, code: errorInsercion.code });
  }
});

// PATCH /rest/v1/:table (UPDATE)
enrutador.patch('/:table', async (solicitud, respuesta) => {
  try {
    const nombreTabla = validarIdentificadorSeguro(solicitud.params.table);
    const cuerpoPeticion = solicitud.body;
    const clavesActualizar = Object.keys(cuerpoPeticion || {}).filter((clave) => cuerpoPeticion[clave] !== undefined);

    if (clavesActualizar.length === 0) {
      return respuesta.status(400).json({ error: 'Nada para actualizar' });
    }

    const clausulasSet = [];
    const listaParametros = [];
    let indiceParametro = 1;

    for (const clave of clavesActualizar) {
      clausulasSet.push(`${validarIdentificadorSeguro(clave)} = $${indiceParametro++}`);
      listaParametros.push(cuerpoPeticion[clave]);
    }

    const { sqlWhere, listaParametros: parametrosWhere } = analizarFiltrosConsulta(solicitud.query, indiceParametro);
    listaParametros.push(...parametrosWhere);

    const clausulaSelect = construirClausulaSelect(solicitud.query.select);
    const consultaSql = `UPDATE ${nombreTabla} SET ${clausulasSet.join(', ')} ${sqlWhere} RETURNING ${clausulaSelect}`;
    const idUsuario = solicitud.user?.id || null;
    const rolUsuario = solicitud.user?.role || 'authenticated';
    const resultadoActualizacion = await consultarComoUsuario(idUsuario, rolUsuario, consultaSql, listaParametros);

    if (solicitaObjetoUnico(solicitud)) {
      return respuesta.json(resultadoActualizacion.rows[0] || null);
    }

    return respuesta.json(resultadoActualizacion.rows);
  } catch (errorActualizacion) {
    console.error(`[Error en REST PATCH /${solicitud.params.table}]`, errorActualizacion.message);
    return respuesta.status(400).json({ error: errorActualizacion.message, code: errorActualizacion.code });
  }
});

// DELETE /rest/v1/:table (DELETE)
enrutador.delete('/:table', async (solicitud, respuesta) => {
  try {
    const nombreTabla = validarIdentificadorSeguro(solicitud.params.table);
    const { sqlWhere, listaParametros } = analizarFiltrosConsulta(solicitud.query);

    if (!sqlWhere) {
      return respuesta.status(400).json({ error: 'Se requiere al menos un filtro WHERE para eliminar' });
    }

    const clausulaSelect = construirClausulaSelect(solicitud.query.select);
    const consultaSql = `DELETE FROM ${nombreTabla} ${sqlWhere} RETURNING ${clausulaSelect}`;
    const idUsuario = solicitud.user?.id || null;
    const rolUsuario = solicitud.user?.role || 'authenticated';
    const resultadoEliminacion = await consultarComoUsuario(idUsuario, rolUsuario, consultaSql, listaParametros);

    if (solicitaObjetoUnico(solicitud)) {
      return respuesta.json(resultadoEliminacion.rows[0] || null);
    }

    return respuesta.json(resultadoEliminacion.rows);
  } catch (errorEliminacion) {
    console.error(`[Error en REST DELETE /${solicitud.params.table}]`, errorEliminacion.message);
    return respuesta.status(400).json({ error: errorEliminacion.message, code: errorEliminacion.code });
  }
});

// POST /rest/v1/rpc/:func
enrutador.post('/rpc/:func', async (solicitud, respuesta) => {
  try {
    const nombreFuncion = validarIdentificadorSeguro(solicitud.params.func);
    const argumentosCuerpo = solicitud.body || {};
    const nombresArgumentos = Object.keys(argumentosCuerpo);

    let consultaSql = '';
    const listaParametros = [];

    if (nombresArgumentos.length === 0) {
      consultaSql = `SELECT * FROM ${nombreFuncion}()`;
    } else {
      const clausulasArgumentos = nombresArgumentos.map((nombreArg, indice) => {
        listaParametros.push(argumentosCuerpo[nombreArg]);
        return `${validarIdentificadorSeguro(nombreArg)} := $${indice + 1}`;
      });
      consultaSql = `SELECT * FROM ${nombreFuncion}(${clausulasArgumentos.join(', ')})`;
    }

    const idUsuario = solicitud.user?.id || null;
    const rolUsuario = solicitud.user?.role || 'authenticated';
    const resultadoRpc = await consultarComoUsuario(idUsuario, rolUsuario, consultaSql, listaParametros);

    if (resultadoRpc.rows.length === 1 && Object.keys(resultadoRpc.rows[0]).length === 1) {
      const unicaClave = Object.keys(resultadoRpc.rows[0])[0];
      if (unicaClave.toLowerCase() === solicitud.params.func.toLowerCase()) {
        return respuesta.json(resultadoRpc.rows[0][unicaClave]);
      }
    }

    if (solicitaObjetoUnico(solicitud)) {
      return respuesta.json(resultadoRpc.rows[0] || null);
    }

    return respuesta.json(resultadoRpc.rows);
  } catch (errorRpc) {
    console.error(`[Error en REST RPC /${solicitud.params.func}]`, errorRpc.message);
    return respuesta.status(400).json({ error: errorRpc.message, code: errorRpc.code });
  }
});

export default enrutador;
