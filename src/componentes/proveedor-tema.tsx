/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

export type ModoTema = "dark" | "light" | "system"
type TemaResuelto = "dark" | "light"

export type PropiedadesProveedorTema = {
  children: React.ReactNode
  temaPredeterminado?: ModoTema
  claveAlmacenamiento?: string
  desactivarTransicionAlCambiar?: boolean
  defaultTheme?: ModoTema
  storageKey?: string
  disableTransitionOnChange?: boolean
}

export type EstadoProveedorTema = {
  tema: ModoTema
  establecerTema: (nuevoTema: ModoTema) => void
  theme: ModoTema
  setTheme: (nuevoTema: ModoTema) => void
}

const CONSULTA_ESQUEMA_COLOR = "(prefers-color-scheme: dark)"
const VALORES_TEMA: ModoTema[] = ["dark", "light", "system"]

const ContextoProveedorTema = React.createContext<
  EstadoProveedorTema | undefined
>(undefined)

function esTemaValido(valor: string | null): valor is ModoTema {
  if (valor === null) {
    return false
  }
  return VALORES_TEMA.includes(valor as ModoTema)
}

function obtenerTemaDelSistema(): TemaResuelto {
  if (window.matchMedia(CONSULTA_ESQUEMA_COLOR).matches) {
    return "dark"
  }
  return "light"
}

function desactivarTransicionesTemporalmente() {
  const etiquetaEstilo = document.createElement("style")
  etiquetaEstilo.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;transition:none!important}"
    )
  )
  document.head.appendChild(etiquetaEstilo)

  return () => {
    window.getComputedStyle(document.body)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        etiquetaEstilo.remove()
      })
    })
  }
}

function esElementoEditable(elementoObjetivo: EventTarget | null) {
  if (!(elementoObjetivo instanceof HTMLElement)) {
    return false
  }
  if (elementoObjetivo.isContentEditable) {
    return true
  }
  const contenedorEditable = elementoObjetivo.closest(
    "input, textarea, select, [contenteditable='true']"
  )
  return Boolean(contenedorEditable)
}

export function ProveedorTema({
  children,
  temaPredeterminado,
  claveAlmacenamiento,
  desactivarTransicionAlCambiar,
  defaultTheme = "system",
  storageKey = "theme",
  disableTransitionOnChange = true,
  ...propiedadesAdicionales
}: PropiedadesProveedorTema) {
  const temaInicial = temaPredeterminado ?? defaultTheme
  const claveStorage = claveAlmacenamiento ?? storageKey
  const sinTransicion =
    desactivarTransicionAlCambiar ?? disableTransitionOnChange

  const [tema, actualizarEstadoTema] = React.useState<ModoTema>(() => {
    const temaGuardado = localStorage.getItem(claveStorage)
    if (esTemaValido(temaGuardado)) {
      return temaGuardado
    }
    return temaInicial
  })

  const establecerTema = React.useCallback(
    (siguienteTema: ModoTema) => {
      localStorage.setItem(claveStorage, siguienteTema)
      actualizarEstadoTema(siguienteTema)
    },
    [claveStorage]
  )

  const aplicarTemaAlDocumento = React.useCallback(
    (siguienteTema: ModoTema) => {
      const raizDocumento = document.documentElement
      const temaFinal =
        siguienteTema === "system" ? obtenerTemaDelSistema() : siguienteTema
      const restaurarTransiciones = sinTransicion
        ? desactivarTransicionesTemporalmente()
        : null

      raizDocumento.classList.remove("light", "dark")
      raizDocumento.classList.add(temaFinal)

      if (restaurarTransiciones) {
        restaurarTransiciones()
      }
    },
    [sinTransicion]
  )

  React.useEffect(() => {
    aplicarTemaAlDocumento(tema)

    if (tema !== "system") {
      return undefined
    }

    const consultaMedia = window.matchMedia(CONSULTA_ESQUEMA_COLOR)
    const manejarCambioSistema = () => {
      aplicarTemaAlDocumento("system")
    }

    consultaMedia.addEventListener("change", manejarCambioSistema)
    return () => {
      consultaMedia.removeEventListener("change", manejarCambioSistema)
    }
  }, [tema, aplicarTemaAlDocumento])

  React.useEffect(() => {
    const manejarTeclaPresionada = (evento: KeyboardEvent) => {
      if (evento.repeat) return
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return
      if (esElementoEditable(evento.target)) return
      if (evento.key.toLowerCase() !== "d") return

      actualizarEstadoTema((temaActual) => {
        const siguienteTema =
          temaActual === "dark"
            ? "light"
            : temaActual === "light"
              ? "dark"
              : obtenerTemaDelSistema() === "dark"
                ? "light"
                : "dark"

        localStorage.setItem(claveStorage, siguienteTema)
        return siguienteTema
      })
    }

    window.addEventListener("keydown", manejarTeclaPresionada)
    return () => {
      window.removeEventListener("keydown", manejarTeclaPresionada)
    }
  }, [claveStorage])

  React.useEffect(() => {
    const manejarCambioAlmacenamiento = (evento: StorageEvent) => {
      if (evento.storageArea !== localStorage) return
      if (evento.key !== claveStorage) return

      if (esTemaValido(evento.newValue)) {
        actualizarEstadoTema(evento.newValue)
        return
      }
      actualizarEstadoTema(temaInicial)
    }

    window.addEventListener("storage", manejarCambioAlmacenamiento)
    return () => {
      window.removeEventListener("storage", manejarCambioAlmacenamiento)
    }
  }, [temaInicial, claveStorage])

  const valorContexto = React.useMemo<EstadoProveedorTema>(
    () => ({
      tema,
      establecerTema,
      theme: tema,
      setTheme: establecerTema,
    }),
    [tema, establecerTema]
  )

  return (
    <ContextoProveedorTema.Provider
      {...propiedadesAdicionales}
      value={valorContexto}
    >
      {children}
    </ContextoProveedorTema.Provider>
  )
}

export const usarTema = () => {
  const contexto = React.useContext(ContextoProveedorTema)
  if (contexto === undefined) {
    throw new Error("usarTema debe utilizarse dentro de un ProveedorTema")
  }
  return contexto
}

export const ThemeProvider = ProveedorTema
export const useTheme = usarTema

