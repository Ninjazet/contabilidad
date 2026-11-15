import * as React from "react"
import { Navigate, useLocation } from "react-router-dom"
import { Loader2 } from "lucide-react"

import { usarAutenticacion } from "@/ganchos/usar-autenticacion"
import { puedeAccederRol } from "@/utilidades/permisos"

export function RequiereAutenticacion({
  children,
}: {
  children: React.ReactNode
}) {
  const { sesion, perfil, cargando } = usarAutenticacion()
  const ubicacionActual = useLocation()

  if (cargando) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <span className="text-sm">Cargando sesión…</span>
        </div>
      </div>
    )
  }

  if (!sesion || (perfil && !perfil.active)) {
    return (
      <Navigate
        to="/acceso"
        replace
        state={{ from: ubicacionActual.pathname }}
      />
    )
  }

  if (perfil && !puedeAccederRol(perfil.role_id, ubicacionActual.pathname)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export const RequireAuth = RequiereAutenticacion

