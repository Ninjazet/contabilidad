/**
 * ============================================================================
 * ARCHIVO CENTRAL DE CONFIGURACIÓN Y PARÁMETROS DEL SISTEMA (FÁCIL DE EDITAR)
 * ============================================================================
 * Modifique aquí los nombres, textos, meses, etiquetas de estados, colores,
 * días de vencimiento y plantillas base de ContaGestión.
 */

import type {
  AccionAuditoria,
  EstadoCliente,
  EstadoCobro,
  EstadoDmc,
  EstadoExpediente,
  EstadoInformacionMaestro,
  EstadoBoletinMaestro,
  EstadoPagoMaestro,
  EstadoTareaContable,
  EstadoTareaInformativa,
  EstadoTareaVencimiento,
  EstadoVisitaQuimistan,
  IdRol,
  TipoDeclaracionMaestro,
  TipoTareaContable,
} from "@/utilidades/tipos"

// 1. DATOS GENERALES DE LA FIRMA
export const CONFIGURACION_FIRMA = {
  nombreSistema: "ContaGestión",
  subtituloMenu: "Firma contable",
  versionSistema: "v2.0 — Producción",
  zonaHoraria: "America/Tegucigalpa",
  descripcionZonaHoraria: "America/Tegucigalpa (Honduras)",
  simboloMoneda: "L",
  codigoIdioma: "es-HN",
} as const

export const NOMBRE_DESPACHO = CONFIGURACION_FIRMA.nombreSistema
export const SUBTITULO_DESPACHO = CONFIGURACION_FIRMA.subtituloMenu
export const VERSION_SISTEMA = CONFIGURACION_FIRMA.versionSistema
export const ZONA_HORARIA_HONDURAS = CONFIGURACION_FIRMA.zonaHoraria
export const EXPRESION_REGULAR_RTN = /^\d{14}$/

export const ACCESOS_RAPIDOS_PANEL: { etiqueta: string; ruta: string }[] = [
  { etiqueta: "Clientes", ruta: "/clientes" },
  { etiqueta: "Expedientes", ruta: "/expedientes" },
  { etiqueta: "Documentos", ruta: "/documentos" },
  { etiqueta: "Control Maestro", ruta: "/control-maestro" },
  { etiqueta: "Informativas", ruta: "/informativas" },
  { etiqueta: "Checklist DMC", ruta: "/dmc" },
  { etiqueta: "Cobros y Caja", ruta: "/cobros" },
  { etiqueta: "Visitas Quimistán", ruta: "/visitas-quimistan" },
  { etiqueta: "Contabilidad", ruta: "/contabilidad" },
  { etiqueta: "Calendario", ruta: "/calendario" },
]

// 2. CALENDARIO Y FECHAS
export const MESES_ANIO = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const

export const NOMBRES_MESES = MESES_ANIO

export const DIAS_SEMANA_CORTO = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
] as const

export const DIAS_SEMANA_CORTOS = DIAS_SEMANA_CORTO

// 3. ROLES DEL SISTEMA
export const OPCIONES_ROLES: IdRol[] = [
  "administrador",
  "gerente_operaciones",
  "contador",
  "auxiliar_contable",
  "asistente_operativo",
]

export const ETIQUETAS_ROLES: Record<IdRol, string> = {
  administrador: "Administrador",
  gerente_operaciones: "Gerente de Operaciones",
  contador: "Contador",
  auxiliar_contable: "Auxiliar Contable",
  asistente_operativo: "Asistente Operativo",
}

// 4. ESTADOS DE CLIENTES
export const ETIQUETAS_ESTADO_CLIENTE: Record<EstadoCliente, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  suspendido: "Suspendido",
}

// 5. ESTADOS Y PLANTILLA DE EXPEDIENTES MENSUALES
export const ETIQUETAS_ESTADO_EXPEDIENTE: Record<EstadoExpediente, string> = {
  borrador: "Borrador",
  en_revision: "En revisión",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
}

export const TAREAS_BASE_EXPEDIENTE: string[] = [
  "Recibir documentación del cliente",
  "Registrar ventas y compras",
  "Conciliar bancos",
  "Preparar declaración",
  "Revisión y entrega",
]

export const CHECKLIST_BASE_EXPEDIENTE = TAREAS_BASE_EXPEDIENTE

// 6. ESTADOS DE VENCIMIENTOS Y CHECKLIST GENERAL
export const ETIQUETAS_ESTADO_VENCIMIENTO: Record<EstadoTareaVencimiento, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  completado: "Completado",
}

export const ETIQUETAS_ESTADO_TAREA = ETIQUETAS_ESTADO_VENCIMIENTO

export const COLORES_PUNTO_VENCIMIENTO: Record<EstadoTareaVencimiento, string> = {
  pendiente: "bg-amber-500",
  en_proceso: "bg-blue-500",
  completado: "bg-emerald-500",
}

export const COLOR_PUNTO_ESTADO_TAREA = COLORES_PUNTO_VENCIMIENTO

// 7. CONTROL MAESTRO MENSUAL
export const ETIQUETAS_INFORMACION_MAESTRO: Record<EstadoInformacionMaestro, string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  completa: "Completa",
}

export const ETIQUETAS_ESTADO_INFORMACION = ETIQUETAS_INFORMACION_MAESTRO

export const COLORES_INFORMACION_MAESTRO: Record<EstadoInformacionMaestro, string> = {
  pendiente: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  parcial: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  completa: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
}

export const COLORES_ESTADO_INFORMACION = COLORES_INFORMACION_MAESTRO

