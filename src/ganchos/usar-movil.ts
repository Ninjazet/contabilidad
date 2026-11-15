import * as React from "react"

const PUNTO_QUIEBRE_MOVIL = 768

export function usarEsMovil() {
  const [esMovil, establecerEsMovil] = React.useState<boolean | undefined>(
    undefined
  )

  React.useEffect(() => {
    const consultaMedia = window.matchMedia(
      `(max-width: ${PUNTO_QUIEBRE_MOVIL - 1}px)`
    )
    const alCambiarTamano = () => {
      establecerEsMovil(window.innerWidth < PUNTO_QUIEBRE_MOVIL)
    }
    consultaMedia.addEventListener("change", alCambiarTamano)
    establecerEsMovil(window.innerWidth < PUNTO_QUIEBRE_MOVIL)
    return () => consultaMedia.removeEventListener("change", alCambiarTamano)
  }, [])

  return !!esMovil
}

export const useIsMobile = usarEsMovil

