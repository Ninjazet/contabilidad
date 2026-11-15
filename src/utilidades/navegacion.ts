/**
 * ============================================================================
 * CONFIGURACIÓN DEL MENÚ DE NAVEGACIÓN LATERAL Y ACCESOS RÁPIDOS
 * ============================================================================
 */
import {
  BellRing,
  Bus,
  Calculator,
  CalendarClock,
  ClipboardList,
  FileStack,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  ScrollText,
  Settings,
  ShieldCheck,
  TableProperties,
  Users,
  Wallet,
} from "lucide-react"

export type ElementoNavegacion = {
  etiqueta: string
  ruta: string
  icono: typeof LayoutDashboard
  // Alias para compatibilidad
  label: string
  path: string
  icon: typeof LayoutDashboard
}

export type SeccionNavegacion = {
  titulo: string
  elementos: ElementoNavegacion[]
  // Alias para compatibilidad
  title: string
  items: ElementoNavegacion[]
}

function crearElemento(
  etiqueta: string,
  ruta: string,
  icono: typeof LayoutDashboard
): ElementoNavegacion {
  return {
    etiqueta,
    ruta,
    icono,
    label: etiqueta,
    path: ruta,
    icon: icono,
  }
}

function crearSeccion(
  titulo: string,
  elementos: ElementoNavegacion[]
): SeccionNavegacion {
  return {
    titulo,
    elementos,
    title: titulo,
    items: elementos,
  }
}

export const SECCIONES_NAVEGACION: SeccionNavegacion[] = [
  crearSeccion("Principal", [
    crearElemento("Panel", "/", LayoutDashboard),
    crearElemento("Clientes", "/clientes", Users),
    crearElemento("Expedientes", "/expedientes", FolderOpen),
    crearElemento("Documentos", "/documentos", FileStack),
  ]),
  crearSeccion("Control", [
    crearElemento("Control Maestro", "/control-maestro", ListChecks),
    crearElemento("Checklist", "/checklist", ClipboardList),
    crearElemento("Informativas", "/informativas", BellRing),
    crearElemento("Checklist DMC", "/dmc", TableProperties),
    crearElemento("Cobros y Caja", "/cobros", Wallet),
    crearElemento("Visitas Quimistán", "/visitas-quimistan", Bus),
    crearElemento("Contabilidad", "/contabilidad", Calculator),
    crearElemento("Calendario", "/calendario", CalendarClock),
    crearElemento("Personal", "/personal", ShieldCheck),
  ]),
  crearSeccion("Administración", [
    crearElemento("Auditoría", "/auditoria", ScrollText),
    crearElemento("Configuración", "/configuracion", Settings),
  ]),
]

export function obtenerElementoNavegacionPorRuta(
  rutaActual: string
): ElementoNavegacion | undefined {
  return SECCIONES_NAVEGACION.flatMap((seccion) => seccion.elementos).find(
    (elemento) => elemento.ruta === rutaActual
  )
}

// Alias de compatibilidad
export type NavItem = ElementoNavegacion
export type NavSection = SeccionNavegacion
export const NAV_SECTIONS = SECCIONES_NAVEGACION
export const getNavItemByPath = obtenerElementoNavegacionPorRuta

