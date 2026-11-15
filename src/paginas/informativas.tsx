import * as React from "react"
import { Bell, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { EncabezadoPagina } from "@/componentes/encabezado-pagina"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
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
  NOMBRES_MESES,
  ETIQUETAS_ESTADO_INFORMATIVA,
} from "@/configuracion/parametros-sistema"
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import { formatearFecha } from "@/utilidades/fechas"
import type { EstadoTareaInformativa } from "@/utilidades/tipos"

type FilaInformativa = {
  id: string
  client_id: string
  obligation_id: string
  period_year: number
  period_month: number
  applies: boolean
  due_date: string
  status: EstadoTareaInformativa
  responsible_user_id: string | null
  notes: string | null
}

type ClienteResumido = { id: string; legal_name: string }
type ObligacionInformativaResumida = { id: string; name: string }
type ColaboradorResumido = { id: string; name: string }

function obtenerColorEstadoInformativa(estado: EstadoTareaInformativa): string {
  if (estado === "listo") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
  }
  if (estado === "en_proceso") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
  }
  return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
}

export function PaginaInformativas() {
  const fechaActual = new Date()
  const [anioSeleccionado, establecerAnioSeleccionado] = React.useState(
    fechaActual.getFullYear()
  )
  const [mesSeleccionado, establecerMesSeleccionado] = React.useState(
    fechaActual.getMonth() + 1
  )

  const [filasInformativas, establecerFilasInformativas] = React.useState<
    FilaInformativa[]
  >([])
  const [listaClientes, establecerListaClientes] = React.useState<
    ClienteResumido[]
  >([])
  const [listaObligaciones, establecerListaObligaciones] = React.useState<
    ObligacionInformativaResumida[]
  >([])
  const [listaPersonal, establecerListaPersonal] = React.useState<
    ColaboradorResumido[]
  >([])
  const [cargando, establecerCargando] = React.useState(true)
  const [mensajeError, establecerMensajeError] = React.useState<string | null>(
    null
  )

  const [idClienteNuevo, establecerIdClienteNuevo] = React.useState("none")
  const [idObligacionNueva, establecerIdObligacionNueva] =
    React.useState("none")
  const [idResponsableNuevo, establecerIdResponsableNuevo] =
    React.useState("none")
  const [agregando, establecerAgregando] = React.useState(false)
  const [generandoMatriz, establecerGenerandoMatriz] = React.useState(false)

  const cargarDatosInformativas = React.useCallback(async () => {
    establecerCargando(true)
    const [
      respuestaFilas,
      respuestaClientes,
      respuestaObligaciones,
      respuestaPersonal,
    ] = await Promise.all([
      baseDeDatos
        .from("informative_tasks")
        .select("*")
        .eq("period_year", anioSeleccionado)
        .eq("period_month", mesSeleccionado)
        .order("created_at"),
      baseDeDatos
        .from("clients")
        .select("id, legal_name")
        .eq("status", "activo")
        .order("legal_name"),
      baseDeDatos
        .from("informative_obligations")
        .select("id, name")
        .eq("active", true)
        .order("name"),
      baseDeDatos
        .from("profiles")
        .select("id, name")
        .eq("active", true)
        .order("name"),
    ])
    if (
      respuestaFilas.error ||
      respuestaClientes.error ||
      respuestaObligaciones.error ||
      respuestaPersonal.error
    ) {
      establecerMensajeError("No se pudieron cargar los datos de informativas.")
      establecerFilasInformativas([])
    } else {
      establecerFilasInformativas(respuestaFilas.data ?? [])
      establecerListaClientes(respuestaClientes.data ?? [])
      establecerListaObligaciones(respuestaObligaciones.data ?? [])
      establecerListaPersonal(respuestaPersonal.data ?? [])
      establecerMensajeError(null)
    }
    establecerCargando(false)
  }, [anioSeleccionado, mesSeleccionado])

  React.useEffect(() => {
    void cargarDatosInformativas()
  }, [cargarDatosInformativas])

  const actualizarFilaInformativa = async (
    fila: FilaInformativa,
    cambios: Partial<FilaInformativa>
  ) => {
    const filasPrevias = filasInformativas
    establecerFilasInformativas((actuales) =>
      actuales.map((item) =>
        item.id === fila.id ? { ...fila, ...cambios } : item
      )
    )
    const { error } = await baseDeDatos
      .from("informative_tasks")
      .update(cambios)
      .eq("id", fila.id)
    if (error) {
      toast.error("No se pudo guardar el cambio: " + error.message)
      establecerFilasInformativas(filasPrevias)
    }
  }

  const agregarFilaInformativa = async () => {
    if (idClienteNuevo === "none" || idObligacionNueva === "none") {
      toast.error("Selecciona el cliente y la obligación informativa.")
      return
    }
    establecerAgregando(true)
    const fechaLimiteDia10 = `${anioSeleccionado}-${String(mesSeleccionado).padStart(2, "0")}-10`
    const nuevoRegistro = {
      client_id: idClienteNuevo,
      obligation_id: idObligacionNueva,
      period_year: anioSeleccionado,
      period_month: mesSeleccionado,
      due_date: fechaLimiteDia10,
      responsible_user_id:
        idResponsableNuevo === "none" ? null : idResponsableNuevo,
    }
    const { error } = await baseDeDatos
      .from("informative_tasks")
      .insert(nuevoRegistro)
    if (error) {
      if (error.code === "23505") {
        toast.error(
          "Esa obligación ya está registrada para este cliente y período."
        )
      } else {
        toast.error("No se pudo agregar: " + error.message)
      }
    } else {
      toast.success("Obligación informativa agregada.")
      establecerIdClienteNuevo("none")
      establecerIdObligacionNueva("none")
      void cargarDatosInformativas()
    }
    establecerAgregando(false)
  }

  const eliminarFilaInformativa = async (fila: FilaInformativa) => {
    const filasPrevias = filasInformativas
    establecerFilasInformativas((actuales) =>
      actuales.filter((item) => item.id !== fila.id)
    )
    const { error } = await baseDeDatos
      .from("informative_tasks")
      .delete()
      .eq("id", fila.id)
    if (error) {
      toast.error("No se pudo eliminar: " + error.message)
      establecerFilasInformativas(filasPrevias)
    }
  }

  const generarMatrizDelMes = async () => {
    if (listaClientes.length === 0 || listaObligaciones.length === 0) {
      toast.error(
        "No hay clientes u obligaciones informativas activas para generar."
      )
      return
    }
    establecerGenerandoMatriz(true)
    const fechaLimiteDia10 = `${anioSeleccionado}-${String(mesSeleccionado).padStart(2, "0")}-10`
    const loteRegistros = listaClientes.flatMap((cliente) =>
      listaObligaciones.map((obligacion) => ({
        client_id: cliente.id,
        obligation_id: obligacion.id,
        period_year: anioSeleccionado,
        period_month: mesSeleccionado,
        applies: true,
        due_date: fechaLimiteDia10,
        status: "pendiente" as EstadoTareaInformativa,
      }))
    )
    const { error } = await baseDeDatos
      .from("informative_tasks")
      .upsert(loteRegistros, {
        onConflict: "client_id,obligation_id,period_year,period_month",
        ignoreDuplicates: true,
      })
    establecerGenerandoMatriz(false)
    if (error) {
      toast.error("No se pudo generar la matriz del mes: " + error.message)
      return
    }
    toast.success("Matriz mensual de informativas generada")
    void cargarDatosInformativas()
  }

  const obtenerNombreCliente = (idCliente: string) =>
    listaClientes.find((cliente) => cliente.id === idCliente)?.legal_name ?? "—"
  const obtenerNombreObligacion = (idObligacion: string) =>
    listaObligaciones.find((obligacion) => obligacion.id === idObligacion)
      ?.name ?? "—"

  const filasQueAplican = filasInformativas.filter(
    (fila) => fila.applies !== false
  )
  const cantidadListas = filasQueAplican.filter(
    (fila) => fila.status === "listo"
  ).length
  const cantidadPendientes = filasQueAplican.length - cantidadListas

  return (
    <div>
      <EncabezadoPagina
        titulo="Informativas"
        descripcion="Control maestro de obligaciones informativas: salarios, 12.5%, 1% y dividendos. Vencen el día 10."
        acciones={
          <Button
            variant="outline"
            onClick={() => void generarMatrizDelMes()}
            disabled={generandoMatriz}
          >
            {generandoMatriz ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Plus className="mr-2 size-4" />
            )}
            Generar matriz del mes
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Cliente</label>
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
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Obligación</label>
            <Select
              value={idObligacionNueva}
              onValueChange={establecerIdObligacionNueva}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Seleccionar obligación</SelectItem>
                {listaObligaciones.map((obligacion) => (
                  <SelectItem key={obligacion.id} value={obligacion.id}>
                    {obligacion.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Responsable</label>
            <Select
              value={idResponsableNuevo}
              onValueChange={establecerIdResponsableNuevo}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {listaPersonal.map((colaborador) => (
                  <SelectItem key={colaborador.id} value={colaborador.id}>
                    {colaborador.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => void agregarFilaInformativa()}
            disabled={agregando}
          >
            {agregando ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Plus className="mr-2 size-4" />
            )}
            Agregar
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
        <div className="flex gap-2 text-sm sm:ml-auto">
          <Badge variant="outline">{cantidadPendientes} pendientes</Badge>
          <Badge variant="secondary">{cantidadListas} listas</Badge>
        </div>
      </div>

      {cargando && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Cargando informativas…
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
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Obligación</TableHead>
                  <TableHead className="text-center">Aplica</TableHead>
                  <TableHead>Fecha límite</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filasInformativas.map((fila) => (
                  <TableRow
                    key={fila.id}
                    className={fila.applies === false ? "opacity-50" : ""}
                  >
                    <TableCell className="font-medium">
                      {obtenerNombreCliente(fila.client_id)}
                    </TableCell>
                    <TableCell>
                      {obtenerNombreObligacion(fila.obligation_id)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={fila.applies !== false}
                        onCheckedChange={(valor) =>
                          void actualizarFilaInformativa(fila, {
                            applies: valor === true,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>{formatearFecha(fila.due_date)}</TableCell>
                    <TableCell>
                      {fila.applies === false ? (
                        <Badge variant="outline" className="text-xs">
                          No aplica
                        </Badge>
                      ) : (
                        <Select
                          value={fila.status}
                          onValueChange={(valor) =>
                            void actualizarFilaInformativa(fila, {
                              status: valor as EstadoTareaInformativa,
                            })
                          }
                        >
                          <SelectTrigger
                            size="sm"
                            className={`h-7 w-32 border-0 ${obtenerColorEstadoInformativa(fila.status)}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ETIQUETAS_ESTADO_INFORMATIVA).map(
                              ([clave, etiqueta]) => (
                                <SelectItem key={clave} value={clave}>
                                  {etiqueta}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={fila.responsible_user_id ?? "none"}
                        onValueChange={(valor) =>
                          void actualizarFilaInformativa(fila, {
                            responsible_user_id:
                              valor === "none" ? null : valor,
                          })
                        }
                      >
                        <SelectTrigger size="sm" className="h-7 w-40">
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
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        title="Eliminar"
                        onClick={() => void eliminarFilaInformativa(fila)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filasInformativas.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-muted-foreground"
                    >
                      <Bell className="mx-auto mb-2 size-6" />
                      Sin obligaciones informativas registradas para este
                      período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export const InformativePage = PaginaInformativas

