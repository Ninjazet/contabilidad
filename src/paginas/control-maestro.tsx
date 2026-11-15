import * as React from "react"
import { ClipboardCheck, Download, Loader2, Plus, Users } from "lucide-react"
import { toast } from "sonner"

import { EncabezadoPagina } from "@/componentes/encabezado-pagina"
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
  ETIQUETAS_ESTADO_INFORMACION,
  COLORES_ESTADO_INFORMACION,
  ETIQUETAS_ESTADO_BOLETIN,
} from "@/configuracion/parametros-sistema"
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import { aFechaIso } from "@/utilidades/fechas"
import { descargarArchivoCsv } from "@/utilidades/exportar-csv"
import { usarAutenticacion } from "@/ganchos/usar-autenticacion"
import type {
  EstadoInformacionControl,
  TipoDeclaracionControl,
  EstadoBoletinControl,
  EstadoPagoControl,
} from "@/utilidades/tipos"

type FilaControlMaestro = {
  id: string
  client_id: string
  period_year: number
  period_month: number
  responsible_user_id: string | null
  info_status: EstadoInformacionControl
  conformity_date: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  declaration_type: TipoDeclaracionControl
  bulletin_status: EstadoBoletinControl
  payment_status: EstadoPagoControl
  archived: boolean
  observations: string | null
}

type ClienteResumido = { id: string; legal_name: string; status?: string }
type ColaboradorResumido = { id: string; name: string }

