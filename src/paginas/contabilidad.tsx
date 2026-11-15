import * as React from "react"
import {
  BookOpen,
  Calculator,
  Landmark,
  Loader2,
  Plus,
  Trash2,
  Wallet2,
} from "lucide-react"
import { toast } from "sonner"

import { EncabezadoPagina } from "@/componentes/encabezado-pagina"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  ETIQUETAS_ESTADO_CONTABILIDAD,
  ETIQUETAS_TIPO_TAREA_CONTABLE,
  PLANTILLA_CONTABILIDAD_POST_DIA_10,
} from "@/configuracion/parametros-sistema"
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import type {
  TipoTareaContable,
  EstadoTareaContable,
} from "@/utilidades/tipos"

type FilaContabilidad = {
  id: string
  client_id: string | null
  period_year: number
  period_month: number
  task_type: TipoTareaContable
  target_name: string
  status: EstadoTareaContable
  assigned_to: string | null
  completed_at: string | null
  notes: string | null
}

type ClienteResumido = { id: string; legal_name: string }
type ColaboradorResumido = { id: string; name: string }

const ICONOS_TIPO_TAREA: Record<
  TipoTareaContable,
  React.ComponentType<{ className?: string }>
> = {
  posteo_excel: Calculator,
  conciliacion: Landmark,
  caja_chica: Wallet2,
  libros: BookOpen,
  quickbooks: BookOpen,
}

function obtenerColorEstadoContabilidad(estado: EstadoTareaContable): string {
  switch (estado) {
    case "revisada":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
    case "completada":
      return "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
    case "en_proceso":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
    default:
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
  }
}

