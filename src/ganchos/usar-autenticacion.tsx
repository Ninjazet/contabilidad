import * as React from "react"
import type { Session } from "@supabase/supabase-js"

import { baseDeDatos } from "@/utilidades/cliente-supabase"
import type { PerfilUsuario } from "@/utilidades/tipos"

export type ValorContextoAutenticacion = {
  /** Sesión activa (español) */
  sesion: Session | null
  /** Perfil del colaborador autenticado (español) */
  perfil: PerfilUsuario | null
  /** Estado de carga inicial (español) */
  cargando: boolean
  /** Función para cerrar la sesión (español) */
  cerrarSesion: () => Promise<void>
  /** Alias de compatibilidad */
  session: Session | null
  profile: PerfilUsuario | null
  loading: boolean
  signOut: () => Promise<void>
}

const ContextoAutenticacion = React.createContext<
  ValorContextoAutenticacion | undefined
>(undefined)

export function ProveedorAutenticacion({
  children,
}: {
  children: React.ReactNode
}) {
  const [sesion, establecerSesion] = React.useState<Session | null>(null)
  const [perfil, establecerPerfil] = React.useState<PerfilUsuario | null>(null)
  const [cargando, establecerCargando] = React.useState(true)

  const cargarPerfilUsuario = React.useCallback(async (idUsuario: string) => {
    const { data: datosPerfil, error } = await baseDeDatos
      .from("profiles")
      .select("*")
      .eq("id", idUsuario)
      .maybeSingle()

    if (error) {
      console.error("No se pudo cargar el perfil:", error.message)
      establecerPerfil(null)
      return
    }
    if (datosPerfil && !datosPerfil.active) {
      await baseDeDatos.auth.signOut()
      establecerSesion(null)
      establecerPerfil(null)
      return
    }
    establecerPerfil(datosPerfil)
  }, [])

  React.useEffect(() => {
    baseDeDatos.auth.getSession().then(async ({ data }) => {
      establecerSesion(data.session)
      if (data.session?.user) {
        await cargarPerfilUsuario(data.session.user.id)
      }
      establecerCargando(false)
    })

    const {
      data: { subscription: suscripcionAutenticacion },
    } = baseDeDatos.auth.onAuthStateChange((_evento, nuevaSesion) => {
      establecerSesion(nuevaSesion)
      if (nuevaSesion?.user) {
        void (async () => {
          await cargarPerfilUsuario(nuevaSesion.user.id)
        })()
      } else {
        establecerPerfil(null)
      }
    })

    return () => suscripcionAutenticacion.unsubscribe()
  }, [cargarPerfilUsuario])

  const cerrarSesion = React.useCallback(async () => {
    await baseDeDatos.auth.signOut()
  }, [])

  const valorContexto = React.useMemo<ValorContextoAutenticacion>(
    () => ({
      sesion,
      perfil,
      cargando,
      cerrarSesion,
      session: sesion,
      profile: perfil,
      loading: cargando,
      signOut: cerrarSesion,
    }),
    [sesion, perfil, cargando, cerrarSesion]
  )

  return (
    <ContextoAutenticacion.Provider value={valorContexto}>
      {children}
    </ContextoAutenticacion.Provider>
  )
}

export function usarAutenticacion(): ValorContextoAutenticacion {
  const contexto = React.useContext(ContextoAutenticacion)
  if (!contexto) {
    throw new Error(
      "usarAutenticacion debe utilizarse dentro de ProveedorAutenticacion"
    )
  }
  return contexto
}

// Alias de compatibilidad
export const AuthProvider = ProveedorAutenticacion
export const useAuth = usarAutenticacion

