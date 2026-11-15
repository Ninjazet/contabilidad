/**
 * ============================================================================
 * DEFINICIONES DE TIPOS DE DATOS EN ESPAÑOL (src/utilidades/tipos.ts)
 * ============================================================================
 */

export type IdRol =
  | "administrador"
  | "gerente_operaciones"
  | "contador"
  | "auxiliar_contable"
  | "asistente_operativo"

export const ETIQUETAS_ROLES: Record<IdRol, string> = {
  administrador: "Administrador",
  gerente_operaciones: "Gerente de Operaciones",
  contador: "Contador",
  auxiliar_contable: "Auxiliar Contable",
  asistente_operativo: "Asistente Operativo",
}

export type PerfilUsuario = {
  id: string
  name: string
  email: string
  role_id: IdRol
  active: boolean
  created_at: string
  updated_at: string
}

export type EstadoCliente = "activo" | "inactivo" | "suspendido"

export type Cliente = {
  id: string
  code: string
  legal_name: string
  commercial_name: string | null
  rtn: string
  client_type: "persona" | "empresa"
  status: EstadoCliente
  responsible_user_id: string | null
  secondary_user_id: string | null
  is_quimistan: boolean
  zero_declaration_status: "si" | "no"
  phone: string | null
  whatsapp: string | null
  email: string | null
  contact_name: string | null
  address: string | null
  department: string | null
  municipality: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export type EstadoExpediente = "borrador" | "en_revision" | "aprobado" | "rechazado"
export type EstadoTareaVencimiento = "pendiente" | "en_proceso" | "completado"
export type EstadoTarea = EstadoTareaVencimiento

export type EstadoInformacionMaestro = "pendiente" | "parcial" | "completa"
export type EstadoInformacionControl = EstadoInformacionMaestro

export type TipoDeclaracionMaestro = "con_pago" | "sin_pago"
export type TipoDeclaracionControl = TipoDeclaracionMaestro

export type EstadoBoletinMaestro = "no_requiere" | "generado" | "enviado_cobro" | "deposito_recibido"
export type EstadoBoletinControl = EstadoBoletinMaestro

export type EstadoPagoMaestro = "pendiente" | "pagado"
export type EstadoPagoControl = EstadoPagoMaestro

export type EstadoTareaInformativa = "pendiente" | "en_proceso" | "listo"
export type EstadoDmc = "pendiente" | "error" | "corregido" | "aprobada" | "archivada"
export type EstadoCobro = "pendiente" | "emitido" | "en_cobro" | "cobrado" | "conciliado"
export type EstadoVisitaQuimistan = "programada" | "notificada" | "realizada" | "completa"
export type TipoTareaContable = "posteo_excel" | "conciliacion" | "caja_chica" | "libros" | "quickbooks"
export type EstadoTareaContable = "pendiente" | "en_proceso" | "completada" | "revisada"

export type AccionAuditoria = "create" | "update" | "delete"

export type RegistroAuditoria = {
  id: string
  actor_id: string | null
  actor_name: string
  actor_role: string | null
  action: AccionAuditoria
  table_name: string
  record_id: string | null
  summary: string
  changed_fields: string[]
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

export type ObligacionFiscalCatalogo = {
  id: string
  name: string
  description: string | null
  day_of_month: number
  active: boolean
  created_at: string
}

export type TipoDocumentoCatalogo = {
  id: string
  name: string
  description: string | null
  active: boolean
  created_at: string
}

export type ServicioCatalogo = {
  id: string
  name: string
  description: string | null
  active: boolean
  created_at: string
}

// Alias de compatibilidad
export type RoleId = IdRol
export const ROLE_LABELS = ETIQUETAS_ROLES
export type Profile = PerfilUsuario
export type ClientStatus = EstadoCliente
export type Client = Cliente
