import * as React from "react"
import { KeyRound, Loader2, Plus, Search, Users } from "lucide-react"
import { toast } from "sonner"

import { EncabezadoPagina } from "@/componentes/encabezado-pagina"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  OPCIONES_ROLES,
  ETIQUETAS_ROLES,
} from "@/configuracion/parametros-sistema"
import { usarAutenticacion } from "@/ganchos/usar-autenticacion"
import { baseDeDatos, urlServidorBackend } from "@/utilidades/cliente-supabase"
import { formatearFecha, obtenerInicialesNombre } from "@/utilidades/fechas"
import type { PerfilUsuario, IdRol } from "@/utilidades/tipos"

export function PaginaPersonal() {
  const { perfil: usuarioActual, sesion } = usarAutenticacion()
  const esAdministrador = usuarioActual?.role_id === "administrador"

  const [listaPerfiles, establecerListaPerfiles] = React.useState<
    PerfilUsuario[]
  >([])
  const [cargando, establecerCargando] = React.useState(true)
  const [mensajeError, establecerMensajeError] = React.useState<string | null>(
    null
  )
  const [textoBusqueda, establecerTextoBusqueda] = React.useState("")
  const [filtroRol, establecerFiltroRol] = React.useState<string>("todos")

  const [dialogoAbierto, establecerDialogoAbierto] = React.useState(false)
  const [nombreNuevo, establecerNombreNuevo] = React.useState("")
  const [correoNuevo, establecerCorreoNuevo] = React.useState("")
  const [contrasenaNueva, establecerContrasenaNueva] = React.useState("")
  const [rolNuevo, establecerRolNuevo] =
    React.useState<IdRol>("auxiliar_contable")
  const [guardando, establecerGuardando] = React.useState(false)
  const [errorFormulario, establecerErrorFormulario] = React.useState<
    string | null
  >(null)

  const [colaboradorRestablecer, establecerColaboradorRestablecer] =
    React.useState<PerfilUsuario | null>(null)
  const [contrasenaRestablecer, establecerContrasenaRestablecer] =
    React.useState("")
  const [guardandoRestablecimiento, establecerGuardandoRestablecimiento] =
    React.useState(false)
  const [errorRestablecimiento, establecerErrorRestablecimiento] =
    React.useState<string | null>(null)

  const cargarPerfilesPersonal = React.useCallback(async () => {
    establecerCargando(true)
    const { data, error } = await baseDeDatos
      .from("profiles")
      .select("*")
      .order("name")

    if (error) {
      establecerMensajeError("No se pudo cargar el personal.")
      establecerListaPerfiles([])
    } else {
      establecerListaPerfiles((data as PerfilUsuario[]) ?? [])
      establecerMensajeError(null)
    }
    establecerCargando(false)
  }, [])

  React.useEffect(() => {
    void cargarPerfilesPersonal()
  }, [cargarPerfilesPersonal])

  async function cambiarRolColaborador(
    colaborador: PerfilUsuario,
    siguienteRol: IdRol
  ) {
    if (!esAdministrador || colaborador.role_id === siguienteRol) return
    const { error } = await baseDeDatos
      .from("profiles")
      .update({
        role_id: siguienteRol,
        updated_at: new Date().toISOString(),
      })
      .eq("id", colaborador.id)
    if (!error) {
      establecerListaPerfiles((previos) =>
        previos.map((item) =>
          item.id === colaborador.id ? { ...item, role_id: siguienteRol } : item
        )
      )
    }
  }

  async function alternarEstadoActivo(
    colaborador: PerfilUsuario,
    siguienteEstadoActivo: boolean
  ) {
    if (!esAdministrador || colaborador.id === usuarioActual?.id) return
    const { error } = await baseDeDatos
      .from("profiles")
      .update({
        active: siguienteEstadoActivo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", colaborador.id)
    if (!error) {
      establecerListaPerfiles((previos) =>
        previos.map((item) =>
          item.id === colaborador.id
            ? { ...item, active: siguienteEstadoActivo }
            : item
        )
      )
    }
  }

  async function crearNuevoColaborador(evento: React.FormEvent) {
    evento.preventDefault()
    establecerErrorFormulario(null)

    if (!nombreNuevo.trim() || !correoNuevo.trim() || !contrasenaNueva) {
      establecerErrorFormulario("Todos los campos son obligatorios.")
      return
    }
    if (contrasenaNueva.length < 6) {
      establecerErrorFormulario(
        "La contraseña debe tener al menos 6 caracteres."
      )
      return
    }

    establecerGuardando(true)
    try {
      const respuesta = await fetch(
        `${urlServidorBackend}/api/auth/admin/users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(sesion?.access_token
              ? { Authorization: `Bearer ${sesion.access_token}` }
              : {}),
          },
          body: JSON.stringify({
            name: nombreNuevo.trim(),
            email: correoNuevo.trim().toLowerCase(),
            password: contrasenaNueva,
            role_id: rolNuevo,
            active: true,
          }),
        }
      )

      const datosRespuesta = await respuesta.json()
      if (!respuesta.ok) {
        establecerErrorFormulario(
          datosRespuesta?.msg ||
            datosRespuesta?.error ||
            "No se pudo crear el colaborador."
        )
        establecerGuardando(false)
        return
      }

      establecerDialogoAbierto(false)
      establecerNombreNuevo("")
      establecerCorreoNuevo("")
      establecerContrasenaNueva("")
      establecerRolNuevo("auxiliar_contable")
      toast.success("Colaborador creado correctamente")
      await cargarPerfilesPersonal()
    } catch {
      establecerErrorFormulario("Error de red al crear el colaborador.")
    } finally {
      establecerGuardando(false)
    }
  }

  async function restablecerContrasenaColaborador(evento: React.FormEvent) {
    evento.preventDefault()
    if (!colaboradorRestablecer) return
    establecerErrorRestablecimiento(null)

    if (contrasenaRestablecer.length < 6) {
      establecerErrorRestablecimiento(
        "La nueva contraseña debe tener al menos 6 caracteres."
      )
      return
    }

    establecerGuardandoRestablecimiento(true)
    try {
      const respuesta = await fetch(
        `${urlServidorBackend}/api/auth/admin/users/${colaboradorRestablecer.id}/password`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(sesion?.access_token
              ? { Authorization: `Bearer ${sesion.access_token}` }
              : {}),
          },
          body: JSON.stringify({ password: contrasenaRestablecer }),
        }
      )
      const datosRespuesta = await respuesta.json()
      if (!respuesta.ok) {
        establecerErrorRestablecimiento(
          datosRespuesta?.msg ||
            datosRespuesta?.error ||
            "No se pudo cambiar la contraseña."
        )
        establecerGuardandoRestablecimiento(false)
        return
      }
      toast.success(`Contraseña de ${colaboradorRestablecer.name} actualizada`)
      establecerColaboradorRestablecer(null)
      establecerContrasenaRestablecer("")
    } catch {
      establecerErrorRestablecimiento(
        "Error de red al actualizar la contraseña."
      )
    } finally {
      establecerGuardandoRestablecimiento(false)
    }
  }

  const perfilesFiltrados = listaPerfiles.filter((perfil) => {
    if (filtroRol !== "todos" && perfil.role_id !== filtroRol) return false
    if (textoBusqueda.trim()) {
      const consulta = textoBusqueda.trim().toLowerCase()
      return (
        perfil.name.toLowerCase().includes(consulta) ||
        perfil.email.toLowerCase().includes(consulta) ||
        ETIQUETAS_ROLES[perfil.role_id].toLowerCase().includes(consulta)
      )
    }
    return true
  })

  return (
    <div>
      <EncabezadoPagina
        titulo="Personal"
        descripcion="Usuarios del sistema, asignación de roles y control de acceso activo."
        acciones={
          esAdministrador ? (
            <Button
              onClick={() => {
                establecerErrorFormulario(null)
                establecerDialogoAbierto(true)
              }}
            >
              <Plus className="size-4" />
              Nuevo Colaborador
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o correo…"
            value={textoBusqueda}
            onChange={(evento) => establecerTextoBusqueda(evento.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroRol} onValueChange={establecerFiltroRol}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los roles</SelectItem>
            {OPCIONES_ROLES.map((rol) => (
              <SelectItem key={rol} value={rol}>
                {ETIQUETAS_ROLES[rol]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {cargando && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Cargando personal…
        </div>
      )}

      {mensajeError && (
        <Card className="border-destructive/50">
          <CardContent className="py-8 text-center text-sm text-destructive">
            {mensajeError}
          </CardContent>
        </Card>
      )}

      {!cargando && !mensajeError && (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de alta</TableHead>
                  {esAdministrador && (
                    <TableHead className="text-right">Seguridad</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {perfilesFiltrados.map((perfil) => (
                  <TableRow key={perfil.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarFallback className="text-xs">
                            {obtenerInicialesNombre(perfil.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{perfil.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {perfil.email}
                    </TableCell>
                    <TableCell>
                      {esAdministrador ? (
                        <Select
                          value={perfil.role_id}
                          onValueChange={(valor) =>
                            void cambiarRolColaborador(perfil, valor as IdRol)
                          }
                        >
                          <SelectTrigger className="h-8 w-52">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPCIONES_ROLES.map((rol) => (
                              <SelectItem key={rol} value={rol}>
                                {ETIQUETAS_ROLES[rol]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        ETIQUETAS_ROLES[perfil.role_id]
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {esAdministrador && (
                          <Switch
                            checked={perfil.active}
                            disabled={perfil.id === usuarioActual?.id}
                            onCheckedChange={(marcado) =>
                              void alternarEstadoActivo(perfil, marcado)
                            }
                          />
                        )}
                        {perfil.active ? (
                          <Badge variant="secondary">Activo</Badge>
                        ) : (
                          <Badge variant="outline">Inactivo</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatearFecha(perfil.created_at)}
                    </TableCell>
                    {esAdministrador && (
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            establecerColaboradorRestablecer(perfil)
                            establecerContrasenaRestablecer("")
                            establecerErrorRestablecimiento(null)
                          }}
                        >
                          <KeyRound className="mr-1 size-3.5" />
                          Cambiar clave
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {perfilesFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={esAdministrador ? 6 : 5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      <Users className="mx-auto mb-2 size-6" />
                      No se encontraron colaboradores con los filtros actuales.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogoAbierto} onOpenChange={establecerDialogoAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Colaborador</DialogTitle>
            <DialogDescription>
              Crea la cuenta de acceso y el perfil operativo del colaborador en
              la firma.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={crearNuevoColaborador} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-name">Nombre completo *</Label>
              <Input
                id="staff-name"
                value={nombreNuevo}
                onChange={(evento) => establecerNombreNuevo(evento.target.value)}
                placeholder="Ej. Francis Rivera"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email">Correo institucional *</Label>
              <Input
                id="staff-email"
                type="email"
                value={correoNuevo}
                onChange={(evento) => establecerCorreoNuevo(evento.target.value)}
                placeholder="nombre@contagestion.hn"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-password">Contraseña temporal *</Label>
              <Input
                id="staff-password"
                type="password"
                value={contrasenaNueva}
                onChange={(evento) =>
                  establecerContrasenaNueva(evento.target.value)
                }
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Rol en la firma *</Label>
              <Select
                value={rolNuevo}
                onValueChange={(valor) => establecerRolNuevo(valor as IdRol)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPCIONES_ROLES.map((rol) => (
                    <SelectItem key={rol} value={rol}>
                      {ETIQUETAS_ROLES[rol]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {errorFormulario && (
              <p className="text-sm text-destructive">{errorFormulario}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => establecerDialogoAbierto(false)}
                disabled={guardando}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando}>
                {guardando && <Loader2 className="mr-2 size-4 animate-spin" />}
                Crear colaborador
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(colaboradorRestablecer)}
        onOpenChange={(abierto) =>
          !abierto && establecerColaboradorRestablecer(null)
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restablecer contraseña</DialogTitle>
            <DialogDescription>
              Define una nueva contraseña de acceso para{" "}
              <strong>{colaboradorRestablecer?.name}</strong> (
              {colaboradorRestablecer?.email}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={restablecerContrasenaColaborador} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">Nueva contraseña *</Label>
              <Input
                id="reset-password"
                type="password"
                value={contrasenaRestablecer}
                onChange={(evento) =>
                  establecerContrasenaRestablecer(evento.target.value)
                }
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            {errorRestablecimiento && (
              <p className="text-sm text-destructive">
                {errorRestablecimiento}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => establecerColaboradorRestablecer(null)}
                disabled={guardandoRestablecimiento}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={guardandoRestablecimiento}>
                {guardandoRestablecimiento && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Guardar contraseña
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const Staff = PaginaPersonal

