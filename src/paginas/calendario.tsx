import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { EncabezadoPagina } from "@/componentes/encabezado-pagina"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  NOMBRES_MESES,
  DIAS_SEMANA_CORTOS,
  COLOR_PUNTO_ESTADO_TAREA,
} from "@/configuracion/parametros-sistema"
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import { formatearFecha, fechaHoyIso, aFechaIso } from "@/utilidades/fechas"
import { descargarArchivoCsv } from "@/utilidades/exportar-csv"
import type { EstadoTarea } from "@/utilidades/tipos"

type ObligacionFiscal = {
  id: string
  name: string
  day_of_month: number
  active?: boolean
}
type ClienteResumido = { id: string; legal_name: string; status?: string }

type TareaVencimiento = {
  id: string
  client_id: string
  obligation_id: string
  due_date: string
  status: EstadoTarea
}

type TareaCalendario = TareaVencimiento & {
  nombreCliente: string
  nombreObligacion: string
}

function construirFechaIso(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
}

export function PaginaCalendario() {
  const fechaActual = new Date()
  const [anioSeleccionado, establecerAnioSeleccionado] = React.useState(
    fechaActual.getFullYear()
  )
  const [mesSeleccionado, establecerMesSeleccionado] = React.useState(
    fechaActual.getMonth() + 1
  )

  const [listaTareas, establecerListaTareas] = React.useState<
    TareaCalendario[]
  >([])
  const [listaObligaciones, establecerListaObligaciones] = React.useState<
    ObligacionFiscal[]
  >([])
  const [listaClientes, establecerListaClientes] = React.useState<
    ClienteResumido[]
  >([])
  const [cargando, establecerCargando] = React.useState(true)
  const [mensajeError, establecerMensajeError] = React.useState<string | null>(
    null
  )

  const [dialogoAbierto, establecerDialogoAbierto] = React.useState(false)
  const [idClienteNuevo, establecerIdClienteNuevo] = React.useState("")
  const [idObligacionNueva, establecerIdObligacionNueva] = React.useState("")
  const [guardando, establecerGuardando] = React.useState(false)

  const cargarTareasCalendario = React.useCallback(async () => {
    establecerCargando(true)
    const [respuestaTareas, respuestaObligaciones, respuestaClientes] =
      await Promise.all([
        baseDeDatos.from("deadline_tasks").select("*").order("due_date"),
        baseDeDatos.from("fiscal_obligations").select("*").order("name"),
        baseDeDatos
          .from("clients")
          .select("id, legal_name, status")
          .order("legal_name"),
      ])
    if (
      respuestaTareas.error ||
      respuestaObligaciones.error ||
      respuestaClientes.error
    ) {
      establecerMensajeError("No se pudo cargar el calendario.")
    } else {
      const mapaObligaciones = new Map<string, string>()
      ;(respuestaObligaciones.data ?? []).forEach((obligacion) =>
        mapaObligaciones.set(obligacion.id, obligacion.name)
      )
      const mapaClientes = new Map<string, string>()
      ;(respuestaClientes.data ?? []).forEach((cliente) =>
        mapaClientes.set(cliente.id, cliente.legal_name)
      )

      establecerListaTareas(
        (respuestaTareas.data ?? []).map((tarea: TareaVencimiento) => ({
          ...tarea,
          due_date: aFechaIso(tarea.due_date),
          nombreCliente: mapaClientes.get(tarea.client_id) ?? "—",
          nombreObligacion: mapaObligaciones.get(tarea.obligation_id) ?? "—",
        }))
      )
      establecerListaObligaciones(
        (respuestaObligaciones.data ?? []).filter(
          (obligacion: ObligacionFiscal) => obligacion.active !== false
        )
      )
      establecerListaClientes(
        (respuestaClientes.data ?? []).filter(
          (cliente: ClienteResumido) =>
            !cliente.status || cliente.status === "activo"
        )
      )
      establecerMensajeError(null)
    }
    establecerCargando(false)
  }, [])

  React.useEffect(() => {
    void cargarTareasCalendario()
  }, [cargarTareasCalendario])

  const celdasDiasMes = React.useMemo(() => {
    const primerDiaMes = new Date(anioSeleccionado, mesSeleccionado - 1, 1)
    const ultimoDiaMes = new Date(
      anioSeleccionado,
      mesSeleccionado,
      0
    ).getDate()
    const desplazamientoInicio = (primerDiaMes.getDay() + 6) % 7
    const celdas: (number | null)[] = Array(desplazamientoInicio).fill(null)
    for (let dia = 1; dia <= ultimoDiaMes; dia++) celdas.push(dia)
    while (celdas.length % 7 !== 0) celdas.push(null)
    return celdas
  }, [anioSeleccionado, mesSeleccionado])

  const mapaTareasPorDia = React.useMemo(() => {
    const mapa = new Map<string, TareaCalendario[]>()
    listaTareas.forEach((tarea) => {
      const claveFecha = tarea.due_date
      const listaDelDia = mapa.get(claveFecha) ?? []
      listaDelDia.push(tarea)
      mapa.set(claveFecha, listaDelDia)
    })
    return mapa
  }, [listaTareas])

  const tareasDelMes = React.useMemo(() => {
    const prefijoPeriodo = `${anioSeleccionado}-${String(mesSeleccionado).padStart(2, "0")}`
    return listaTareas.filter((tarea) =>
      tarea.due_date.startsWith(prefijoPeriodo)
    )
  }, [listaTareas, anioSeleccionado, mesSeleccionado])

  const irMesAnterior = () => {
    if (mesSeleccionado === 1) {
      establecerMesSeleccionado(12)
      establecerAnioSeleccionado((anio) => anio - 1)
    } else {
      establecerMesSeleccionado((mes) => mes - 1)
    }
  }

  const irMesSiguiente = () => {
    if (mesSeleccionado === 12) {
      establecerMesSeleccionado(1)
      establecerAnioSeleccionado((anio) => anio + 1)
    } else {
      establecerMesSeleccionado((mes) => mes + 1)
    }
  }

  const generarVencimientosDelMes = async () => {
    establecerGuardando(true)
    try {
      const filasAGenerar: {
        client_id: string
        obligation_id: string
        period_year: number
        period_month: number
        due_date: string
      }[] = []

      for (const cliente of listaClientes) {
        for (const obligacion of listaObligaciones) {
          const ultimoDia = new Date(
            anioSeleccionado,
            mesSeleccionado,
            0
          ).getDate()
          const diaVencimiento = Math.min(obligacion.day_of_month, ultimoDia)
          filasAGenerar.push({
            client_id: cliente.id,
            obligation_id: obligacion.id,
            period_year: anioSeleccionado,
            period_month: mesSeleccionado,
            due_date: construirFechaIso(
              anioSeleccionado,
              mesSeleccionado,
              diaVencimiento
            ),
          })
        }
      }

      const { error: errorInsercion } = await baseDeDatos
        .from("deadline_tasks")
        .upsert(filasAGenerar, {
          onConflict: "client_id,obligation_id,period_year,period_month",
          ignoreDuplicates: true,
        })

      if (errorInsercion) {
        toast.error(
          "No se pudieron generar los vencimientos: " + errorInsercion.message
        )
        return
      }

      toast.success(
        `Vencimientos de ${NOMBRES_MESES[mesSeleccionado - 1]} ${anioSeleccionado} generados`
      )
      void cargarTareasCalendario()
    } finally {
      establecerGuardando(false)
    }
  }

  const agregarVencimientoIndividual = async () => {
    if (!idClienteNuevo || !idObligacionNueva) {
      toast.error("Seleccione cliente y obligación.")
      return
    }
    establecerGuardando(true)
    try {
      const ultimoDia = new Date(
        anioSeleccionado,
        mesSeleccionado,
        0
      ).getDate()
      const obligacion = listaObligaciones.find(
        (item) => item.id === idObligacionNueva
      )
      const diaVencimiento = Math.min(obligacion?.day_of_month ?? 1, ultimoDia)
      const { error: errorInsercion } = await baseDeDatos
        .from("deadline_tasks")
        .upsert(
          {
            client_id: idClienteNuevo,
            obligation_id: idObligacionNueva,
            period_year: anioSeleccionado,
            period_month: mesSeleccionado,
            due_date: construirFechaIso(
              anioSeleccionado,
              mesSeleccionado,
              diaVencimiento
            ),
          },
          {
            onConflict: "client_id,obligation_id,period_year,period_month",
            ignoreDuplicates: true,
          }
        )
      if (errorInsercion) {
        toast.error(
          "No se pudo agregar el vencimiento: " + errorInsercion.message
        )
        return
      }
      toast.success("Vencimiento agregado")
      establecerDialogoAbierto(false)
      establecerIdClienteNuevo("")
      establecerIdObligacionNueva("")
      void cargarTareasCalendario()
    } finally {
      establecerGuardando(false)
    }
  }

  const cambiarEstadoVencimiento = async (
    tarea: TareaCalendario,
    nuevoEstado: EstadoTarea
  ) => {
    if (nuevoEstado === tarea.status) return
    const { error } = await baseDeDatos
      .from("deadline_tasks")
      .update({ status: nuevoEstado })
      .eq("id", tarea.id)
    if (error) {
      toast.error("No se pudo actualizar el estado: " + error.message)
      return
    }
    establecerListaTareas((previas) =>
      previas.map((item) =>
        item.id === tarea.id ? { ...item, status: nuevoEstado } : item
      )
    )
    toast.success("Estado actualizado")
  }

  const exportarCalendarioCsv = () => {
    if (tareasDelMes.length === 0) {
      toast.error("No hay vencimientos para exportar en este mes.")
      return
    }
    descargarArchivoCsv(
      `vencimientos-${anioSeleccionado}-${String(mesSeleccionado).padStart(2, "0")}.csv`,
      ["Fecha", "Cliente", "Obligación", "Estado"],
      tareasDelMes.map((tarea) => [
        tarea.due_date,
        tarea.nombreCliente,
        tarea.nombreObligacion,
        tarea.status.replace("_", " "),
      ])
    )
    toast.success("Archivo CSV descargado")
  }

  const eliminarVencimiento = async (tarea: TareaCalendario) => {
    const { error } = await baseDeDatos
      .from("deadline_tasks")
      .delete()
      .eq("id", tarea.id)
    if (error) {
      toast.error("No se pudo eliminar el vencimiento: " + error.message)
      return
    }
    toast.success("Vencimiento eliminado")
    void cargarTareasCalendario()
  }

  return (
    <div>
      <EncabezadoPagina
        titulo="Calendario"
        descripcion="Fechas límite y vencimientos de obligaciones por mes."
        acciones={
          <>
            <Button variant="outline" onClick={exportarCalendarioCsv}>
              <Download className="size-4" />
              Exportar CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => void generarVencimientosDelMes()}
              disabled={guardando}
            >
              {guardando && <Loader2 className="size-4 animate-spin" />}
              Generar mes
            </Button>
            <Button onClick={() => establecerDialogoAbierto(true)}>
              <Plus className="size-4" />
              Agregar vencimiento
            </Button>
          </>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={irMesAnterior}
          title="Mes anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <h3 className="min-w-40 text-center text-lg font-semibold">
          {NOMBRES_MESES[mesSeleccionado - 1]} {anioSeleccionado}
        </h3>
        <Button
          variant="outline"
          size="icon"
          onClick={irMesSiguiente}
          title="Mes siguiente"
        >
          <ChevronRight className="size-4" />
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" /> Pendiente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-blue-500" /> En proceso
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" /> Completado
          </span>
        </div>
      </div>

      {cargando && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Cargando calendario…
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
        <>
          <Card>
            <CardContent className="p-2 sm:p-4">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
                {DIAS_SEMANA_CORTOS.map((diaSemana) => (
                  <div key={diaSemana} className="py-1">
                    {diaSemana}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {celdasDiasMes.map((diaNumero, indice) => {
                  if (diaNumero === null)
                    return <div key={indice} className="min-h-16 rounded-md" />
                  const claveFecha = construirFechaIso(
                    anioSeleccionado,
                    mesSeleccionado,
                    diaNumero
                  )
                  const tareasDelDia = mapaTareasPorDia.get(claveFecha) ?? []
                  const fechaHoy = fechaHoyIso()
                  const esHoy = claveFecha === fechaHoy
                  const esPasado = claveFecha < fechaHoy
                  return (
                    <div
                      key={indice}
                      className={`min-h-16 rounded-md border p-1 sm:min-h-24 sm:p-2 ${
                        esHoy ? "border-primary bg-primary/5" : ""
                      } ${esPasado && tareasDelDia.some((tarea) => tarea.status !== "completado") ? "bg-destructive/5" : ""}`}
                    >
                      <span
                        className={`text-xs ${esHoy ? "font-bold text-primary" : "text-muted-foreground"}${esPasado && tareasDelDia.some((tarea) => tarea.status !== "completado") ? " text-destructive" : ""}`}
                      >
                        {diaNumero}
                      </span>
                      <div className="mt-1 space-y-1">
                        {tareasDelDia.slice(0, 3).map((tarea) => (
                          <div
                            key={tarea.id}
                            className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] sm:text-xs"
                            title={`${tarea.nombreObligacion} — ${tarea.nombreCliente} (${tarea.status})`}
                          >
                            <span
                              className={`size-1.5 shrink-0 rounded-full ${COLOR_PUNTO_ESTADO_TAREA[tarea.status]}`}
                            />
                            <span className="truncate">
                              {tarea.nombreCliente}
                            </span>
                          </div>
                        ))}
                        {tareasDelDia.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{tareasDelDia.length - 3} más
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent className="py-4">
              <h4 className="mb-2 text-sm font-medium">
                Vencimientos de {NOMBRES_MESES[mesSeleccionado - 1]} (
                {tareasDelMes.length})
              </h4>
              {tareasDelMes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin vencimientos este mes. Use "Generar mes" para crear los
                  habituales o "Agregar vencimiento" para uno puntual.
                </p>
              ) : (
                <div className="space-y-1">
                  {tareasDelMes.map((tarea) => (
                    <div
                      key={tarea.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span
                        className={`size-2 shrink-0 rounded-full ${COLOR_PUNTO_ESTADO_TAREA[tarea.status]}`}
                      />
                      <span className="text-muted-foreground">
                        {formatearFecha(tarea.due_date)}
                      </span>
                      <span className="font-medium">
                        {tarea.nombreObligacion}
                      </span>
                      <span className="text-muted-foreground">
                        · {tarea.nombreCliente}
                      </span>
                      <Select
                        value={tarea.status}
                        onValueChange={(valor) =>
                          void cambiarEstadoVencimiento(
                            tarea,
                            valor as EstadoTarea
                          )
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          className="ml-auto h-7 w-32 capitalize"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="en_proceso">En proceso</SelectItem>
                          <SelectItem value="completado">Completado</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        title="Eliminar vencimiento"
                        onClick={() => void eliminarVencimiento(tarea)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={dialogoAbierto} onOpenChange={establecerDialogoAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar vencimiento</DialogTitle>
            <DialogDescription>
              Se creará para {NOMBRES_MESES[mesSeleccionado - 1]}{" "}
              {anioSeleccionado}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={idClienteNuevo}
                onValueChange={establecerIdClienteNuevo}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {listaClientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.legal_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Obligación</Label>
              <Select
                value={idObligacionNueva}
                onValueChange={establecerIdObligacionNueva}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione una obligación" />
                </SelectTrigger>
                <SelectContent>
                  {listaObligaciones.map((obligacion) => (
                    <SelectItem key={obligacion.id} value={obligacion.id}>
                      {obligacion.name} (día {obligacion.day_of_month})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => establecerDialogoAbierto(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void agregarVencimientoIndividual()}
              disabled={guardando}
            >
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const CalendarPage = PaginaCalendario

