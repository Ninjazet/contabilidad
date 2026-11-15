/**
 * ============================================================================
 * UTILIDADES DE FECHAS Y ZONA HORARIA (AMERICA/TEGUCIGALPA)
 * ============================================================================
 */

export const ZONA_HORARIA = "America/Tegucigalpa"

function convertirAObjetoFecha(fechaEntrada: Date | string): Date {
  if (fechaEntrada instanceof Date) return fechaEntrada
  const textoLimpio = fechaEntrada.trim()
  // Evita desfase de -1 día cuando se formatea una fecha YYYY-MM-DD en zona America/Tegucigalpa (UTC-6)
  if (/^\d{4}-\d{2}-\d{2}$/.test(textoLimpio)) {
    const [anio, mes, dia] = textoLimpio.split("-").map(Number)
    return new Date(Date.UTC(anio, mes - 1, dia, 12, 0, 0))
  }
  return new Date(textoLimpio)
}

export function aFechaIso(fecha: string | null | undefined): string {
  if (!fecha) return ""
  return String(fecha).slice(0, 10)
}

export function fechaHoyIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

export function sumarDiasIso(cantidadDias: number): string {
  const fechaDestino = new Date(Date.now() + cantidadDias * 86400000)
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fechaDestino)
}

export function formatearFecha(fecha: Date | string): string {
  const objetoFecha = convertirAObjetoFecha(fecha)
  if (Number.isNaN(objetoFecha.getTime())) return String(fecha)
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: ZONA_HORARIA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(objetoFecha)
}

export function formatearFechaLarga(fecha: Date | string): string {
  const objetoFecha = convertirAObjetoFecha(fecha)
  if (Number.isNaN(objetoFecha.getTime())) return String(fecha)
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: ZONA_HORARIA,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(objetoFecha)
}

export function formatearFechaHora(marcaTiempo: string): string {
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: ZONA_HORARIA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(marcaTiempo))
}

export function obtenerInicialesNombre(nombreCompleto: string): string {
  return nombreCompleto
    .split(" ")
    .filter(Boolean)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function formatearLempiras(monto: number): string {
  return (
    "L " +
    Number(monto || 0).toLocaleString("es-HN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

// Alias de compatibilidad
export const TIME_ZONE = ZONA_HORARIA
export const toIsoDate = aFechaIso
export const todayIso = fechaHoyIso
export const addDaysIso = sumarDiasIso
export const formatDate = formatearFecha
export const formatDateLong = formatearFechaLarga

