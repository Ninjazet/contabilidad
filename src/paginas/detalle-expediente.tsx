import * as React from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  Loader2,
  Plus,
  Trash2,
  User,
} from "lucide-react"
import { toast } from "sonner"

import { EncabezadoPagina } from "@/componentes/encabezado-pagina"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SeccionDocumentosExpediente } from "@/componentes/expedientes/seccion-documentos-expediente"
import { ETIQUETAS_ESTADO_EXPEDIENTE } from "@/configuracion/parametros-sistema"
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import { formatearFecha, aFechaIso } from "@/utilidades/fechas"
import type {
  Cliente,
  EstadoExpediente,
  PerfilUsuario,
} from "@/utilidades/tipos"

type FilaExpedienteDetalle = {
  id: string
  code: string
  client_id: string
  period_year: number
  period_month: number
  status: EstadoExpediente
  due_date: string | null
  responsible_user_id: string | null
  notes: string | null
}

type ElementoChecklistExpediente = {
  id: string
  file_id: string
  title: string
  status: "pendiente" | "en_proceso" | "completado"
  responsible_user_id: string | null
  due_date: string | null
}

function obtenerVarianteEstadoExpediente(
  estado: EstadoExpediente
): "secondary" | "outline" | "default" | "destructive" {
  if (estado === "aprobado") return "secondary"
  if (estado === "en_revision") return "default"
  if (estado === "rechazado") return "destructive"
  return "outline"
}