export function PaginaContabilidad() {
  const fechaActual = new Date()
  const [anioSeleccionado, establecerAnioSeleccionado] = React.useState(
    fechaActual.getFullYear()
  )
  const [mesSeleccionado, establecerMesSeleccionado] = React.useState(
    fechaActual.getMonth() + 1
  )

  const [filasContabilidad, establecerFilasContabilidad] = React.useState<
    FilaContabilidad[]
  >([])
  const [listaClientes, establecerListaClientes] = React.useState<
    ClienteResumido[]
  >([])
  const [listaPersonal, establecerListaPersonal] = React.useState<
    ColaboradorResumido[]
  >([])
  const [cargando, establecerCargando] = React.useState(true)
  const [mensajeError, establecerMensajeError] = React.useState<string | null>(
    null
  )

  const [idClienteNuevo, establecerIdClienteNuevo] = React.useState("none")
  const [conPlantillaCompleta, establecerConPlantillaCompleta] =
    React.useState(true)
  const [agregando, establecerAgregando] = React.useState(false)

  const cargarControlContable = React.useCallback(async () => {
    establecerCargando(true)
    const [respuestaFilas, respuestaClientes, respuestaPersonal] =
      await Promise.all([
        baseDeDatos
          .from("accounting_tasks")
          .select("*")
          .eq("period_year", anioSeleccionado)
          .eq("period_month", mesSeleccionado)
          .order("task_type")
          .order("target_name"),
        baseDeDatos
          .from("clients")
          .select("id, legal_name")
          .eq("status", "activo")
          .order("legal_name"),
        baseDeDatos
          .from("profiles")
          .select("id, name")
          .eq("active", true)
          .order("name"),
      ])
    if (
      respuestaFilas.error ||
      respuestaClientes.error ||
      respuestaPersonal.error
    ) {
      establecerMensajeError("No se pudo cargar el control contable.")
      establecerFilasContabilidad([])
    } else {
      establecerFilasContabilidad(respuestaFilas.data ?? [])
      establecerListaClientes(respuestaClientes.data ?? [])
      establecerListaPersonal(respuestaPersonal.data ?? [])
      establecerMensajeError(null)
    }
    establecerCargando(false)
  }, [anioSeleccionado, mesSeleccionado])

  React.useEffect(() => {
    void cargarControlContable()
  }, [cargarControlContable])

  const actualizarFilaContabilidad = async (
    fila: FilaContabilidad,
    cambios: Partial<FilaContabilidad>
  ) => {
    const filasPrevias = filasContabilidad
    establecerFilasContabilidad((actuales) =>
      actuales.map((item) =>
        item.id === fila.id ? { ...fila, ...cambios } : item
      )
    )
    const { error } = await baseDeDatos
      .from("accounting_tasks")
      .update(cambios)
      .eq("id", fila.id)
    if (error) {
      toast.error("No se pudo guardar el cambio: " + error.message)
      establecerFilasContabilidad(filasPrevias)
    }
  }

  const cargarTareasCliente = async () => {
    if (idClienteNuevo === "none") {
      toast.error("Selecciona el cliente.")
      return
    }
    establecerAgregando(true)
    const registrosAInsertar = conPlantillaCompleta
      ? PLANTILLA_CONTABILIDAD_POST_DIA_10.map((plantilla) => ({
          client_id: idClienteNuevo,
          period_year: anioSeleccionado,
          period_month: mesSeleccionado,
          task_type: plantilla.task_type,
          target_name: plantilla.target_name,
        }))
      : [
          {
            client_id: idClienteNuevo,
            period_year: anioSeleccionado,
            period_month: mesSeleccionado,
            task_type: "posteo_excel" as TipoTareaContable,
            target_name: "Gastos del Excel al sistema",
          },
        ]
    const { error } = await baseDeDatos
      .from("accounting_tasks")
      .upsert(registrosAInsertar, {
        onConflict: "client_id,period_year,period_month,task_type,target_name",
        ignoreDuplicates: true,
      })
    if (error) {
      toast.error(
        "No se pudo agregar (algunas tareas ya pueden existir): " +
          error.message
      )
    } else {
      toast.success(
        conPlantillaCompleta
          ? "Checklist contable completo cargado."
          : "Tarea agregada."
      )
      establecerIdClienteNuevo("none")
      void cargarControlContable()
    }
    establecerAgregando(false)
  }

  const agregarTareaGlobal = async () => {
    establecerAgregando(true)
    const { error } = await baseDeDatos.from("accounting_tasks").insert({
      client_id: null,
      period_year: anioSeleccionado,
      period_month: mesSeleccionado,
      task_type: "caja_chica",
      target_name: "Tarea global del mes",
    })
    if (error) {
      toast.error("No se pudo agregar: " + error.message)
    } else {
      toast.success("Tarea global agregada.")
      void cargarControlContable()
    }
    establecerAgregando(false)
  }

  const eliminarFilaContabilidad = async (fila: FilaContabilidad) => {
    const filasPrevias = filasContabilidad
    establecerFilasContabilidad((actuales) =>
      actuales.filter((item) => item.id !== fila.id)
    )
    const { error } = await baseDeDatos
      .from("accounting_tasks")
      .delete()
      .eq("id", fila.id)
    if (error) {
      toast.error("No se pudo eliminar: " + error.message)
      establecerFilasContabilidad(filasPrevias)
    }
  }

  const obtenerNombreCliente = (idCliente: string | null) =>
    idCliente
      ? (listaClientes.find((cliente) => cliente.id === idCliente)
          ?.legal_name ?? "—")
      : "General (todos los clientes)"

  const cantidadCompletadas = filasContabilidad.filter(
    (fila) => fila.status === "completada" || fila.status === "revisada"
  ).length
  const porcentajeAvance =
    filasContabilidad.length > 0
      ? Math.round((cantidadCompletadas / filasContabilidad.length) * 100)
      : 0

  const gruposPorTipo = (
    Object.keys(ETIQUETAS_TIPO_TAREA_CONTABLE) as TipoTareaContable[]
  ).map((tipo) => ({
    tipo,
    filas: filasContabilidad.filter((fila) => fila.task_type === tipo),
  }))

  return (
    <div>
      <EncabezadoPagina
        titulo="Contabilidad Post-Día 10"
        descripcion="Posteo de gastos, conciliaciones bancarias, caja chica, libros legales y QuickBooks. Responsable: María."
      />

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">
              Cargar checklist contable para
            </Label>
            <Select
              value={idClienteNuevo}
              onValueChange={establecerIdClienteNuevo}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Seleccionar cliente</SelectItem>
                {listaClientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.legal_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => void cargarTareasCliente()}
            disabled={agregando}
          >
            {agregando ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Plus className="mr-2 size-4" />
            )}
            {conPlantillaCompleta
              ? "Cargar checklist completo"
              : "Cargar solo posteo"}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              establecerConPlantillaCompleta((valorPrevio) => !valorPrevio)
            }
          >
            {conPlantillaCompleta ? "Incluye: todo" : "Incluye: solo posteo"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => void agregarTareaGlobal()}
            disabled={agregando}
          >
            Tarea global
          </Button>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          value={String(mesSeleccionado)}
          onValueChange={(valor) => establecerMesSeleccionado(Number(valor))}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOMBRES_MESES.map((nombreMes, indice) => (
              <SelectItem key={nombreMes} value={String(indice + 1)}>
                {nombreMes}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          value={anioSeleccionado}
          onChange={(evento) =>
            establecerAnioSeleccionado(Number(evento.target.value))
          }
          className="w-full sm:w-24"
        />
        <div className="flex flex-1 items-center gap-2 sm:justify-end">
          <div className="h-2 w-full max-w-48 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${porcentajeAvance}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {porcentajeAvance}%
          </span>
          <Badge variant="secondary">
            {cantidadCompletadas}/{filasContabilidad.length} hechas
          </Badge>
        </div>
      </div>

      {cargando && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Cargando control contable…
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
        <div className="space-y-4">
          {gruposPorTipo.map(({ tipo, filas: filasDelTipo }) =>
            filasDelTipo.length > 0 ? (
              <Card key={tipo}>
                <CardContent className="py-4">
                  <div className="mb-3 flex items-center gap-2">
                    {React.createElement(ICONOS_TIPO_TAREA[tipo], {
                      className: "size-4 text-muted-foreground",
                    })}
                    <span className="font-medium">
                      {ETIQUETAS_TIPO_TAREA_CONTABLE[tipo]}
                    </span>
                    <Badge variant="outline" className="ml-auto">
                      {
                        filasDelTipo.filter(
                          (item) =>
                            item.status === "completada" ||
                            item.status === "revisada"
                        ).length
                      }
                      /{filasDelTipo.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {filasDelTipo.map((fila) => (
                      <div
                        key={fila.id}
                        className="flex flex-col gap-2 rounded-lg border p-2 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {fila.target_name}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              {obtenerNombreCliente(fila.client_id)}
                            </span>
                          </p>
                          {fila.notes && (
                            <p className="truncate text-xs text-muted-foreground">
                              {fila.notes}
                            </p>
                          )}
                        </div>
                        <Select
                          value={fila.status}
                          onValueChange={(valor) =>
                            void actualizarFilaContabilidad(fila, {
                              status: valor as EstadoTareaContable,
                              completed_at:
                                valor === "completada" || valor === "revisada"
                                  ? (fila.completed_at ??
                                    new Date().toISOString().slice(0, 10))
                                  : null,
                            })
                          }
                        >
                          <SelectTrigger
                            size="sm"
                            className={`h-7 w-32 shrink-0 ${obtenerColorEstadoContabilidad(fila.status)}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ETIQUETAS_ESTADO_CONTABILIDAD).map(
                              ([clave, etiqueta]) => (
                                <SelectItem key={clave} value={clave}>
                                  {etiqueta}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <Select
                          value={fila.assigned_to ?? "none"}
                          onValueChange={(valor) =>
                            void actualizarFilaContabilidad(fila, {
                              assigned_to: valor === "none" ? null : valor,
                            })
                          }
                        >
                          <SelectTrigger
                            size="sm"
                            className="h-7 w-36 shrink-0"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin asignar</SelectItem>
                            {listaPersonal.map((colaborador) => (
                              <SelectItem
                                key={colaborador.id}
                                value={colaborador.id}
                              >
                                {colaborador.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                          title="Eliminar"
                          onClick={() => void eliminarFilaContabilidad(fila)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null
          )}
          {filasContabilidad.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                <Calculator className="size-8" />
                <p className="text-sm">
                  Sin tareas contables para este período. Carga el checklist
                  completo de un cliente para empezar.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export const AccountingPage = PaginaContabilidad

