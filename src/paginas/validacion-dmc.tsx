import * as React from "react"
import {
  CheckCircle2,
  Loader2,
  Plus,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react"
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
  ETIQUETAS_ESTADO_DMC,
  PUNTOS_VALIDACION_DMC,
  CLAVES_FORMATO_DMC,
  CLAVE_SAR_DMC,
} from "@/configuracion/parametros-sistema"
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import { usarAutenticacion } from "@/ganchos/usar-autenticacion"
import type { EstadoDmc } from "@/utilidades/tipos"

type FilaDmc = {
  id: string
  client_id: string
  period_year: number
  period_month: number
  rtn_correcto: boolean
  cai_correcto: boolean
  fecha_valida: boolean
  factura_vigente: boolean
  monto_correcto: boolean
  validacion_sar: boolean
  acuse_archivado: boolean
  first_validator_id: string | null
  first_validated_at: string | null
  second_validator_id: string | null
  second_validated_at: string | null
  status: EstadoDmc
  observations: string | null
}

type ClienteResumido = { id: string; legal_name: string }
type ColaboradorResumido = { id: string; name: string }

function obtenerColorEstadoDmc(estado: EstadoDmc): string {
  switch (estado) {
    case "aprobada":
    case "archivada":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
    case "corregido":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
    case "error":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function PaginaValidacionDmc() {
  const { perfil, sesion } = usarAutenticacion()
  const idUsuarioActual = perfil?.id ?? sesion?.user?.id ?? null
  const esAdministrador = perfil?.role_id === "administrador"

  const fechaActual = new Date()
  const [anioSeleccionado, establecerAnioSeleccionado] = React.useState(
    fechaActual.getFullYear()
  )
  const [mesSeleccionado, establecerMesSeleccionado] = React.useState(
    fechaActual.getMonth() + 1
  )

  const [filasDmc, establecerFilasDmc] = React.useState<FilaDmc[]>([])
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

  const cargarDatosDmc = React.useCallback(async () => {
    establecerCargando(true)
    const [respuestaFilas, respuestaClientes, respuestaPersonal] =
      await Promise.all([
        baseDeDatos
          .from("dmc_checks")
          .select("*")
          .eq("period_year", anioSeleccionado)
          .eq("period_month", mesSeleccionado)
          .order("created_at"),
        baseDeDatos
          .from("clients")
          .select("id, legal_name")
          .eq("status", "activo")
          .order("legal_name"),
        baseDeDatos.from("profiles").select("id, name").order("name"),
      ])
    if (
      respuestaFilas.error ||
      respuestaClientes.error ||
      respuestaPersonal.error
    ) {
      establecerMensajeError("No se pudo cargar el checklist DMC.")
      establecerFilasDmc([])
    } else {
      establecerFilasDmc(respuestaFilas.data ?? [])
      establecerListaClientes(respuestaClientes.data ?? [])
      establecerListaPersonal(respuestaPersonal.data ?? [])
      establecerMensajeError(null)
    }
    establecerCargando(false)
  }, [anioSeleccionado, mesSeleccionado])

  React.useEffect(() => {
    void cargarDatosDmc()
  }, [cargarDatosDmc])

  const actualizarFilaDmc = async (
    fila: FilaDmc,
    cambios: Partial<FilaDmc>
  ) => {
    const filasPrevias = filasDmc
    const filaActualizada = { ...fila, ...cambios }
    establecerFilasDmc((actuales) =>
      actuales.map((item) => (item.id === fila.id ? filaActualizada : item))
    )
    const { error } = await baseDeDatos
      .from("dmc_checks")
      .update(cambios)
      .eq("id", fila.id)
    if (error) {
      toast.error("No se pudo guardar el cambio: " + error.message)
      establecerFilasDmc(filasPrevias)
    }
  }

  const agregarClienteADmc = async () => {
    if (idClienteNuevo === "none") {
      toast.error("Selecciona el cliente.")
      return
    }
    establecerAgregando(true)
    const { error } = await baseDeDatos.from("dmc_checks").insert({
      client_id: idClienteNuevo,
      period_year: anioSeleccionado,
      period_month: mesSeleccionado,
    })
    if (error) {
      if (error.code === "23505") {
        toast.error("Ese cliente ya está en el checklist DMC de este período.")
      } else {
        toast.error("No se pudo agregar: " + error.message)
      }
    } else {
      toast.success("Cliente agregado al checklist DMC.")
      establecerIdClienteNuevo("none")
      void cargarDatosDmc()
    }
    establecerAgregando(false)
  }

  const alternarPuntoChecklist = (
    fila: FilaDmc,
    claveCampo: (typeof PUNTOS_VALIDACION_DMC)[number]["clave"]
  ) => {
    const siguienteFila = { ...fila, [claveCampo]: !fila[claveCampo] }
    const todosMarcados = PUNTOS_VALIDACION_DMC.every(
      (punto) => siguienteFila[punto.clave]
    )
    const algunFaltante = PUNTOS_VALIDACION_DMC.some(
      (punto) => !siguienteFila[punto.clave]
    )
    const nuevoEstado: EstadoDmc = todosMarcados
      ? siguienteFila.status === "archivada"
        ? "archivada"
        : "aprobada"
      : siguienteFila.status === "archivada"
        ? "archivada"
        : algunFaltante &&
            (siguienteFila.status === "aprobada" ||
              siguienteFila.status === "pendiente")
          ? "error"
          : siguienteFila.status === "error"
            ? "corregido"
            : siguienteFila.status
    void actualizarFilaDmc(fila, {
      [claveCampo]: siguienteFila[claveCampo],
      status: nuevoEstado,
    } as Partial<FilaDmc>)
  }

  const obtenerNombreCliente = (idCliente: string) =>
    listaClientes.find((cliente) => cliente.id === idCliente)?.legal_name ?? "—"
  const obtenerNombreValidador = (idColaborador: string | null) =>
    idColaborador
      ? (listaPersonal.find((colaborador) => colaborador.id === idColaborador)
          ?.name ?? "Validado")
      : null

  const firmarPrimerValidador = (fila: FilaDmc) => {
    if (!idUsuarioActual) return
    const formatoCompleto = CLAVES_FORMATO_DMC.every((clave) => fila[clave])
    if (!fila.first_validator_id && !formatoCompleto) {
      toast.error(
        "Completa primero los 5 puntos de formato (RTN, CAI, Fecha, Vigencia y Monto) antes de firmar la 1ra validación."
      )
      return
    }
    if (fila.first_validator_id) {
      void actualizarFilaDmc(fila, {
        first_validator_id: null,
        first_validated_at: null,
      })
      toast.success("Firma de 1er validador removida")
    } else {
      void actualizarFilaDmc(fila, {
        first_validator_id: idUsuarioActual,
        first_validated_at: new Date().toISOString(),
      })
      toast.success("1ra validación (Formato) firmada")
    }
  }

  const firmarSegundoValidador = (fila: FilaDmc) => {
    if (!idUsuarioActual) return
    if (!fila.second_validator_id) {
      if (!fila.first_validator_id) {
        toast.error("Se requiere primero la firma del Validador 1 (Formato).")
        return
      }
      if (!fila[CLAVE_SAR_DMC]) {
        toast.error(
          "Marca primero 'Validación SAR exitosa' antes de firmar la 2da validación."
        )
        return
      }
      if (fila.first_validator_id === idUsuarioActual && !esAdministrador) {
        toast.error(
          "Regla de doble validación: el 2do validador debe ser un colaborador distinto al 1er validador."
        )
        return
      }
      void actualizarFilaDmc(fila, {
        second_validator_id: idUsuarioActual,
        second_validated_at: new Date().toISOString(),
      })
      toast.success("2da validación (SAR) firmada")
    } else {
      void actualizarFilaDmc(fila, {
        second_validator_id: null,
        second_validated_at: null,
      })
      toast.success("Firma de 2do validador removida")
    }
  }

  const cantidadAprobadas = filasDmc.filter(
    (fila) => fila.status === "aprobada" || fila.status === "archivada"
  ).length
  const cantidadConError = filasDmc.filter(
    (fila) => fila.status === "error"
  ).length

  return (
    <div>
      <EncabezadoPagina
        titulo="Checklist DMC"
        descripcion="Declaración Mensual de Compras: doble validación (formato y SAR). Vence el día 8. Solo 4 clientes asignados."
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
        <div className="flex gap-2 text-sm sm:ml-auto">
          <Badge variant="secondary">{cantidadAprobadas} aprobadas</Badge>
          {cantidadConError > 0 && (
            <Badge variant="destructive">{cantidadConError} con error</Badge>
          )}
        </div>
      </div>

      {!cargando && !mensajeError && (
        <Card className="mb-4">
          <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">
                Agregar cliente con DMC (solo los 4 asignados)
              </label>
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
                        !filasDmc.some((fila) => fila.client_id === cliente.id)
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
              onClick={() => void agregarClienteADmc()}
              disabled={agregando}
            >
              {agregando ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Plus className="mr-2 size-4" />
              )}
              Agregar a DMC
            </Button>
          </CardContent>
        </Card>
      )}

      {cargando && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Cargando checklist DMC…
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
          {filasDmc.map((fila) => {
            const formatoCompleto = CLAVES_FORMATO_DMC.every(
              (clave) => fila[clave]
            )
            const sarCompleto = fila[CLAVE_SAR_DMC]
            return (
              <Card key={fila.id}>
                <CardContent className="py-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {obtenerNombreCliente(fila.client_id)}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${obtenerColorEstadoDmc(fila.status)}`}
                    >
                      {ETIQUETAS_ESTADO_DMC[fila.status]}
                    </span>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant={
                          fila.first_validator_id ? "default" : "outline"
                        }
                        className="h-7 text-xs"
                        onClick={() => firmarPrimerValidador(fila)}
                        title={
                          fila.first_validator_id
                            ? `Firmado por ${obtenerNombreValidador(fila.first_validator_id)}`
                            : "Firmar 1ra validación (Formato)"
                        }
                      >
                        {formatoCompleto && fila.first_validator_id ? (
                          <ShieldCheck className="mr-1 size-3.5" />
                        ) : (
                          <ShieldAlert className="mr-1 size-3.5" />
                        )}
                        Validador 1 (Formato):{" "}
                        {fila.first_validator_id
                          ? obtenerNombreValidador(fila.first_validator_id)
                          : formatoCompleto
                            ? "Listo para firmar"
                            : "Pendiente"}
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          fila.second_validator_id ? "default" : "outline"
                        }
                        className="h-7 text-xs"
                        onClick={() => firmarSegundoValidador(fila)}
                        title={
                          fila.second_validator_id
                            ? `Firmado por ${obtenerNombreValidador(fila.second_validator_id)}`
                            : "Firmar 2da validación (SAR)"
                        }
                      >
                        {sarCompleto && fila.second_validator_id ? (
                          <ShieldCheck className="mr-1 size-3.5" />
                        ) : (
                          <ShieldAlert className="mr-1 size-3.5" />
                        )}
                        Validador 2 (SAR):{" "}
                        {fila.second_validator_id
                          ? obtenerNombreValidador(fila.second_validator_id)
                          : sarCompleto
                            ? "Listo para firmar"
                            : "Pendiente"}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
                    {PUNTOS_VALIDACION_DMC.map((punto) => (
                      <Label
                        key={punto.clave}
                        className="flex cursor-pointer items-center gap-2 text-sm font-normal"
                      >
                        <Checkbox
                          checked={fila[punto.clave]}
                          onCheckedChange={() =>
                            alternarPuntoChecklist(fila, punto.clave)
                          }
                        />
                        {punto.etiqueta}
                      </Label>
                    ))}
                  </div>
                  <Input
                    className="mt-3 h-8"
                    placeholder="Observaciones de errores o correcciones"
                    value={fila.observations ?? ""}
                    onChange={(evento) =>
                      establecerFilasDmc((actuales) =>
                        actuales.map((item) =>
                          item.id === fila.id
                            ? { ...item, observations: evento.target.value }
                            : item
                        )
                      )
                    }
                    onBlur={(evento) =>
                      void actualizarFilaDmc(fila, {
                        observations: evento.target.value || null,
                      })
                    }
                  />
                </CardContent>
              </Card>
            )
          })}
          {filasDmc.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                <CheckCircle2 className="size-8" />
                <p className="text-sm">
                  Sin declaraciones DMC registradas para este período. Agrega el
                  cliente desde la pantalla de Configuración o pide al
                  administrador que lo cargue.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export const DmcChecklistPage = PaginaValidacionDmc