export function PaginaDetalleExpediente() {
  const { id: idExpedienteParametro } = useParams<{ id: string }>()

  const [expediente, establecerExpediente] =
    React.useState<FilaExpedienteDetalle | null>(null)
  const [cliente, establecerCliente] = React.useState<Cliente | null>(null)
  const [elementosChecklist, establecerElementosChecklist] = React.useState<
    ElementoChecklistExpediente[]
  >([])
  const [listaPerfiles, establecerListaPerfiles] = React.useState<
    PerfilUsuario[]
  >([])
  const [cargando, establecerCargando] = React.useState(true)
  const [noEncontrado, establecerNoEncontrado] = React.useState(false)
  const [tituloNuevaTarea, establecerTituloNuevaTarea] = React.useState("")
  const [agregandoTarea, establecerAgregandoTarea] = React.useState(false)

  const cargarDatosExpediente = React.useCallback(async () => {
    if (!idExpedienteParametro) return
    establecerCargando(true)
    const [respuestaExpediente, respuestaPerfiles] = await Promise.all([
      baseDeDatos
        .from("files")
        .select("*")
        .eq("id", idExpedienteParametro)
        .maybeSingle(),
      baseDeDatos.from("profiles").select("*").order("name"),
    ])

    if (respuestaExpediente.error || !respuestaExpediente.data) {
      establecerNoEncontrado(true)
      establecerExpediente(null)
      establecerCargando(false)
      return
    }

    const datosExpediente = respuestaExpediente.data as FilaExpedienteDetalle
    establecerExpediente(datosExpediente)
    establecerListaPerfiles(respuestaPerfiles.data ?? [])

    const [respuestaCliente, respuestaChecklist] = await Promise.all([
      baseDeDatos
        .from("clients")
        .select("*")
        .eq("id", datosExpediente.client_id)
        .maybeSingle(),
      baseDeDatos
        .from("file_checklist_items")
        .select("*")
        .eq("file_id", datosExpediente.id)
        .order("created_at"),
    ])

    establecerCliente(respuestaCliente.data ?? null)
    establecerElementosChecklist(respuestaChecklist.data ?? [])
    establecerCargando(false)
  }, [idExpedienteParametro])

  React.useEffect(() => {
    void cargarDatosExpediente()
  }, [cargarDatosExpediente])

  const mapaPerfilPorId = React.useMemo(() => {
    const mapa = new Map<string, PerfilUsuario>()
    listaPerfiles.forEach((perfil) => mapa.set(perfil.id, perfil))
    return mapa
  }, [listaPerfiles])

  const cantidadCompletadas = elementosChecklist.filter(
    (item) => item.status === "completado"
  ).length
  const porcentajeAvance =
    elementosChecklist.length === 0
      ? 0
      : Math.round((cantidadCompletadas / elementosChecklist.length) * 100)

  const actualizarEstadoTareaChecklist = async (
    elemento: ElementoChecklistExpediente,
    completado: boolean
  ) => {
    const nuevoEstado = completado ? "completado" : "pendiente"
    establecerElementosChecklist((previos) =>
      previos.map((item) =>
        item.id === elemento.id ? { ...item, status: nuevoEstado } : item
      )
    )
    const { error } = await baseDeDatos
      .from("file_checklist_items")
      .update({
        status: nuevoEstado,
        completed_at: completado ? new Date().toISOString() : null,
      })
      .eq("id", elemento.id)
    if (error) {
      toast.error("No se pudo actualizar el checklist.")
      establecerElementosChecklist((previos) =>
        previos.map((item) =>
          item.id === elemento.id ? { ...item, status: elemento.status } : item
        )
      )
    }
  }

  const actualizarEstadoExpediente = async (nuevoEstado: EstadoExpediente) => {
    if (!expediente) return
    const { error } = await baseDeDatos
      .from("files")
      .update({ status: nuevoEstado })
      .eq("id", expediente.id)
    if (error) {
      toast.error("No se pudo cambiar el estado del expediente.")
      return
    }
    establecerExpediente({ ...expediente, status: nuevoEstado })
    toast.success("Estado actualizado")
  }

  const actualizarResponsableExpediente = async (idUsuario: string) => {
    if (!expediente) return
    const valorAsignado = idUsuario === "none" ? null : idUsuario
    const { error } = await baseDeDatos
      .from("files")
      .update({ responsible_user_id: valorAsignado })
      .eq("id", expediente.id)
    if (error) {
      toast.error("No se pudo asignar el responsable.")
      return
    }
    establecerExpediente({
      ...expediente,
      responsible_user_id: valorAsignado,
    })
    toast.success("Responsable actualizado")
  }

  const actualizarFechaLimite = async (fechaLimite: string) => {
    if (!expediente) return
    const valorFecha = fechaLimite.trim() || null
    const { error } = await baseDeDatos
      .from("files")
      .update({ due_date: valorFecha })
      .eq("id", expediente.id)
    if (error) {
      toast.error("No se pudo actualizar la fecha límite.")
      return
    }
    establecerExpediente({ ...expediente, due_date: valorFecha })
    toast.success("Fecha límite actualizada")
  }

  const actualizarNotasExpediente = async (notas: string) => {
    if (!expediente) return
    const valorNotas = notas.trim() || null
    if (valorNotas === (expediente.notes ?? null)) return
    const { error } = await baseDeDatos
      .from("files")
      .update({ notes: valorNotas })
      .eq("id", expediente.id)
    if (error) {
      toast.error("No se pudieron guardar las notas.")
      return
    }
    establecerExpediente({ ...expediente, notes: valorNotas })
    toast.success("Notas actualizadas")
  }

  const agregarTareaChecklist = async (evento: React.FormEvent) => {
    evento.preventDefault()
    if (!expediente) return
    const tituloLimpio = tituloNuevaTarea.trim()
    if (!tituloLimpio) return
    establecerAgregandoTarea(true)
    const { data, error } = await baseDeDatos
      .from("file_checklist_items")
      .insert({
        file_id: expediente.id,
        title: tituloLimpio,
        status: "pendiente",
        responsible_user_id: expediente.responsible_user_id,
        due_date: expediente.due_date,
      })
      .select("*")
      .single()
    establecerAgregandoTarea(false)
    if (error || !data) {
      toast.error("No se pudo agregar la tarea al checklist.")
      return
    }
    establecerElementosChecklist((previos) => [
      ...previos,
      data as ElementoChecklistExpediente,
    ])
    establecerTituloNuevaTarea("")
    toast.success("Tarea agregada al checklist")
  }

  const eliminarTareaChecklist = async (
    elemento: ElementoChecklistExpediente
  ) => {
    const { error } = await baseDeDatos
      .from("file_checklist_items")
      .delete()
      .eq("id", elemento.id)
    if (error) {
      toast.error("No se pudo eliminar la tarea.")
      return
    }
    establecerElementosChecklist((previos) =>
      previos.filter((item) => item.id !== elemento.id)
    )
    toast.success("Tarea eliminada")
  }

  if (cargando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  if (noEncontrado || !expediente) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium">Expediente no encontrado</p>
        <Button className="mt-4" asChild>
          <Link to="/expedientes">Volver a Expedientes</Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link to="/expedientes">
            <ArrowLeft className="size-4" />
            Volver a Expedientes
          </Link>
        </Button>
        <EncabezadoPagina
          titulo={cliente?.legal_name ?? "Expediente"}
          descripcion={`${expediente.code} · Periodo ${expediente.period_year}-${String(expediente.period_month).padStart(2, "0")}`}
          acciones={
            <Select
              value={expediente.status}
              onValueChange={(valor) =>
                actualizarEstadoExpediente(valor as EstadoExpediente)
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="en_revision">En revisión</SelectItem>
                <SelectItem value="aprobado">Aprobado</SelectItem>
                <SelectItem value="rechazado">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estado</span>
              <Badge variant={obtenerVarianteEstadoExpediente(expediente.status)}>
                {ETIQUETAS_ESTADO_EXPEDIENTE[expediente.status]}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="size-3.5" />
                Fecha límite
              </span>
              <Input
                type="date"
                className="h-8 w-44 text-xs"
                value={aFechaIso(expediente.due_date)}
                onChange={(evento) =>
                  void actualizarFechaLimite(evento.target.value)
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="size-3.5" />
                Responsable
              </span>
              <Select
                value={expediente.responsible_user_id ?? "none"}
                onValueChange={actualizarResponsableExpediente}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {listaPerfiles.map((perfil) => (
                    <SelectItem key={perfil.id} value={perfil.id}>
                      {perfil.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border-t pt-3">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FileText className="size-3.5" />
                Notas y observaciones del expediente
              </label>
              <Input
                defaultValue={expediente.notes ?? ""}
                placeholder="Agregar notas u observaciones del periodo..."
                className="h-8 text-xs"
                onBlur={(evento) =>
                  void actualizarNotasExpediente(evento.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Avance del checklist
              <span className="text-sm font-normal text-muted-foreground">
                {cantidadCompletadas}/{elementosChecklist.length} ·{" "}
                {porcentajeAvance}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={porcentajeAvance} />
            <form
              onSubmit={agregarTareaChecklist}
              className="flex items-center gap-2"
            >
              <Input
                value={tituloNuevaTarea}
                onChange={(evento) =>
                  establecerTituloNuevaTarea(evento.target.value)
                }
                placeholder="Nueva tarea del checklist..."
                className="h-8 text-xs"
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={agregandoTarea || !tituloNuevaTarea.trim()}
              >
                {agregandoTarea ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                Agregar
              </Button>
            </form>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {elementosChecklist.map((elemento) => {
                const responsableElemento = elemento.responsible_user_id
                  ? mapaPerfilPorId.get(elemento.responsible_user_id)
                  : null
                return (
                  <div
                    key={elemento.id}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={elemento.status === "completado"}
                      onCheckedChange={(valor) =>
                        actualizarEstadoTareaChecklist(elemento, valor === true)
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm ${
                          elemento.status === "completado"
                            ? "text-muted-foreground line-through"
                            : ""
                        }`}
                      >
                        {elemento.title}
                      </p>
                      {responsableElemento && (
                        <p className="text-xs text-muted-foreground">
                          Asignado a: {responsableElemento.name}
                        </p>
                      )}
                    </div>
                    {elemento.due_date && (
                      <span className="text-xs text-muted-foreground">
                        {formatearFecha(elemento.due_date)}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      title="Eliminar tarea"
                      onClick={() => void eliminarTareaChecklist(elemento)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )
              })}
              {elementosChecklist.length === 0 && (
                <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4" />
                  Este expediente no tiene tareas en su checklist.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <SeccionDocumentosExpediente
          idExpediente={expediente.id}
          alCambiar={cargarDatosExpediente}
        />
      </div>
    </div>
  )
}

export const FileDetail = PaginaDetalleExpediente