export const ETIQUETAS_DECLARACION_MAESTRO: Record<TipoDeclaracionMaestro, string> = {
  con_pago: "Con pago",
  sin_pago: "Sin pago / en cero",
}

export const ETIQUETAS_BOLETIN_MAESTRO: Record<EstadoBoletinMaestro, string> = {
  no_requiere: "No requiere",
  generado: "Generado",
  enviado_cobro: "Enviado a cobro",
  deposito_recibido: "Depósito recibido",
}

export const ETIQUETAS_ESTADO_BOLETIN = ETIQUETAS_BOLETIN_MAESTRO

export const ETIQUETAS_PAGO_MAESTRO: Record<EstadoPagoMaestro, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
}

// 8. OBLIGACIONES INFORMATIVAS (DÍA 10)
export const ETIQUETAS_ESTADO_INFORMATIVA: Record<EstadoTareaInformativa, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  listo: "Listo",
}

// 9. CHECKLIST DMC (DÍA 8 - DOBLE VALIDACIÓN)
export const ETIQUETAS_ESTADO_DMC: Record<EstadoDmc, string> = {
  pendiente: "Pendiente",
  error: "Con error",
  corregido: "Corregido",
  aprobada: "Aprobada",
  archivada: "Archivada",
}

export const PUNTOS_REVISION_DMC = [
  { clave: "rtn_correcto", etiqueta: "RTN correcto" },
  { clave: "cai_correcto", etiqueta: "CAI correcto" },
  { clave: "fecha_valida", etiqueta: "Fecha válida" },
  { clave: "factura_vigente", etiqueta: "Factura vigente" },
  { clave: "monto_correcto", etiqueta: "Monto correcto" },
  { clave: "validacion_sar", etiqueta: "Validación SAR exitosa" },
  { clave: "acuse_archivado", etiqueta: "Acuse archivado" },
] as const

export const PUNTOS_VALIDACION_DMC = PUNTOS_REVISION_DMC

export const CLAVES_FORMATO_DMC = [
  "rtn_correcto",
  "cai_correcto",
  "fecha_valida",
  "factura_vigente",
  "monto_correcto",
] as const

export const CLAVE_SAR_DMC = "validacion_sar" as const

// 10. COBROS Y CUADRE DE CAJA
export const ETIQUETAS_ESTADO_COBRO: Record<EstadoCobro, string> = {
  pendiente: "Pendiente",
  emitido: "Recibo emitido",
  en_cobro: "En cobro",
  cobrado: "Cobrado",
  conciliado: "Conciliado",
}

// 11. VISITAS QUIMISTÁN (DÍAS 3-6)
export const ETIQUETAS_ESTADO_VISITA: Record<EstadoVisitaQuimistan, string> = {
  programada: "Programada",
  notificada: "Notificada",
  realizada: "Realizada",
  completa: "Completa",
}

export const DIA_VISITA_QUIMISTAN = 5
export const DIA_DESLINDE_QUIMISTAN = 6

// 12. CONTABILIDAD POST-DÍA 10 (MARÍA)
export const ETIQUETAS_ESTADO_CONTABLE: Record<EstadoTareaContable, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  completada: "Completada",
  revisada: "Revisada",
}

export const ETIQUETAS_ESTADO_CONTABILIDAD = ETIQUETAS_ESTADO_CONTABLE

export const ETIQUETAS_TIPO_TAREA_CONTABLE: Record<TipoTareaContable, string> = {
  posteo_excel: "Posteo Excel",
  conciliacion: "Conciliación",
  caja_chica: "Caja chica",
  libros: "Libros legales",
  quickbooks: "QuickBooks",
}

export const PLANTILLA_TAREAS_CONTABLES: {
  task_type: TipoTareaContable
  target_name: string
}[] = [
  { task_type: "posteo_excel", target_name: "Gastos del Excel al sistema" },
  { task_type: "conciliacion", target_name: "Cuenta BAC" },
  { task_type: "conciliacion", target_name: "Cuenta FICOHSA" },
  { task_type: "conciliacion", target_name: "Cuenta Atlántida" },
  { task_type: "caja_chica", target_name: "Cuadre de caja chica" },
  { task_type: "libros", target_name: "Libro de compras" },
  { task_type: "libros", target_name: "Libro de ventas" },
  { task_type: "libros", target_name: "Libro diario y mayor" },
  { task_type: "quickbooks", target_name: "Registro en QuickBooks" },
]

export const PLANTILLA_CONTABILIDAD_POST_DIA_10 = PLANTILLA_TAREAS_CONTABLES

// 13. AUDITORÍA FORENSE
export const ETIQUETAS_TABLAS_AUDITORIA: Record<string, string> = {
  clients: "Cliente",
  client_services: "Servicio por cliente",
  files: "Expediente",
  file_documents: "Documento",
  file_checklist_items: "Tarea de expediente",
  deadline_tasks: "Vencimiento",
  monthly_master_control: "Control Maestro",
  informative_tasks: "Informativas",
  dmc_checks: "Checklist DMC",
  collections: "Cobros y Caja",
  quimistan_visits: "Visitas Quimistán",
  accounting_tasks: "Contabilidad",
  profiles: "Personal",
}

export const ETIQUETAS_ACCIONES_AUDITORIA: Record<AccionAuditoria, string> = {
  create: "Creación",
  update: "Actualización",
  delete: "Eliminación",
}

export const ETIQUETAS_ACCION_AUDITORIA = ETIQUETAS_ACCIONES_AUDITORIA
