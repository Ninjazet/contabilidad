import * as React from "react"
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Loader2,
  Timer,
} from "lucide-react"
import { toast } from "sonner"

import { EncabezadoPagina } from "@/componentes/encabezado-pagina"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ETIQUETAS_ESTADO_TAREA } from "@/configuracion/parametros-sistema"
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import { formatearFecha, fechaHoyIso, aFechaIso } from "@/utilidades/fechas"
import type { EstadoTarea } from "@/utilidades/tipos"

type TareaVencimiento = {
  id: string
  client_id: string
  due_date: string
  status: EstadoTarea
  notes: string | null
  responsible_user_id: string | null
  obligation_id: string
  file_id: string | null
}

type ObligacionFiscalCatalogo = { id: string; name: string }
type ClienteResumido = { id: string; legal_name: string }

type FilaChecklist = TareaVencimiento & {
  nombreObligacion: string
  nombreCliente: string
}

function obtenerVarianteEstadoTarea(
  estado: EstadoTarea
): "secondary" | "outline" | "default" {
  if (estado === "completado") return "secondary"
  if (estado === "en_proceso") return "default"
  return "outline"
}

function estaVencidaTarea(fechaVencimiento: string, estado: EstadoTarea): boolean {
  const fechaIso = aFechaIso(fechaVencimiento)
  if (!fechaIso) return false
  return estado !== "completado" && fechaIso < fechaHoyIso()
}

