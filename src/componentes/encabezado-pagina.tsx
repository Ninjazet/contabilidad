import type { ReactNode } from "react"
import { PanelAyudaModulo } from "@/componentes/ayuda-modulo"
import type { ElementoAyudaModulo } from "@/utilidades/datos-ayuda"

export type PropiedadesEncabezadoPagina = {
  /** Título principal de la página */
  titulo?: string
  /** Descripción o subtítulo de la página */
  descripcion?: string
  /** Botones o controles de acción a la derecha */
  acciones?: ReactNode
  /** Datos de ayuda contextual personalizados */
  ayudaPersonalizada?: ElementoAyudaModulo
  /** Ocultar el botón de ayuda F1 */
  ocultarAyuda?: boolean
  /** Alias de compatibilidad */
  title?: string
  description?: string
  actions?: ReactNode
  customHelp?: ElementoAyudaModulo
  hideHelp?: boolean
}

export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
  ayudaPersonalizada,
  ocultarAyuda,
  title,
  description,
  actions,
  customHelp,
  hideHelp = false,
}: PropiedadesEncabezadoPagina) {
  const tituloMostrado = titulo ?? title ?? ""
  const descripcionMostrada = descripcion ?? description
  const accionesMostradas = acciones ?? actions
  const ayudaFinal = ayudaPersonalizada ?? customHelp
  const sinAyuda = ocultarAyuda ?? hideHelp

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h2 className="text-2xl font-semibold tracking-tight">
            {tituloMostrado}
          </h2>
          {!sinAyuda && (
            <PanelAyudaModulo
              ayudaPersonalizada={ayudaFinal}
              variante="icon-only"
            />
          )}
        </div>
        {descripcionMostrada && (
          <p className="text-sm text-muted-foreground">{descripcionMostrada}</p>
        )}
      </div>
      {accionesMostradas && (
        <div className="flex items-center gap-2">{accionesMostradas}</div>
      )}
    </div>
  )
}

export const PageHeader = EncabezadoPagina

