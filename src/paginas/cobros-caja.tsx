import * as React from "react"
import { ClipboardCheck, Download, Loader2, Plus, Wallet } from "lucide-react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  NOMBRES_MESES,
  ETIQUETAS_ESTADO_COBRO,
} from "@/configuracion/parametros-sistema"
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import { formatearLempiras } from "@/utilidades/fechas"
import { descargarArchivoCsv } from "@/utilidades/exportar-csv"
import { usarAutenticacion } from "@/ganchos/usar-autenticacion"
import type { EstadoCobro } from "@/utilidades/tipos"

type FilaCobroCaja = {
  id: string
  client_id: string
  period_year: number
  period_month: number
  receipt_number: string | null
  amount: number
  receipt_issued: boolean
  deposit_confirmed: boolean
  deposited_amount: number
  status: EstadoCobro
  audited_by: string | null
  audited_at: string | null
  posted_to_banks: boolean
  notes: string | null
}

type ClienteResumido = { id: string; legal_name: string; status?: string }

function obtenerColorEstadoCobro(estado: EstadoCobro): string {
  if (estado === "conciliado") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
  }
  if (estado === "cobrado") {
    return "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
  }
  if (estado === "en_cobro" || estado === "emitido") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
  }
  return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
}

export function PaginaCobrosCaja() {
  const { perfil } = usarAutenticacion()
  const puedeAuditar =
    perfil?.role_id === "administrador" ||
    perfil?.role_id === "gerente_operaciones"
  const puedePostearEnBancos =
    perfil?.role_id === "administrador" ||
    perfil?.role_id === "gerente_operaciones" ||
    perfil?.role_id === "contador"

  const fechaActual = new Date()
  const [anioSeleccionado, establecerAnioSeleccionado] = React.useState(
    fechaActual.getFullYear()
  )
  const [mesSeleccionado, establecerMesSeleccionado] = React.useState(
    fechaActual.getMonth() + 1
  )

  const [filasCobros, establecerFilasCobros] = React.useState<FilaCobroCaja[]>(
    []
  )
  const [listaClientes, establecerListaClientes] = React.useState<
    ClienteResumido[]
  >([])
  const [cargando, establecerCargando] = React.useState(true)
  const [mensajeError, establecerMensajeError] = React.useState<string | null>(
    null
  )
  const [idUsuarioActual, establecerIdUsuarioActual] = React.useState<
    string | null
  >(null)

  const [idClienteNuevo, establecerIdClienteNuevo] = React.useState("none")
  const [montoNuevo, establecerMontoNuevo] = React.useState("")
  const [agregando, establecerAgregando] = React.useState(false)

  React.useEffect(() => {
    baseDeDatos.auth
      .getUser()
      .then(({ data }) => establecerIdUsuarioActual(data.user?.id ?? null))
  }, [])

  const cargarCobrosDelPeriodo = React.useCallback(async () => {
    establecerCargando(true)
    const [respuestaCobros, respuestaClientes] = await Promise.all([
      baseDeDatos
        .from("collections")
        .select("*")
        .eq("period_year", anioSeleccionado)
        .eq("period_month", mesSeleccionado)
        .order("created_at"),
      baseDeDatos
        .from("clients")
        .select("id, legal_name, status")
        .order("legal_name"),
    ])
    if (respuestaCobros.error || respuestaClientes.error) {
      establecerMensajeError("No se pudo cargar el cuadre de caja.")
      establecerFilasCobros([])
    } else {
      establecerFilasCobros(respuestaCobros.data ?? [])
      establecerListaClientes(respuestaClientes.data ?? [])
      establecerMensajeError(null)
    }
    establecerCargando(false)
  }, [anioSeleccionado, mesSeleccionado])

  React.useEffect(() => {
    void cargarCobrosDelPeriodo()
  }, [cargarCobrosDelPeriodo])

  const actualizarFilaCobro = async (
    fila: FilaCobroCaja,
    cambios: Partial<FilaCobroCaja>
  ) => {
    const filasPrevias = filasCobros
    establecerFilasCobros((actuales) =>
      actuales.map((item) =>
        item.id === fila.id ? { ...fila, ...cambios } : item
      )
    )
    const { error } = await baseDeDatos
      .from("collections")
      .update(cambios)
      .eq("id", fila.id)
    if (error) {
      toast.error("No se pudo guardar el cambio: " + error.message)
      establecerFilasCobros(filasPrevias)
    }
  }

  const agregarCobro = async () => {
    if (idClienteNuevo === "none") {
      toast.error("Selecciona el cliente.")
      return
    }
    establecerAgregando(true)
    const { error } = await baseDeDatos.from("collections").insert({
      client_id: idClienteNuevo,
      period_year: anioSeleccionado,
      period_month: mesSeleccionado,
      amount: Number(montoNuevo) || 0,
    })
    if (error) {
      if (error.code === "23505") {
        toast.error("Ese cliente ya tiene un cobro registrado en este período.")
      } else {
        toast.error("No se pudo agregar: " + error.message)
      }
    } else {
      toast.success("Cobro agregado.")
      establecerIdClienteNuevo("none")
      establecerMontoNuevo("")
      void cargarCobrosDelPeriodo()
    }
    establecerAgregando(false)
  }

  const alternarAuditoriaCobro = (fila: FilaCobroCaja) => {
    if (!puedeAuditar) {
      toast.error(
        "Solo Gerencia de Operaciones o Administración pueden auditar cobros."
      )
      return
    }
    if (fila.audited_by) {
      void actualizarFilaCobro(fila, { audited_by: null, audited_at: null })
    } else {
      void actualizarFilaCobro(fila, {
        audited_by: idUsuarioActual,
        audited_at: new Date().toISOString(),
        status: fila.status === "cobrado" ? "conciliado" : fila.status,
      })
    }
  }

  const clientesActivos = listaClientes.filter(
    (cliente) => !cliente.status || cliente.status === "activo"
  )
  const obtenerNombreCliente = (idCliente: string) =>
    listaClientes.find((cliente) => cliente.id === idCliente)?.legal_name ?? "—"

  const totalEmitido = filasCobros
    .filter((fila) => fila.receipt_issued)
    .reduce((acumulado, fila) => acumulado + Number(fila.amount ?? 0), 0)
  const totalDepositado = filasCobros.reduce(
    (acumulado, fila) => acumulado + Number(fila.deposited_amount ?? 0),
    0
  )
  const cajaCuadrada =
    totalEmitido === totalDepositado && filasCobros.length > 0
  const pendientesAuditar = filasCobros.filter(
    (fila) => fila.deposit_confirmed && !fila.audited_by
  ).length

  const exportarCobrosCsv = () => {
    if (filasCobros.length === 0) {
      toast.info("No hay cobros para exportar.")
      return
    }
    descargarArchivoCsv(
      `cobros-caja-${anioSeleccionado}-${String(mesSeleccionado).padStart(2, "0")}.csv`,
      [
        "Cliente",
        "Recibo N°",
        "Honorarios (L)",
        "Recibo Emitido",
        "Depósito Confirmado",
        "Depositado (L)",
        "Estado",
        "Auditado",
        "Posteado en Bancos",
        "Notas",
      ],
      filasCobros.map((fila) => [
        obtenerNombreCliente(fila.client_id),
        fila.receipt_number ?? "",
        Number(fila.amount ?? 0).toFixed(2),
        fila.receipt_issued ? "Sí" : "No",
        fila.deposit_confirmed ? "Sí" : "No",
        Number(fila.deposited_amount ?? 0).toFixed(2),
        ETIQUETAS_ESTADO_COBRO[fila.status],
        fila.audited_by ? "Sí" : "Pendiente",
        fila.posted_to_banks ? "Sí" : "No",
        fila.notes ?? "",
      ])
    )
    toast.success("CSV de Cobros descargado")
  }

  return (
    <div>
      <EncabezadoPagina
        titulo="Cobros y Cuadre de Caja"
        descripcion="Reporte de cobros: recibos emitidos vs depósitos bancarios. Auditado por gerencia y contabilizado por María."
        acciones={
          <Button variant="outline" onClick={exportarCobrosCsv}>
            <Download className="mr-2 size-4" />
            Exportar CSV
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Recibos emitidos</p>
            <p className="text-lg font-semibold">
              {formatearLempiras(totalEmitido)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Depósitos recibidos</p>
            <p className="text-lg font-semibold">
              {formatearLempiras(totalDepositado)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Cuadre</p>
            <p
              className={`text-lg font-semibold ${cajaCuadrada ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
            >
              {filasCobros.length === 0
                ? "—"
                : cajaCuadrada
                  ? "Cuadrado"
                  : "Descuadre de " +
                    formatearLempiras(Math.abs(totalEmitido - totalDepositado))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Cliente</Label>
            <Select
              value={idClienteNuevo}
              onValueChange={establecerIdClienteNuevo}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Seleccionar cliente</SelectItem>
                {clientesActivos.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.legal_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Monto honorarios (L)
            </Label>
            <Input
              type="number"
              step="0.01"
              className="w-40"
              value={montoNuevo}
              onChange={(evento) => establecerMontoNuevo(evento.target.value)}
              placeholder="0.00"
            />
          </div>
          <Button onClick={() => void agregarCobro()} disabled={agregando}>
            {agregando ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Plus className="mr-2 size-4" />
            )}
            Agregar cobro
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
          <Badge variant="outline">{filasCobros.length} cobros</Badge>
          {pendientesAuditar > 0 && (
            <Badge variant="destructive">{pendientesAuditar} por auditar</Badge>
          )}
        </div>
      </div>

      {cargando && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Cargando cobros…
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
                  <TableHead>Recibo N°</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Recibo emitido</TableHead>
                  <TableHead>Depósito confirmado</TableHead>
                  <TableHead>Monto depositado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Auditoría</TableHead>
                  <TableHead>Contabilizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filasCobros.map((fila) => (
                  <TableRow key={fila.id}>
                    <TableCell className="font-medium">
                      {obtenerNombreCliente(fila.client_id)}
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-7 w-28"
                        value={fila.receipt_number ?? ""}
                        onChange={(evento) =>
                          establecerFilasCobros((actuales) =>
                            actuales.map((item) =>
                              item.id === fila.id
                                ? {
                                    ...item,
                                    receipt_number: evento.target.value,
                                  }
                                : item
                            )
                          )
                        }
                        onBlur={(evento) =>
                          void actualizarFilaCobro(fila, {
                            receipt_number: evento.target.value || null,
                          })
                        }
                        placeholder="N°"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-7 w-28"
                        value={fila.amount}
                        onChange={(evento) =>
                          establecerFilasCobros((actuales) =>
                            actuales.map((item) =>
                              item.id === fila.id
                                ? {
                                    ...item,
                                    amount: Number(evento.target.value),
                                  }
                                : item
                            )
                          )
                        }
                        onBlur={(evento) =>
                          void actualizarFilaCobro(fila, {
                            amount: Number(evento.target.value) || 0,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={fila.receipt_issued ? "si" : "no"}
                        onValueChange={(valor) =>
                          void actualizarFilaCobro(fila, {
                            receipt_issued: valor === "si",
                            status:
                              valor === "si" && fila.status === "pendiente"
                                ? "emitido"
                                : fila.status,
                          })
                        }
                      >
                        <SelectTrigger size="sm" className="h-7 w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="si">Sí</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={fila.deposit_confirmed ? "si" : "no"}
                        onValueChange={(valor) =>
                          void actualizarFilaCobro(fila, {
                            deposit_confirmed: valor === "si",
                            status:
                              valor === "si" &&
                              (fila.status === "pendiente" ||
                                fila.status === "emitido" ||
                                fila.status === "en_cobro")
                                ? "cobrado"
                                : fila.status,
                          })
                        }
                      >
                        <SelectTrigger size="sm" className="h-7 w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="si">Sí</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-7 w-28"
                        value={fila.deposited_amount}
                        onChange={(evento) =>
                          establecerFilasCobros((actuales) =>
                            actuales.map((item) =>
                              item.id === fila.id
                                ? {
                                    ...item,
                                    deposited_amount: Number(
                                      evento.target.value
                                    ),
                                  }
                                : item
                            )
                          )
                        }
                        onBlur={(evento) =>
                          void actualizarFilaCobro(fila, {
                            deposited_amount: Number(evento.target.value) || 0,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${obtenerColorEstadoCobro(fila.status)}`}
                      >
                        {ETIQUETAS_ESTADO_COBRO[fila.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        disabled={!puedeAuditar}
                        title={
                          puedeAuditar
                            ? "Firma de auditoría de gerencia (Enrique)"
                            : "Exclusivo de Gerencia de Operaciones / Administración"
                        }
                        onClick={() => alternarAuditoriaCobro(fila)}
                      >
                        <ClipboardCheck
                          className={`size-4 ${fila.audited_by ? "text-primary" : "text-muted-foreground"}`}
                        />
                        {fila.audited_by ? "Auditado" : "Auditar"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={fila.posted_to_banks ? "si" : "no"}
                        disabled={!puedePostearEnBancos}
                        onValueChange={(valor) =>
                          void actualizarFilaCobro(fila, {
                            posted_to_banks: valor === "si",
                          })
                        }
                      >
                        <SelectTrigger size="sm" className="h-7 w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="si">Sí</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {filasCobros.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-10 text-center text-muted-foreground"
                    >
                      <Wallet className="mx-auto mb-2 size-6" />
                      Sin cobros registrados para este período.
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

export const CollectionsPage = PaginaCobrosCaja