export function PaginaListaTareas() {
  const [filasTareas, establecerFilasTareas] = React.useState<FilaChecklist[]>(
    []
  )
  const [listaObligaciones, establecerListaObligaciones] = React.useState<
    ObligacionFiscalCatalogo[]
  >([])
  const [listaClientes, establecerListaClientes] = React.useState<
    ClienteResumido[]
  >([])
  const [cargando, establecerCargando] = React.useState(true)
  const [mensajeError, establecerMensajeError] = React.useState<string | null>(
    null
  )

  const [filtroEstado, establecerFiltroEstado] = React.useState<string>("todas")
  const [filtroCliente, establecerFiltroCliente] =
    React.useState<string>("todos")
  const [filtroObligacion, establecerFiltroObligacion] =
    React.useState<string>("todas")

  React.useEffect(() => {
    const cargarTareasChecklist = async () => {
      establecerCargando(true)
      const [respuestaTareas, respuestaObligaciones, respuestaClientes] =
        await Promise.all([
          baseDeDatos.from("deadline_tasks").select("*").order("due_date"),
          baseDeDatos.from("fiscal_obligations").select("id, name").order("name"),
          baseDeDatos
            .from("clients")
            .select("id, legal_name")
            .order("legal_name"),
        ])
      if (
        respuestaTareas.error ||
        respuestaObligaciones.error ||
        respuestaClientes.error
      ) {
        establecerMensajeError("No se pudieron cargar las tareas.")
        establecerFilasTareas([])
      } else {
        const mapaObligaciones = new Map<string, string>()
        ;(respuestaObligaciones.data ?? []).forEach((obligacion) =>
          mapaObligaciones.set(obligacion.id, obligacion.name)
        )
        const mapaClientes = new Map<string, string>()
        ;(respuestaClientes.data ?? []).forEach((cliente) =>
          mapaClientes.set(cliente.id, cliente.legal_name)
        )

        establecerFilasTareas(
          (respuestaTareas.data ?? []).map((tarea: TareaVencimiento) => ({
            ...tarea,
            nombreObligacion: mapaObligaciones.get(tarea.obligation_id) ?? "—",
            nombreCliente: mapaClientes.get(tarea.client_id) ?? "—",
          }))
        )
        establecerListaObligaciones(respuestaObligaciones.data ?? [])
        establecerListaClientes(respuestaClientes.data ?? [])
        establecerMensajeError(null)
      }
      establecerCargando(false)
    }
    void cargarTareasChecklist()
  }, [])

  const actualizarEstadoTarea = async (
    fila: FilaChecklist,
    nuevoEstado: EstadoTarea
  ) => {
    const filasPrevias = filasTareas
    establecerFilasTareas((actuales) =>
      actuales.map((item) =>
        item.id === fila.id ? { ...item, status: nuevoEstado } : item
      )
    )
    const { error } = await baseDeDatos
      .from("deadline_tasks")
      .update({ status: nuevoEstado })
      .eq("id", fila.id)
    if (error) {
      toast.error("No se pudo actualizar el estado.")
      establecerFilasTareas(filasPrevias)
    }
  }

  const avanzarEstadoTarea = (fila: FilaChecklist) => {
    const siguienteEstado: EstadoTarea =
      fila.status === "pendiente"
        ? "en_proceso"
        : fila.status === "en_proceso"
          ? "completado"
          : "pendiente"
    void actualizarEstadoTarea(fila, siguienteEstado)
  }

  const tareasFiltradas = filasTareas.filter((fila) => {
    if (filtroEstado !== "todas" && fila.status !== filtroEstado) return false
    if (filtroCliente !== "todos" && fila.client_id !== filtroCliente)
      return false
    if (filtroObligacion !== "todas" && fila.obligation_id !== filtroObligacion)
      return false
    return true
  })

  const cantidadPendientes = tareasFiltradas.filter(
    (fila) => fila.status !== "completado"
  ).length
  const cantidadVencidas = tareasFiltradas.filter((fila) =>
    estaVencidaTarea(fila.due_date, fila.status)
  ).length

  return (
    <div>
      <EncabezadoPagina
        titulo="Checklist"
        descripcion="Vencimientos fiscales por cliente y periodo, con su estado de avance."
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={filtroEstado} onValueChange={establecerFiltroEstado}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="en_proceso">En proceso</SelectItem>
            <SelectItem value="completado">Completados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroCliente} onValueChange={establecerFiltroCliente}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los clientes</SelectItem>
            {listaClientes.map((cliente) => (
              <SelectItem key={cliente.id} value={cliente.id}>
                {cliente.legal_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filtroObligacion}
          onValueChange={establecerFiltroObligacion}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las obligaciones</SelectItem>
            {listaObligaciones.map((obligacion) => (
              <SelectItem key={obligacion.id} value={obligacion.id}>
                {obligacion.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 text-sm sm:ml-auto">
          <Badge variant="outline">{cantidadPendientes} pendientes</Badge>
          {cantidadVencidas > 0 && (
            <Badge variant="destructive">{cantidadVencidas} vencidas</Badge>
          )}
        </div>
      </div>

      {cargando && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Cargando tareas…
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
        <div className="space-y-2">
          {tareasFiltradas.map((fila) => {
            const vencida = estaVencidaTarea(fila.due_date, fila.status)
            return (
              <Card
                key={fila.id}
                className={vencida ? "border-destructive/40" : undefined}
              >
                <CardContent className="flex items-center gap-3 py-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    title={
                      fila.status === "pendiente"
                        ? "Marcar en proceso"
                        : fila.status === "en_proceso"
                          ? "Marcar completado"
                          : "Reabrir"
                    }
                    onClick={() => avanzarEstadoTarea(fila)}
                  >
                    {fila.status === "completado" ? (
                      <CheckCircle2 className="size-5 text-primary" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground" />
                    )}
                  </Button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {fila.nombreObligacion}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        · {fila.nombreCliente}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarClock className="size-3" />
                        Vence: {formatearFecha(fila.due_date)}
                      </span>
                      {vencida && (
                        <span className="flex items-center gap-1 font-medium text-destructive">
                          <Timer className="size-3" />
                          Vencida
                        </span>
                      )}
                    </div>
                  </div>

                  <Badge variant={obtenerVarianteEstadoTarea(fila.status)}>
                    {ETIQUETAS_ESTADO_TAREA[fila.status]}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
          {tareasFiltradas.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                <CalendarClock className="size-8" />
                <p className="text-sm">
                  No hay tareas que coincidan con los filtros. Los vencimientos
                  se generan desde el módulo Calendario.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export const Checklist = PaginaListaTareas

