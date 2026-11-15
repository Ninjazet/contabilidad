import * as React from "react"
import {
  Briefcase,
  Building2,
  FileStack,
  KeyRound,
  Landmark,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

import { EncabezadoPagina } from "@/componentes/encabezado-pagina"
import { Badge } from "@/components/ui/badge"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import {
  NOMBRE_DESPACHO,
  ZONA_HORARIA_HONDURAS,
  ETIQUETAS_ROLES,
} from "@/configuracion/parametros-sistema"
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import { usarAutenticacion } from "@/ganchos/usar-autenticacion"
import type {
  ObligacionFiscalCatalogo,
  TipoDocumentoCatalogo,
  ServicioCatalogo,
} from "@/utilidades/tipos"

type TipoDialogoCatalogo = "obligation" | "doc-type" | "service" | null

export function PaginaConfiguracion() {
  const { perfil } = usarAutenticacion()
  const esAdministrador = perfil?.role_id === "administrador"

  const [listaObligaciones, establecerListaObligaciones] = React.useState<
    ObligacionFiscalCatalogo[]
  >([])
  const [tiposDocumento, establecerTiposDocumento] = React.useState<
    TipoDocumentoCatalogo[]
  >([])
  const [catalogoServicios, establecerCatalogoServicios] = React.useState<
    ServicioCatalogo[]
  >([])
  const [cargando, establecerCargando] = React.useState(true)

  const [tipoDialogo, establecerTipoDialogo] =
    React.useState<TipoDialogoCatalogo>(null)
  const [idEnEdicion, establecerIdEnEdicion] = React.useState<string | null>(
    null
  )
  const [nombreElemento, establecerNombreElemento] = React.useState("")
  const [descripcionElemento, establecerDescripcionElemento] =
    React.useState("")
  const [diaVencimiento, establecerDiaVencimiento] = React.useState("5")
  const [guardando, establecerGuardando] = React.useState(false)

  const [nuevaContrasena, establecerNuevaContrasena] = React.useState("")
  const [confirmacionContrasena, establecerConfirmacionContrasena] =
    React.useState("")
  const [cambiandoContrasena, establecerCambiandoContrasena] =
    React.useState(false)

  const cargarCatalogosSistema = React.useCallback(async () => {
    establecerCargando(true)
    const [respuestaObligaciones, respuestaTiposDoc, respuestaServicios] =
      await Promise.all([
        baseDeDatos.from("fiscal_obligations").select("*").order("name"),
        baseDeDatos.from("document_types").select("*").order("name"),
        baseDeDatos.from("services").select("*").order("name"),
      ])
    if (
      respuestaObligaciones.error ||
      respuestaTiposDoc.error ||
      respuestaServicios.error
    ) {
      toast.error("No se pudieron cargar los catálogos.")
    } else {
      establecerListaObligaciones(respuestaObligaciones.data ?? [])
      establecerTiposDocumento(respuestaTiposDoc.data ?? [])
      establecerCatalogoServicios(respuestaServicios.data ?? [])
    }
    establecerCargando(false)
  }, [])

  React.useEffect(() => {
    void cargarCatalogosSistema()
  }, [cargarCatalogosSistema])

  const abrirDialogoCatalogo = (
    claseCatalogo: Exclude<TipoDialogoCatalogo, null>,
    elemento?:
      | ObligacionFiscalCatalogo
      | TipoDocumentoCatalogo
      | ServicioCatalogo
  ) => {
    establecerTipoDialogo(claseCatalogo)
    establecerIdEnEdicion(elemento?.id ?? null)
    establecerNombreElemento(elemento?.name ?? "")
    establecerDescripcionElemento(elemento?.description ?? "")
    establecerDiaVencimiento(
      elemento && "day_of_month" in elemento
        ? String(elemento.day_of_month)
        : "5"
    )
  }

  const guardarElementoCatalogo = async () => {
    if (!tipoDialogo) return
    if (!nombreElemento.trim()) {
      toast.error("Escriba el nombre.")
      return
    }
    establecerGuardando(true)
    try {
      if (tipoDialogo === "obligation") {
        const datosObligacion = {
          name: nombreElemento.trim(),
          description: descripcionElemento.trim(),
          day_of_month: Math.min(
            Math.max(Number(diaVencimiento) || 1, 1),
            31
          ),
        }
        const { error } = idEnEdicion
          ? await baseDeDatos
              .from("fiscal_obligations")
              .update(datosObligacion)
              .eq("id", idEnEdicion)
          : await baseDeDatos.from("fiscal_obligations").insert(datosObligacion)
        if (error) {
          toast.error(
            error.message.includes("duplicate")
              ? "Ya existe una obligación con ese nombre."
              : "No se pudo guardar la obligación."
          )
          return
        }
      } else if (tipoDialogo === "service") {
        const datosServicio = {
          name: nombreElemento.trim(),
          description: descripcionElemento.trim(),
        }
        const { error } = idEnEdicion
          ? await baseDeDatos
              .from("services")
              .update(datosServicio)
              .eq("id", idEnEdicion)
          : await baseDeDatos.from("services").insert(datosServicio)
        if (error) {
          toast.error(
            error.message.includes("duplicate")
              ? "Ya existe un servicio con ese nombre."
              : "No se pudo guardar el servicio."
          )
          return
        }
      } else {
        const datosTipoDoc = {
          name: nombreElemento.trim(),
          description: descripcionElemento.trim(),
        }
        const { error } = idEnEdicion
          ? await baseDeDatos
              .from("document_types")
              .update(datosTipoDoc)
              .eq("id", idEnEdicion)
          : await baseDeDatos.from("document_types").insert(datosTipoDoc)
        if (error) {
          toast.error(
            error.message.includes("duplicate")
              ? "Ya existe un tipo de documento con ese nombre."
              : "No se pudo guardar el tipo de documento."
          )
          return
        }
      }
      toast.success(idEnEdicion ? "Catálogo actualizado" : "Elemento agregado")
      establecerTipoDialogo(null)
      void cargarCatalogosSistema()
    } finally {
      establecerGuardando(false)
    }
  }

  const alternarActivoCatalogo = async (
    claseCatalogo: "obligation" | "doc-type" | "service",
    elemento:
      | ObligacionFiscalCatalogo
      | TipoDocumentoCatalogo
      | ServicioCatalogo
  ) => {
    const nombreTabla =
      claseCatalogo === "obligation"
        ? "fiscal_obligations"
        : claseCatalogo === "service"
          ? "services"
          : "document_types"
    const nuevoEstadoActivo = !elemento.active
    const { error } = await baseDeDatos
      .from(nombreTabla)
      .update({ active: nuevoEstadoActivo })
      .eq("id", elemento.id)
    if (error) {
      toast.error("No se pudo cambiar el estado.")
      return
    }
    if (claseCatalogo === "obligation") {
      establecerListaObligaciones((previas) =>
        previas.map((item) =>
          item.id === elemento.id
            ? { ...item, active: nuevoEstadoActivo }
            : item
        )
      )
    } else if (claseCatalogo === "service") {
      establecerCatalogoServicios((previos) =>
        previos.map((item) =>
          item.id === elemento.id
            ? { ...item, active: nuevoEstadoActivo }
            : item
        )
      )
    } else {
      establecerTiposDocumento((previos) =>
        previos.map((item) =>
          item.id === elemento.id
            ? { ...item, active: nuevoEstadoActivo }
            : item
        )
      )
    }
  }

  const cambiarContrasenaPersonal = async () => {
    if (nuevaContrasena.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres.")
      return
    }
    if (nuevaContrasena !== confirmacionContrasena) {
      toast.error("Las contraseñas no coinciden.")
      return
    }
    establecerCambiandoContrasena(true)
    try {
      const { error } = await baseDeDatos.auth.updateUser({
        password: nuevaContrasena,
      })
      if (error) {
        toast.error("No se pudo cambiar la contraseña: " + error.message)
        return
      }
      toast.success("Contraseña actualizada correctamente")
      establecerNuevaContrasena("")
      establecerConfirmacionContrasena("")
    } finally {
      establecerCambiandoContrasena(false)
    }
  }

  return (
    <div>
      <EncabezadoPagina
        titulo="Configuración"
        descripcion="Parámetros generales de la firma y catálogos del sistema."
      />

      {cargando && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Cargando configuración…
        </div>
      )}

      {!cargando && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="size-4" />
                Firma
              </CardTitle>
              <CardDescription>Datos generales del sistema.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Nombre</p>
                <p className="font-medium">{NOMBRE_DESPACHO}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Zona horaria</p>
                <p className="font-medium">
                  {ZONA_HORARIA_HONDURAS} (Honduras)
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sesión actual</p>
                <p className="font-medium">
                  {perfil?.name} ·{" "}
                  {perfil ? ETIQUETAS_ROLES[perfil.role_id] : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Administración de catálogos
                </p>
                <p className="font-medium">
                  {esAdministrador
                    ? "Habilitada para su rol"
                    : "Solo lectura (requiere Administrador)"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Landmark className="size-4" />
                  Obligaciones fiscales
                </CardTitle>
                <CardDescription>
                  Catálogo usado por el Calendario para generar vencimientos.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => abrirDialogoCatalogo("obligation")}
                disabled={!esAdministrador}
                title={
                  esAdministrador
                    ? undefined
                    : "Solo el Administrador puede editar catálogos"
                }
              >
                Agregar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Día de vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaObligaciones.map((obligacion) => (
                    <TableRow key={obligacion.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{obligacion.name}</span>
                          {obligacion.description && (
                            <span className="text-xs text-muted-foreground">
                              {obligacion.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        Día {obligacion.day_of_month} de cada mes
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={obligacion.active}
                            onCheckedChange={() =>
                              void alternarActivoCatalogo(
                                "obligation",
                                obligacion
                              )
                            }
                            disabled={!esAdministrador}
                          />
                          <Badge
                            variant={
                              obligacion.active ? "secondary" : "outline"
                            }
                          >
                            {obligacion.active ? "Activa" : "Inactiva"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            abrirDialogoCatalogo("obligation", obligacion)
                          }
                          disabled={!esAdministrador}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileStack className="size-4" />
                  Tipos de documento
                </CardTitle>
                <CardDescription>
                  Catálogo usado al registrar documentos en los expedientes.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => abrirDialogoCatalogo("doc-type")}
                disabled={!esAdministrador}
                title={
                  esAdministrador
                    ? undefined
                    : "Solo el Administrador puede editar catálogos"
                }
              >
                Agregar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiposDocumento.map((tipoDoc) => (
                    <TableRow key={tipoDoc.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{tipoDoc.name}</span>
                          {tipoDoc.description && (
                            <span className="text-xs text-muted-foreground">
                              {tipoDoc.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={tipoDoc.active}
                            onCheckedChange={() =>
                              void alternarActivoCatalogo("doc-type", tipoDoc)
                            }
                            disabled={!esAdministrador}
                          />
                          <Badge
                            variant={tipoDoc.active ? "secondary" : "outline"}
                          >
                            {tipoDoc.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            abrirDialogoCatalogo("doc-type", tipoDoc)
                          }
                          disabled={!esAdministrador}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Briefcase className="size-4" />
                  Servicios contratables
                </CardTitle>
                <CardDescription>
                  Catálogo de servicios contables y fiscales que se asignan a
                  cada cliente.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => abrirDialogoCatalogo("service")}
                disabled={!esAdministrador}
                title={
                  esAdministrador
                    ? undefined
                    : "Solo el Administrador puede editar catálogos"
                }
              >
                Agregar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalogoServicios.map((servicio) => (
                    <TableRow key={servicio.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{servicio.name}</span>
                          {servicio.description && (
                            <span className="text-xs text-muted-foreground">
                              {servicio.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={servicio.active}
                            onCheckedChange={() =>
                              void alternarActivoCatalogo("service", servicio)
                            }
                            disabled={!esAdministrador}
                          />
                          <Badge
                            variant={servicio.active ? "secondary" : "outline"}
                          >
                            {servicio.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            abrirDialogoCatalogo("service", servicio)
                          }
                          disabled={!esAdministrador}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="size-4" />
                Mi cuenta
              </CardTitle>
              <CardDescription>
                Cambie su contraseña personal. Se aplica solo a su usuario.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva contraseña</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={nuevaContrasena}
                    onChange={(evento) =>
                      establecerNuevaContrasena(evento.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmacionContrasena}
                    onChange={(evento) =>
                      establecerConfirmacionContrasena(evento.target.value)
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres. Use una combinación de letras, números y
                símbolos.
              </p>
              <Button
                onClick={() => void cambiarContrasenaPersonal()}
                disabled={
                  cambiandoContrasena ||
                  !nuevaContrasena ||
                  !confirmacionContrasena
                }
              >
                {cambiandoContrasena && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Cambiar contraseña
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog
        open={tipoDialogo !== null}
        onOpenChange={(abierto) => !abierto && establecerTipoDialogo(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {idEnEdicion ? "Editar" : "Agregar"}{" "}
              {tipoDialogo === "obligation"
                ? "obligación fiscal"
                : tipoDialogo === "service"
                  ? "servicio contratable"
                  : "tipo de documento"}
            </DialogTitle>
            <DialogDescription>
              {tipoDialogo === "obligation"
                ? "El día de vencimiento se usa al generar los vencimientos mensuales."
                : tipoDialogo === "service"
                  ? "Los servicios contratables se asignan en la ficha de cada cliente."
                  : "Los tipos clasifican los documentos de los expedientes."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nombre *</Label>
              <Input
                id="cat-name"
                value={nombreElemento}
                onChange={(evento) =>
                  establecerNombreElemento(evento.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Descripción</Label>
              <Input
                id="cat-desc"
                value={descripcionElemento}
                onChange={(evento) =>
                  establecerDescripcionElemento(evento.target.value)
                }
              />
            </div>
            {tipoDialogo === "obligation" && (
              <div className="space-y-2">
                <Label htmlFor="cat-day">Día de vencimiento (1–31)</Label>
                <Input
                  id="cat-day"
                  type="number"
                  min={1}
                  max={31}
                  value={diaVencimiento}
                  onChange={(evento) =>
                    establecerDiaVencimiento(evento.target.value)
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => establecerTipoDialogo(null)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void guardarElementoCatalogo()}
              disabled={guardando}
            >
              {guardando && <Loader2 className="size-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const Settings = PaginaConfiguracion

