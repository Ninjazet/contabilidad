import * as React from "react"
import { Bus, Loader2, MapPin, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { EncabezadoPagina } from "@/componentes/encabezado-pagina"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
  ETIQUETAS_ESTADO_VISITA,
} from "@/configuracion/parametros-sistema"
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import { aFechaIso } from "@/utilidades/fechas"
import type { EstadoVisitaQuimistan } from "@/utilidades/tipos"

type FilaVisitaQuimistan = {
  id: string
  client_id: string
  period_year: number
  period_month: number
  visit_date: string
  notified_at: string | null
  visit_time: string | null
  documents_received: string | null
  received_by: string | null
  client_signed_name: string | null
  signed_at: string | null
  disclaimer_sent: boolean
  disclaimer_sent_at: string | null
  status: EstadoVisitaQuimistan
  notes: string | null
}

type ClienteResumido = { id: string; legal_name: string }
type ColaboradorResumido = { id: string; name: string }

function obtenerColorEstadoVisita(estado: EstadoVisitaQuimistan): string {
  switch (estado) {
    case "completa":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
    case "realizada":
      return "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
    case "notificada":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function construirDiaDelMes(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
}

export function PaginaVisitasQuimistan() {
  const fechaActual = new Date()
  const [anioSeleccionado, establecerAnioSeleccionado] = React.useState(
    fechaActual.getFullYear()
  )
  const [mesSeleccionado, establecerMesSeleccionado] = React.useState(
    fechaActual.getMonth() + 1
  )

  const [filasVisitas, establecerFilasVisitas] = React.useState<
    FilaVisitaQuimistan[]
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
  const [agregando, establecerAgregando] = React.useState(false)

  const cargarVisitasQuimistan = React.useCallback(async () => {
    establecerCargando(true)
    const [respuestaVisitas, respuestaClientes, respuestaPersonal] =
      await Promise.all([
        baseDeDatos
          .from("quimistan_visits")
          .select("*")
          .eq("period_year", anioSeleccionado)
          .eq("period_month", mesSeleccionado)
          .order("created_at"),
        baseDeDatos
          .from("clients")
          .select("id, legal_name")
          .eq("is_quimistan", true)
          .eq("status", "activo")
          .order("legal_name"),
        baseDeDatos
          .from("profiles")
          .select("id, name")
          .eq("active", true)
          .order("name"),
      ])
    if (
      respuestaVisitas.error ||
      respuestaClientes.error ||
      respuestaPersonal.error
    ) {
      establecerMensajeError("No se pudo cargar el control de visitas.")
      establecerFilasVisitas([])
    } else {
      establecerFilasVisitas(respuestaVisitas.data ?? [])
      establecerListaClientes(respuestaClientes.data ?? [])
      establecerListaPersonal(respuestaPersonal.data ?? [])
      establecerMensajeError(null)
    }
    establecerCargando(false)
  }, [anioSeleccionado, mesSeleccionado])

  React.useEffect(() => {
    void cargarVisitasQuimistan()
  }, [cargarVisitasQuimistan])

  const actualizarFilaVisita = async (
    fila: FilaVisitaQuimistan,
    cambios: Partial<FilaVisitaQuimistan>
  ) => {
    const filasPrevias = filasVisitas
    establecerFilasVisitas((actuales) =>
      actuales.map((item) =>
        item.id === fila.id ? { ...fila, ...cambios } : item
      )
    )
    const { error } = await baseDeDatos
      .from("quimistan_visits")
      .update(cambios)
      .eq("id", fila.id)
    if (error) {
      toast.error("No se pudo guardar el cambio: " + error.message)
      establecerFilasVisitas(filasPrevias)
    }
  }

  const programarNuevaVisita = async () => {
    if (idClienteNuevo === "none") {
      toast.error("Selecciona el cliente de Quimistán.")
      return
    }
    establecerAgregando(true)
    const { error } = await baseDeDatos.from("quimistan_visits").insert({
      client_id: idClienteNuevo,
      period_year: anioSeleccionado,
      period_month: mesSeleccionado,
      visit_date: construirDiaDelMes(anioSeleccionado, mesSeleccionado, 5),
    })
    if (error) {
      if (error.code === "23505") {
        toast.error(
          "Ese cliente ya tiene una visita programada en este período."
        )
      } else {
        toast.error("No se pudo agregar: " + error.message)
      }
    } else {
      toast.success("Visita programada para el día 5.")
      establecerIdClienteNuevo("none")
      void cargarVisitasQuimistan()
    }
    establecerAgregando(false)
  }

  const eliminarVisita = async (fila: FilaVisitaQuimistan) => {
    const filasPrevias = filasVisitas
    establecerFilasVisitas((actuales) =>
      actuales.filter((item) => item.id !== fila.id)
    )
    const { error } = await baseDeDatos
      .from("quimistan_visits")
      .delete()
      .eq("id", fila.id)
    if (error) {
      toast.error("No se pudo eliminar: " + error.message)
      establecerFilasVisitas(filasPrevias)
    }
  }

  const obtenerNombreCliente = (idCliente: string) =>
    listaClientes.find((cliente) => cliente.id === idCliente)?.legal_name ?? "—"

  const cantidadCompletas = filasVisitas.filter(
    (fila) => fila.status === "completa"
  ).length
  const pendientesDeslinde = filasVisitas.filter(
    (fila) => !fila.disclaimer_sent && fila.status !== "completa"
  ).length

  return (
    <div>
      <EncabezadoPagina
        titulo="Visitas Quimistán"
        descripcion="Notificación previa (días 3-4), visita de recolección (día 5) con control de firma, y deslinde de responsabilidad (día 6) si no se recibió la información."
      />

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">
              Programar visita para cliente de Quimistán
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
                {listaClientes
                  .filter(
                    (cliente) =>
                      !filasVisitas.some(
                        (fila) => fila.client_id === cliente.id
                      )
                  )
                  .map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.legal_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => void programarNuevaVisita()}
            disabled={agregando}
          >
            {agregando ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Plus className="mr-2 size-4" />
            )}
            Programar visita
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
          <Badge variant="outline">{filasVisitas.length} visitas</Badge>
          <Badge variant="secondary">{cantidadCompletas} completas</Badge>
          {pendientesDeslinde > 0 && (
            <Badge variant="destructive">
              {pendientesDeslinde} sin deslinde
            </Badge>
          )}
        </div>
      </div>

      {cargando && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Cargando visitas…
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
        <div className="space-y-3">
          {filasVisitas.map((fila) => (
            <Card key={fila.id}>
              <CardContent className="py-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  <span className="font-medium">
                    {obtenerNombreCliente(fila.client_id)}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${obtenerColorEstadoVisita(fila.status)}`}
                  >
                    {ETIQUETAS_ESTADO_VISITA[fila.status]}
                  </span>
                  {fila.disclaimer_sent && (
                    <Badge variant="destructive">Deslinde enviado</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto size-7 text-muted-foreground hover:text-destructive"
                    title="Eliminar visita"
                    onClick={() => void eliminarVisita(fila)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Notificado por WhatsApp
                    </Label>
                    <Input
                      type="date"
                      className="h-8"
                      value={aFechaIso(fila.notified_at)}
                      onChange={(evento) =>
                        void actualizarFilaVisita(fila, {
                          notified_at: evento.target.value || null,
                          status:
                            evento.target.value && fila.status === "programada"
                              ? "notificada"
                              : fila.status,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Fecha de visita
                    </Label>
                    <Input
                      type="date"
                      className="h-8"
                      value={aFechaIso(fila.visit_date)}
                      onChange={(evento) =>
                        void actualizarFilaVisita(fila, {
                          visit_date: evento.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Hora
                    </Label>
                    <Input
                      className="h-8"
                      placeholder="09:30"
                      value={fila.visit_time ?? ""}
                      onChange={(evento) =>
                        establecerFilasVisitas((actuales) =>
                          actuales.map((item) =>
                            item.id === fila.id
                              ? { ...item, visit_time: evento.target.value }
                              : item
                          )
                        )
                      }
                      onBlur={(evento) =>
                        void actualizarFilaVisita(fila, {
                          visit_time: evento.target.value || null,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Realizada por
                    </Label>
                    <Select
                      value={fila.received_by ?? "none"}
                      onValueChange={(valor) =>
                        void actualizarFilaVisita(fila, {
                          received_by: valor === "none" ? null : valor,
                        })
                      }
                    >
                      <SelectTrigger size="sm" className="h-8">
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
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">
                      Documentos recibidos
                    </Label>
                    <Input
                      className="h-8"
                      placeholder="Compras, ventas, retenciones, estados de cuenta…"
                      value={fila.documents_received ?? ""}
                      onChange={(evento) =>
                        establecerFilasVisitas((actuales) =>
                          actuales.map((item) =>
                            item.id === fila.id
                              ? {
                                  ...item,
                                  documents_received: evento.target.value,
                                }
                              : item
                          )
                        )
                      }
                      onBlur={(evento) =>
                        void actualizarFilaVisita(fila, {
                          documents_received: evento.target.value || null,
                          status:
                            evento.target.value && fila.status !== "completa"
                              ? "realizada"
                              : fila.status,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Firma del cliente
                    </Label>
                    <Input
                      className="h-8"
                      placeholder="Nombre de quien firma"
                      value={fila.client_signed_name ?? ""}
                      onChange={(evento) =>
                        establecerFilasVisitas((actuales) =>
                          actuales.map((item) =>
                            item.id === fila.id
                              ? {
                                  ...item,
                                  client_signed_name: evento.target.value,
                                }
                              : item
                          )
                        )
                      }
                      onBlur={(evento) =>
                        void actualizarFilaVisita(fila, {
                          client_signed_name: evento.target.value || null,
                          signed_at: evento.target.value
                            ? new Date().toISOString()
                            : null,
                          status: evento.target.value
                            ? "completa"
                            : fila.status,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-end space-x-2 pb-1">
                    <Checkbox
                      id={`disclaimer-${fila.id}`}
                      checked={fila.disclaimer_sent}
                      onCheckedChange={(valor) =>
                        void actualizarFilaVisita(fila, {
                          disclaimer_sent: valor === true,
                          disclaimer_sent_at:
                            valor === true
                              ? construirDiaDelMes(
                                  anioSeleccionado,
                                  mesSeleccionado,
                                  6
                                )
                              : null,
                        })
                      }
                    />
                    <Label
                      htmlFor={`disclaimer-${fila.id}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      Deslinde enviado (día 6)
                    </Label>
                  </div>
                </div>

                <Input
                  className="mt-3 h-8"
                  placeholder="Observaciones de la visita"
                  value={fila.notes ?? ""}
                  onChange={(evento) =>
                    establecerFilasVisitas((actuales) =>
                      actuales.map((item) =>
                        item.id === fila.id
                          ? { ...item, notes: evento.target.value }
                          : item
                      )
                    )
                  }
                  onBlur={(evento) =>
                    void actualizarFilaVisita(fila, {
                      notes: evento.target.value || null,
                    })
                  }
                />
              </CardContent>
            </Card>
          ))}
          {filasVisitas.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                <Bus className="size-8" />
                <p className="text-sm">
                  Sin visitas programadas para este período. Solo aparecen los
                  clientes marcados como de Quimistán.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export const QuimistanVisitsPage = PaginaVisitasQuimistan