export function PaginaControlMaestro() {
  const { perfil } = usarAutenticacion()
  const puedeRevisar =
    perfil?.role_id === "administrador" ||
    perfil?.role_id === "gerente_operaciones"

  const fechaActual = new Date()
  const [anioSeleccionado, establecerAnioSeleccionado] = React.useState(
    fechaActual.getFullYear()
  )
  const [mesSeleccionado, establecerMesSeleccionado] = React.useState(
    fechaActual.getMonth() + 1
  )

  const [filasControl, establecerFilasControl] = React.useState<
    FilaControlMaestro[]
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
  const [idUsuarioActual, establecerIdUsuarioActual] = React.useState<
    string | null
  >(null)
  const [filtroResponsable, establecerFiltroResponsable] =
    React.useState("todos")

  React.useEffect(() => {
    baseDeDatos.auth
      .getUser()
      .then(({ data }) => establecerIdUsuarioActual(data.user?.id ?? null))
  }, [])

  const cargarControlMaestro = React.useCallback(async () => {
    establecerCargando(true)
    const [respuestaClientes, respuestaPersonal] = await Promise.all([
      baseDeDatos
        .from("clients")
        .select("id, legal_name, status")
        .order("legal_name"),
      baseDeDatos
        .from("profiles")
        .select("id, name")
        .eq("active", true)
        .order("name"),
    ])
    if (respuestaClientes.error || respuestaPersonal.error) {
      establecerMensajeError("No se pudieron cargar los datos base.")
      establecerCargando(false)
      return
    }
    const clientesObtenidos: ClienteResumido[] = respuestaClientes.data ?? []
    const clientesActivos = clientesObtenidos.filter(
      (cliente) => !cliente.status || cliente.status === "activo"
    )
    const personalObtenido: ColaboradorResumido[] = respuestaPersonal.data ?? []
    establecerListaClientes(clientesObtenidos)
    establecerListaPersonal(personalObtenido)

    const respuestaControl = await baseDeDatos
      .from("monthly_master_control")
      .select("*")
      .eq("period_year", anioSeleccionado)
      .eq("period_month", mesSeleccionado)
      .order("created_at")
    if (respuestaControl.error) {
      establecerMensajeError("No se pudo cargar el control maestro.")
      establecerFilasControl([])
      establecerCargando(false)
      return
    }
    establecerFilasControl(respuestaControl.data ?? [])
    establecerMensajeError(null)

    const clientesExistentes = new Set(
      (respuestaControl.data ?? []).map(
        (fila: FilaControlMaestro) => fila.client_id
      )
    )
    const filasFaltantes = clientesActivos
      .filter((cliente) => !clientesExistentes.has(cliente.id))
      .map((cliente) => ({
        client_id: cliente.id,
        period_year: anioSeleccionado,
        period_month: mesSeleccionado,
      }))
    if (filasFaltantes.length > 0) {
      const insercion = await baseDeDatos
        .from("monthly_master_control")
        .upsert(filasFaltantes, {
          onConflict: "client_id,period_year,period_month",
          ignoreDuplicates: true,
        })
      if (insercion.error) {
        toast.error(
          "No se pudieron crear las filas del mes: " + insercion.error.message
        )
      } else {
        const recarga = await baseDeDatos
          .from("monthly_master_control")
          .select("*")
          .eq("period_year", anioSeleccionado)
          .eq("period_month", mesSeleccionado)
          .order("created_at")
        if (!recarga.error) establecerFilasControl(recarga.data ?? [])
      }
    }
    establecerCargando(false)
  }, [anioSeleccionado, mesSeleccionado])

  React.useEffect(() => {
    void cargarControlMaestro()
  }, [cargarControlMaestro])

  const actualizarFilaControl = async (
    fila: FilaControlMaestro,
    cambios: Partial<FilaControlMaestro>
  ) => {
    const filasPrevias = filasControl
    establecerFilasControl((actuales) =>
      actuales.map((item) =>
        item.id === fila.id ? { ...fila, ...cambios } : item
      )
    )
    const { error } = await baseDeDatos
      .from("monthly_master_control")
      .update(cambios)
      .eq("id", fila.id)
    if (error) {
      toast.error("No se pudo guardar el cambio: " + error.message)
      establecerFilasControl(filasPrevias)
    }
  }

  const alternarRevisionGerencia = (fila: FilaControlMaestro) => {
    if (!puedeRevisar) {
      toast.error(
        "Solo Gerencia de Operaciones o Administración pueden firmar la revisión."
      )
      return
    }
    if (fila.reviewed_by) {
      void actualizarFilaControl(fila, {
        reviewed_by: null,
        reviewed_at: null,
      })
    } else {
      void actualizarFilaControl(fila, {
        reviewed_by: idUsuarioActual,
        reviewed_at: new Date().toISOString(),
      })
    }
  }

  const obtenerNombreCliente = (idCliente: string) =>
    listaClientes.find((cliente) => cliente.id === idCliente)?.legal_name ?? "—"

  const filasFiltradas = filasControl.filter((fila) => {
    if (filtroResponsable === "todos") return true
    if (filtroResponsable === "sin_asignar") return !fila.responsible_user_id
    return fila.responsible_user_id === filtroResponsable
  })

  const exportarControlCsv = () => {
    if (filasFiltradas.length === 0) {
      toast.info("No hay filas para exportar.")
      return
    }
    const obtenerNombreColaborador = (idColaborador: string | null) =>
      idColaborador
        ? (listaPersonal.find((colaborador) => colaborador.id === idColaborador)
            ?.name ?? "—")
        : "Sin asignar"
    descargarArchivoCsv(
      `control-maestro-${anioSeleccionado}-${String(mesSeleccionado).padStart(2, "0")}.csv`,
      [
        "Cliente",
        "Responsable",
        "Información",
        "Conformidad",
        "Revisión Gerencia",
        "Tipo Declaración",
        "Boletín",
        "Pago",
        "Archivado Día 11",
        "Observaciones",
      ],
      filasFiltradas.map((fila) => [
        obtenerNombreCliente(fila.client_id),
        obtenerNombreColaborador(fila.responsible_user_id),
        ETIQUETAS_ESTADO_INFORMACION[fila.info_status],
        aFechaIso(fila.conformity_date),
        fila.reviewed_by
          ? obtenerNombreColaborador(fila.reviewed_by)
          : "Pendiente",
        fila.declaration_type === "con_pago" ? "Con pago" : "Sin pago",
        ETIQUETAS_ESTADO_BOLETIN[fila.bulletin_status],
        fila.payment_status === "pagado" ? "Pagado" : "Pendiente",
        fila.archived ? "Sí" : "No",
        fila.observations ?? "",
      ])
    )
    toast.success("CSV de Control Maestro descargado")
  }

  return (
    <div>
      <EncabezadoPagina
        titulo="Control Maestro"
        descripcion="Control general mensual de clientes: información, conformidad, revisión, cobro y pago."
        acciones={
          <Button variant="outline" onClick={exportarControlCsv}>
            <Download className="mr-2 size-4" />
            Exportar CSV
          </Button>
        }
      />

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
        <Select
          value={filtroResponsable}
          onValueChange={establecerFiltroResponsable}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los gestores</SelectItem>
            <SelectItem value="sin_asignar">Sin asignar</SelectItem>
            {listaPersonal.map((colaborador) => (
              <SelectItem key={colaborador.id} value={colaborador.id}>
                {colaborador.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="sm:ml-auto"
          onClick={() => void cargarControlMaestro()}
          disabled={cargando}
        >
          {cargando && <Loader2 className="mr-2 size-4 animate-spin" />}
          <Plus className="mr-2 size-4" />
          Generar filas del mes
        </Button>
      </div>

      {cargando && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Cargando control maestro…
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
                  <TableHead>Responsable</TableHead>
                  <TableHead>Información</TableHead>
                  <TableHead>Conformidad</TableHead>
                  <TableHead>Revisión</TableHead>
                  <TableHead>Declaración</TableHead>
                  <TableHead>Boletín</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Archivado</TableHead>
                  <TableHead>Observaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filasFiltradas.map((fila) => (
                  <TableRow key={fila.id}>
                    <TableCell className="font-medium">
                      {obtenerNombreCliente(fila.client_id)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={fila.responsible_user_id ?? "sin_asignar"}
                        onValueChange={(valor) =>
                          void actualizarFilaControl(fila, {
                            responsible_user_id:
                              valor === "sin_asignar" ? null : valor,
                          })
                        }
                      >
                        <SelectTrigger size="sm" className="h-7 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sin_asignar">
                            Sin asignar
                          </SelectItem>
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
                      <Select
                        value={fila.info_status}
                        onValueChange={(valor) =>
                          void actualizarFilaControl(fila, {
                            info_status: valor as EstadoInformacionControl,
                          })
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          className={`h-7 w-32 border-0 ${COLORES_ESTADO_INFORMACION[fila.info_status]}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ETIQUETAS_ESTADO_INFORMACION).map(
                            ([clave, etiqueta]) => (
                              <SelectItem key={clave} value={clave}>
                                {etiqueta}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        className="h-8 w-36"
                        value={aFechaIso(fila.conformity_date)}
                        onChange={(evento) =>
                          void actualizarFilaControl(fila, {
                            conformity_date: evento.target.value || null,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        disabled={!puedeRevisar}
                        onClick={() => alternarRevisionGerencia(fila)}
                        title={
                          !puedeRevisar
                            ? "Revisión exclusiva de Gerencia de Operaciones / Administración"
                            : fila.reviewed_by
                              ? "Revisado. Click para desmarcar"
                              : "Marcar como revisado por gerencia"
                        }
                      >
                        <ClipboardCheck
                          className={`size-4 ${fila.reviewed_by ? "text-primary" : "text-muted-foreground"}`}
                        />
                        {fila.reviewed_by ? "Revisado" : "Marcar"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={fila.declaration_type}
                        onValueChange={(valor) =>
                          void actualizarFilaControl(fila, {
                            declaration_type: valor as TipoDeclaracionControl,
                          })
                        }
                      >
                        <SelectTrigger size="sm" className="h-7 w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="con_pago">Con pago</SelectItem>
                          <SelectItem value="sin_pago">
                            Sin pago / en cero
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={fila.bulletin_status}
                        onValueChange={(valor) =>
                          void actualizarFilaControl(fila, {
                            bulletin_status: valor as EstadoBoletinControl,
                          })
                        }
                      >
                        <SelectTrigger size="sm" className="h-7 w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ETIQUETAS_ESTADO_BOLETIN).map(
                            ([clave, etiqueta]) => (
                              <SelectItem key={clave} value={clave}>
                                {etiqueta}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={fila.payment_status}
                        onValueChange={(valor) =>
                          void actualizarFilaControl(fila, {
                            payment_status: valor as EstadoPagoControl,
                          })
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          className={`h-7 w-28 border-0 ${
                            fila.payment_status === "pagado"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="pagado">Pagado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={fila.archived}
                        onCheckedChange={(valor) =>
                          void actualizarFilaControl(fila, {
                            archived: valor === true,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 w-48"
                        value={fila.observations ?? ""}
                        onChange={(evento) =>
                          establecerFilasControl((actuales) =>
                            actuales.map((item) =>
                              item.id === fila.id
                                ? {
                                    ...item,
                                    observations: evento.target.value,
                                  }
                                : item
                            )
                          )
                        }
                        onBlur={(evento) =>
                          void actualizarFilaControl(fila, {
                            observations: evento.target.value || null,
                          })
                        }
                        placeholder="Observaciones"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {filasFiltradas.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="py-10 text-center text-muted-foreground"
                    >
                      <Users className="mx-auto mb-2 size-6" />
                      Sin filas para este período. Use "Generar filas del mes".
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

export const MasterControlPage = PaginaControlMaestro

