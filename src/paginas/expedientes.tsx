import * as React from "react"
import { Link } from "react-router-dom"
import { CalendarDays, Eye, FolderOpen, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import { EncabezadoPagina } from "@/componentes/encabezado-pagina"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  ETIQUETAS_ESTADO_EXPEDIENTE,
  CHECKLIST_BASE_EXPEDIENTE,
} from "@/configuracion/parametros-sistema"
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import { formatearFecha } from "@/utilidades/fechas"
import type {
  Cliente,
  EstadoExpediente,
  PerfilUsuario,
} from "@/utilidades/tipos"

type FilaExpediente = {
  id: string
  code: string
  client_id: string
  period_year: number
  period_month: number
  status: EstadoExpediente
  due_date: string | null
  responsible_user_id: string | null
}

type ClienteResumido = Pick<Cliente, "id" | "code" | "legal_name" | "status">

function obtenerVarianteEstadoExpediente(
  estado: EstadoExpediente
): "secondary" | "outline" | "default" | "destructive" {
  if (estado === "aprobado") return "secondary"
  if (estado === "en_revision") return "default"
  if (estado === "rechazado") return "destructive"
  return "outline"
}

export function PaginaExpedientes() {
  const [listaExpedientes, establecerListaExpedientes] = React.useState<
    FilaExpediente[]
  >([])
  const [listaClientes, establecerListaClientes] = React.useState<
    ClienteResumido[]
  >([])
  const [listaPerfiles, establecerListaPerfiles] = React.useState<
    PerfilUsuario[]
  >([])
  const [cargando, establecerCargando] = React.useState(true)
  const [mensajeError, establecerMensajeError] = React.useState<string | null>(
    null
  )

  const fechaActual = new Date()
  const [anioSeleccionado, establecerAnioSeleccionado] = React.useState(
    fechaActual.getFullYear()
  )
  const [mesSeleccionado, establecerMesSeleccionado] = React.useState(
    fechaActual.getMonth() + 1
  )

  const [dialogoAbierto, establecerDialogoAbierto] = React.useState(false)
  const [idClienteNuevo, establecerIdClienteNuevo] = React.useState<string>("")
  const [creando, establecerCreando] = React.useState(false)

  const cargarDatosExpedientes = React.useCallback(async () => {
    establecerCargando(true)
    const [respuestaExpedientes, respuestaClientes, respuestaPerfiles] =
      await Promise.all([
        baseDeDatos.from("files").select("*").order("code"),
        baseDeDatos
          .from("clients")
          .select("id, code, legal_name, status")
          .order("code"),
        baseDeDatos.from("profiles").select("*").order("name"),
      ])
    if (
      respuestaExpedientes.error ||
      respuestaClientes.error ||
      respuestaPerfiles.error
    ) {
      establecerMensajeError("No se pudieron cargar los expedientes.")
      establecerListaExpedientes([])
    } else {
      establecerListaExpedientes(respuestaExpedientes.data ?? [])
      establecerListaClientes(respuestaClientes.data ?? [])
      establecerListaPerfiles(respuestaPerfiles.data ?? [])
      establecerMensajeError(null)
    }
    establecerCargando(false)
  }, [])

  React.useEffect(() => {
    void cargarDatosExpedientes()
  }, [cargarDatosExpedientes])

  const mapaPerfilPorId = React.useMemo(() => {
    const mapa = new Map<string, PerfilUsuario>()
    listaPerfiles.forEach((perfil) => mapa.set(perfil.id, perfil))
    return mapa
  }, [listaPerfiles])

  const mapaClientePorId = React.useMemo(() => {
    const mapa = new Map<string, ClienteResumido>()
    listaClientes.forEach((cliente) => mapa.set(cliente.id, cliente))
    return mapa
  }, [listaClientes])

  const expedientesVisibles = React.useMemo(
    () =>
      listaExpedientes.filter(
        (expediente) =>
          expediente.period_year === anioSeleccionado &&
          expediente.period_month === mesSeleccionado
      ),
    [listaExpedientes, anioSeleccionado, mesSeleccionado]
  )

  const aniosDisponibles = React.useMemo(() => {
    const conjuntoAnios = new Set<number>(
      listaExpedientes.map((expediente) => expediente.period_year)
    )
    conjuntoAnios.add(fechaActual.getFullYear())
    return Array.from(conjuntoAnios).sort((a, b) => b - a)
  }, [listaExpedientes])

  const crearNuevoExpediente = async () => {
    if (!idClienteNuevo) {
      toast.error("Seleccione un cliente para el expediente.")
      return
    }
    establecerCreando(true)
    try {
      const clienteElegido = mapaClientePorId.get(idClienteNuevo)
      if (!clienteElegido) return
      const codigoExpediente = `${clienteElegido.code}-${anioSeleccionado}-${String(mesSeleccionado).padStart(2, "0")}`
      const { data: datosUsuario } = await baseDeDatos.auth.getUser()

      const { error: errorInsercion } = await baseDeDatos.from("files").insert({
        code: codigoExpediente,
        client_id: idClienteNuevo,
        period_year: anioSeleccionado,
        period_month: mesSeleccionado,
        created_by: datosUsuario.user?.id ?? null,
      })

      if (errorInsercion) {
        if (errorInsercion.message.includes("duplicate key")) {
          toast.error(
            "Ese cliente ya tiene expediente para el periodo seleccionado."
          )
        } else {
          toast.error(
            "No se pudo crear el expediente: " + errorInsercion.message
          )
        }
        return
      }

      const { data: expedienteCreado } = await baseDeDatos
        .from("files")
        .select("id")
        .eq("code", codigoExpediente)
        .maybeSingle()

      if (expedienteCreado) {
        await baseDeDatos.from("file_checklist_items").insert(
          CHECKLIST_BASE_EXPEDIENTE.map((tituloTarea) => ({
            file_id: expedienteCreado.id,
            title: tituloTarea,
          }))
        )
      }

      toast.success("Expediente creado correctamente")
      establecerDialogoAbierto(false)
      establecerIdClienteNuevo("")
      void cargarDatosExpedientes()
    } finally {
      establecerCreando(false)
    }
  }

  return (
    <div>
      <EncabezadoPagina
        titulo="Expedientes"
        descripcion="Expedientes mensuales por cliente con su responsable y avance."
        acciones={
          <Button onClick={() => establecerDialogoAbierto(true)}>
            <Plus className="size-4" />
            Nuevo expediente
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
        <Select
          value={String(anioSeleccionado)}
          onValueChange={(valor) => establecerAnioSeleccionado(Number(valor))}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {aniosDisponibles.map((anio) => (
              <SelectItem key={anio} value={String(anio)}>
                {anio}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground sm:ml-auto">
          {expedientesVisibles.length} expediente
          {expedientesVisibles.length === 1 ? "" : "s"} en el periodo
        </span>
      </div>

      {cargando && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Cargando expedientes…
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {expedientesVisibles.map((expediente) => {
            const clienteAsociado = mapaClientePorId.get(expediente.client_id)
            const responsableAsignado = expediente.responsible_user_id
              ? mapaPerfilPorId.get(expediente.responsible_user_id)
              : null
            return (
              <Card key={expediente.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {clienteAsociado?.legal_name ?? "Cliente eliminado"}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {expediente.code}
                      </p>
                    </div>
                    <Badge
                      variant={obtenerVarianteEstadoExpediente(
                        expediente.status
                      )}
                    >
                      {ETIQUETAS_ESTADO_EXPEDIENTE[expediente.status]}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="size-3.5" />
                      {expediente.due_date
                        ? `Vence: ${formatearFecha(expediente.due_date)}`
                        : "Sin fecha límite"}
                    </div>
                    <p>
                      Responsable:{" "}
                      {responsableAsignado
                        ? responsableAsignado.name
                        : "Sin asignar"}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center justify-between">
                    <Link
                      to={`/expedientes/${expediente.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Abrir expediente
                    </Link>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="size-8"
                    >
                      <Link
                        to={`/expedientes/${expediente.id}`}
                        title="Ver expediente"
                      >
                        <Eye className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {expedientesVisibles.length === 0 && (
            <Card className="md:col-span-2 xl:col-span-3">
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                <FolderOpen className="size-8" />
                <p className="text-sm">
                  No hay expedientes para {NOMBRES_MESES[mesSeleccionado - 1]}{" "}
                  {anioSeleccionado}. Cree uno con "Nuevo expediente".
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={dialogoAbierto} onOpenChange={establecerDialogoAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo expediente</DialogTitle>
            <DialogDescription>
              Se creará para {NOMBRES_MESES[mesSeleccionado - 1]}{" "}
              {anioSeleccionado} con su checklist base.
            </DialogDescription>
          </DialogHeader>
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
                {listaClientes
                  .filter(
                    (cliente) => !cliente.status || cliente.status === "activo"
                  )
                  .map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.legal_name} ({cliente.code})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => establecerDialogoAbierto(false)}
              disabled={creando}
            >
              Cancelar
            </Button>
            <Button onClick={crearNuevoExpediente} disabled={creando}>
              {creando && <Loader2 className="size-4 animate-spin" />}
              Crear expediente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const Files = PaginaExpedientes

