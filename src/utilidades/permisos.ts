/**
 * ============================================================================
 * CONTROL DE PERMISOS Y ACCESO A RUTAS POR ROL
 * ============================================================================
 */
import type { IdRol } from "@/utilidades/tipos"

const RUTAS_PERSONAL_CONTABLE = [
  "/",
  "/clientes",
  "/expedientes",
  "/documentos",
  "/checklist",
  "/control-maestro",
  "/informativas",
  "/dmc",
  "/cobros",
  "/visitas-quimistan",
  "/contabilidad",
  "/calendario",
]

export const ACCESOS_POR_ROL: Record<IdRol, string[]> = {
  administrador: [
    ...RUTAS_PERSONAL_CONTABLE,
    "/personal",
    "/auditoria",
    "/configuracion",
  ],
  gerente_operaciones: [
    ...RUTAS_PERSONAL_CONTABLE,
    "/personal",
    "/auditoria",
  ],
  contador: RUTAS_PERSONAL_CONTABLE,
  auxiliar_contable: RUTAS_PERSONAL_CONTABLE,
  asistente_operativo: ["/", "/calendario", "/visitas-quimistan", "/cobros"],
}

export function puedeAccederRol(rolUsuario: IdRol, rutaActual: string): boolean {
  const rutasPermitidas = ACCESOS_POR_ROL[rolUsuario] ?? []
  return rutasPermitidas.some(
    (rutaBase) => rutaActual === rutaBase || rutaActual.startsWith(rutaBase + "/")
  )
}

// Alias de compatibilidad
export const canAccessRole = puedeAccederRol

