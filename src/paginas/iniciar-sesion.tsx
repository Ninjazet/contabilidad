import * as React from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { BookOpenCheck, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { NOMBRE_DESPACHO } from "@/configuracion/parametros-sistema"
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import { usarAutenticacion } from "@/ganchos/usar-autenticacion"

const MENSAJE_ERROR_GENERICO =
  "No pudimos iniciar sesión. Verifique su correo y contraseña e inténtelo de nuevo."

export function PaginaIniciarSesion() {
  const { sesion, cargando } = usarAutenticacion()
  const navegar = useNavigate()
  const ubicacionActual = useLocation()
  const rutaDestino =
    (ubicacionActual.state as { from?: string } | null)?.from ?? "/"

  const [correoElectronico, establecerCorreoElectronico] = React.useState("")
  const [contrasena, establecerContrasena] = React.useState("")
  const [enviando, establecerEnviando] = React.useState(false)
  const [mensajeError, establecerMensajeError] = React.useState<string | null>(
    null
  )

  if (!cargando && sesion) {
    return <Navigate to={rutaDestino} replace />
  }

  const enviarFormularioAcceso = async (
    evento: React.FormEvent<HTMLFormElement>
  ) => {
    evento.preventDefault()
    establecerMensajeError(null)
    establecerEnviando(true)
    try {
      const { error: errorAutenticacion } =
        await baseDeDatos.auth.signInWithPassword({
          email: correoElectronico.trim().toLowerCase(),
          password: contrasena,
        })
      if (errorAutenticacion) {
        establecerMensajeError(
          errorAutenticacion.message.toLowerCase().includes("invalid login")
            ? "Correo o contraseña incorrectos."
            : MENSAJE_ERROR_GENERICO
        )
        return
      }
      navegar(rutaDestino, { replace: true })
    } catch {
      establecerMensajeError(
        "Ocurrió un problema de conexión. Inténtelo más tarde."
      )
    } finally {
      establecerEnviando(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpenCheck className="size-6" />
          </div>
          <CardTitle className="text-xl">{NOMBRE_DESPACHO}</CardTitle>
          <CardDescription>
            Inicie sesión con su cuenta de la firma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviarFormularioAcceso} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="nombre@contagestion.hn"
                value={correoElectronico}
                onChange={(evento) =>
                  establecerCorreoElectronico(evento.target.value)
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={contrasena}
                onChange={(evento) => establecerContrasena(evento.target.value)}
                required
              />
            </div>
            {mensajeError && (
              <Alert variant="destructive">
                <AlertDescription>{mensajeError}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando && <Loader2 className="size-4 animate-spin" />}
              Iniciar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export const Login = PaginaIniciarSesion

