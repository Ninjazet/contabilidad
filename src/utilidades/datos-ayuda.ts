import {
  MODULES_HELP,
  getHelpForRoute,
  type ModuleHelpItem,
} from "@/lib/module-help-data"

export type ElementoAyudaModulo = ModuleHelpItem

export const DATOS_AYUDA_MODULOS: Record<string, ElementoAyudaModulo> = MODULES_HELP

export function obtenerAyudaPorRuta(rutaActual: string): ElementoAyudaModulo {
  return getHelpForRoute(rutaActual)
}

export { MODULES_HELP, getHelpForRoute, type ModuleHelpItem }

