import * as React from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Banknote,
  Briefcase,
  Building2,
  CalendarDays,
  FolderKanban,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DialogoCliente } from "@/componentes/clientes/dialogo-cliente"
import { PanelAyudaModulo } from "@/componentes/ayuda-modulo"
import {
  ETIQUETAS_ESTADO_EXPEDIENTE,
  ETIQUETAS_ESTADO_TAREA,
  ETIQUETAS_ESTADO_COBRO,
} from "@/configuracion/parametros-sistema"
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import { formatearFecha } from "@/utilidades/fechas"
import type { Cliente, PerfilUsuario } from "@/utilidades/tipos"

type FilaServicio = { id: string; name: string; description: string }
type FilaExpedienteCliente = {
  id: string
  code: string
  period_year: number
  period_month: number
  status: string
  due_date: string | null
}
type FilaVencimientoCliente = {
  id: string
  obligation_id: string
  period_year: number
  period_month: number
  due_date: string
  status: string
}
type FilaCobroCliente = {
  id: string
  period_year: number
  period_month: number
  amount: number
  deposited_amount: number
  status: string
  posted_to_banks: boolean
}

function ElementoDetalle({
  icono: Icono,
  etiqueta,
  valor,
}: {
  icono?: React.ComponentType<{ className?: string }>
  etiqueta: string
  valor: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      {Icono ? (
        <Icono className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      ) : null}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{etiqueta}</p>
        <p className="text-sm break-words">{valor ?? "—"}</p>
      </div>
    </div>
  )
}

export function PaginaDetalleCliente() {
  const { id: idClienteParametro } = useParams<{ id: string }>()
  const navegar = useNavigate()

  const [cliente, establecerCliente] = React.useState<Cliente | null>(null)
  const [listaPerfiles, establecerListaPerfiles] = React.useState<
    PerfilUsuario[]
  >([])
  const [serviciosContratados, establecerServiciosContratados] = React.useState<
    FilaServicio[]
  >([])
  const [expedientesCliente, establecerExpedientesCliente] = React.useState<
    FilaExpedienteCliente[]
  >([])
  const [vencimientosCliente, establecerVencimientosCliente] = React.useState<
    FilaVencimientoCliente[]
  >([])
  const [nombresObligaciones, establecerNombresObligaciones] = React.useState<
    Map<string, string>
  >(new Map())
  const [cobrosCliente, establecerCobrosCliente] = React.useState<
    FilaCobroCliente[]
  >([])
  const [cargando, establecerCargando] = React.useState(true)
  const [noEncontrado, establecerNoEncontrado] = React.useState(false)
  const [dialogoAbierto, establecerDialogoAbierto] = React.useState(false)

  const cargarDatosFicha = React.useCallback(async () => {
    if (!idClienteParametro) return
    establecerCargando(true)
    const [
      respuestaCliente,
      respuestaPerfiles,
      respuestaServicios,
      respuestaServiciosCliente,
      respuestaExpedientes,
      respuestaVencimientos,
      respuestaObligaciones,
      respuestaCobros,
    ] = await Promise.all([
      baseDeDatos
        .from("clients")
        .select("*")
        .eq("id", idClienteParametro)
        .maybeSingle(),
      baseDeDatos.from("profiles").select("*").order("name"),
      baseDeDatos.from("services").select("id, name, description").order("name"),
      baseDeDatos
        .from("client_services")
        .select("service_id, active")
        .eq("client_id", idClienteParametro)
        .eq("active", true),
      baseDeDatos
        .from("files")
        .select("id, code, period_year, period_month, status, due_date")
        .eq("client_id", idClienteParametro)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false }),
      baseDeDatos
        .from("deadline_tasks")
        .select("id, obligation_id, period_year, period_month, due_date, status")
        .eq("client_id", idClienteParametro)
        .order("due_date", { ascending: false })
        .limit(12),
      baseDeDatos.from("fiscal_obligations").select("id, name"),
      baseDeDatos
        .from("collections")
        .select(
          "id, period_year, period_month, amount, deposited_amount, status, posted_to_banks"
        )
        .eq("client_id", idClienteParametro)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false })
        .limit(12),
    ])

    if (respuestaCliente.error) {
      establecerNoEncontrado(true)
      establecerCliente(null)
    } else {
      establecerCliente(respuestaCliente.data)
      establecerNoEncontrado(!respuestaCliente.data)
    }
    establecerListaPerfiles(respuestaPerfiles.data ?? [])

    const todosLosServicios = (respuestaServicios.data ?? []) as FilaServicio[]
    const idsServiciosActivos = new Set(
      (
        (respuestaServiciosCliente.data ?? []) as { service_id: string }[]
      ).map((fila) => fila.service_id)
    )
    establecerServiciosContratados(
      todosLosServicios.filter((servicio) =>
        idsServiciosActivos.has(servicio.id)
      )
    )
    establecerExpedientesCliente(
      (respuestaExpedientes.data ?? []) as FilaExpedienteCliente[]
    )
    establecerVencimientosCliente(
      (respuestaVencimientos.data ?? []) as FilaVencimientoCliente[]
    )

    const mapaObligaciones = new Map<string, string>()
    ;(
      (respuestaObligaciones.data ?? []) as { id: string; name: string }[]
    ).forEach((obligacion) =>
      mapaObligaciones.set(obligacion.id, obligacion.name)
    )
    establecerNombresObligaciones(mapaObligaciones)
    establecerCobrosCliente((respuestaCobros.data ?? []) as FilaCobroCliente[])
    establecerCargando(false)
  }, [idClienteParametro])

  React.useEffect(() => {
    void cargarDatosFicha()
  }, [cargarDatosFicha])

  const mapaPerfilPorId = React.useMemo(() => {
    const mapa = new Map<string, PerfilUsuario>()
    listaPerfiles.forEach((perfil) => mapa.set(perfil.id, perfil))
    return mapa
  }, [listaPerfiles])

  if (cargando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (noEncontrado || !cliente) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium">Cliente no encontrado</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Puede que haya sido eliminado o que la dirección sea incorrecta.
        </p>
        <Button className="mt-4" onClick={() => navegar("/clientes")}>
          Volver a Clientes
        </Button>
      </div>
    )
  }

  const responsablePrincipal = cliente.responsible_user_id
    ? mapaPerfilPorId.get(cliente.responsible_user_id)
    : null
  const responsableSecundario = cliente.secondary_user_id
    ? mapaPerfilPorId.get(cliente.secondary_user_id)
    : null

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="size-8" asChild>
            <Link to="/clientes" title="Volver a Clientes">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-semibold tracking-tight">
                {cliente.legal_name}
              </h2>
              <PanelAyudaModulo variante="icon-only" />
            </div>
            <p className="text-sm text-muted-foreground">
              {cliente.code} · RTN {cliente.rtn}
            </p>
          </div>
        </div>
        <Button onClick={() => establecerDialogoAbierto(true)}>
          Editar cliente
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4" />
              Datos generales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ElementoDetalle
              etiqueta="Nombre comercial"
              valor={cliente.commercial_name}
            />
            <ElementoDetalle
              etiqueta="Tipo"
              valor={
                cliente.client_type === "empresa"
                  ? "Empresa"
                  : "Persona individual"
              }
            />
            <ElementoDetalle
              etiqueta="Estado"
              valor={
                <Badge
                  variant={
                    cliente.status === "activo"
                      ? "secondary"
                      : cliente.status === "inactivo"
                        ? "outline"
                        : "destructive"
                  }
                >
                  {cliente.status.charAt(0).toUpperCase() +
                    cliente.status.slice(1)}
                </Badge>
              }
            />
            <ElementoDetalle
              etiqueta="Cliente de Quimistán"
              valor={cliente.is_quimistan ? "Sí" : "No"}
            />
            <ElementoDetalle
              etiqueta="Declaración en cero"
              valor={cliente.zero_declaration_status === "si" ? "Sí" : "No"}
            />
            <ElementoDetalle etiqueta="Notas" valor={cliente.notes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="size-4" />
              Contacto y ubicación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ElementoDetalle
              icono={Phone}
              etiqueta="Teléfono"
              valor={cliente.phone}
            />
            <ElementoDetalle
              icono={Phone}
              etiqueta="WhatsApp"
              valor={cliente.whatsapp}
            />
            <ElementoDetalle
              icono={Mail}
              etiqueta="Correo"
              valor={cliente.email}
            />
            <ElementoDetalle
              icono={User}
              etiqueta="Persona de contacto"
              valor={cliente.contact_name}
            />
            <Separator className="my-2" />
            <ElementoDetalle
              icono={MapPin}
              etiqueta="Dirección"
              valor={
                [cliente.address, cliente.municipality, cliente.department]
                  .filter(Boolean)
                  .join(", ") || null
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4" />
              Equipo asignado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ElementoDetalle
              etiqueta="Responsable principal"
              valor={
                responsablePrincipal ? responsablePrincipal.name : "Sin asignar"
              }
            />
            <ElementoDetalle
              etiqueta="Responsable secundario"
              valor={
                responsableSecundario
                  ? responsableSecundario.name
                  : "Sin asignar"
              }
            />
            <p className="pt-2 text-xs text-muted-foreground">
              Los responsables se asignan desde la edición del cliente.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ElementoDetalle
              etiqueta="Fecha de alta"
              valor={formatearFecha(cliente.created_at)}
            />
            <ElementoDetalle
              etiqueta="Última actualización"
              valor={formatearFecha(cliente.updated_at)}
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="size-4" />
              Servicios contratados
              <Badge variant="outline">{serviciosContratados.length}</Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => establecerDialogoAbierto(true)}
            >
              Gestionar servicios
            </Button>
          </CardHeader>
          <CardContent>
            {serviciosContratados.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este cliente aún no tiene servicios contratados asignados. Haga
                clic en &ldquo;Gestionar servicios&rdquo; o &ldquo;Editar
                cliente&rdquo; para asignarlos.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {serviciosContratados.map((servicio) => (
                  <div
                    key={servicio.id}
                    className="rounded-lg border bg-muted/20 px-3 py-2"
                  >
                    <p className="text-sm font-medium">{servicio.name}</p>
                    {servicio.description && (
                      <p className="text-xs text-muted-foreground">
                        {servicio.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderKanban className="size-4" />
              Expedientes mensuales
              <Badge variant="outline">{expedientesCliente.length}</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/expedientes">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {expedientesCliente.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay expedientes registrados para este cliente.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expedientesCliente.map((expediente) => (
                    <TableRow key={expediente.id}>
                      <TableCell>
                        <Link
                          to={`/expedientes/${expediente.id}`}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {expediente.code}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {String(expediente.period_month).padStart(2, "0")}/
                        {expediente.period_year}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            expediente.status === "aprobado"
                              ? "secondary"
                              : expediente.status === "rechazado"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {(
                            ETIQUETAS_ESTADO_EXPEDIENTE as Record<
                              string,
                              string
                            >
                          )[expediente.status] ?? expediente.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4" />
              Obligaciones y vencimientos
              <Badge variant="outline">{vencimientosCliente.length}</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/calendario">Ir al calendario</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {vencimientosCliente.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin vencimientos generados para este cliente.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Obligación</TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vencimientosCliente.map((vencimiento) => (
                    <TableRow key={vencimiento.id}>
                      <TableCell className="font-medium">
                        {nombresObligaciones.get(vencimiento.obligation_id) ??
                          "Obligación"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatearFecha(vencimiento.due_date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            vencimiento.status === "completado"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {(ETIQUETAS_ESTADO_TAREA as Record<string, string>)[
                            vencimiento.status
                          ] ?? vencimiento.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="size-4" />
              Historial de cobros y honorarios
              <Badge variant="outline">{cobrosCliente.length}</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/cobros">Ir a Cobros</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {cobrosCliente.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No se han registrado cobros para este cliente todavía.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Facturado</TableHead>
                    <TableHead>Depositado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Bancos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cobrosCliente.map((cobro) => (
                    <TableRow key={cobro.id}>
                      <TableCell className="font-mono text-xs">
                        {String(cobro.period_month).padStart(2, "0")}/
                        {cobro.period_year}
                      </TableCell>
                      <TableCell>
                        L{" "}
                        {Number(cobro.amount || 0).toLocaleString("es-HN", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        L{" "}
                        {Number(cobro.deposited_amount || 0).toLocaleString(
                          "es-HN",
                          { minimumFractionDigits: 2 }
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            cobro.status === "conciliado" ||
                            cobro.status === "cobrado"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {(ETIQUETAS_ESTADO_COBRO as Record<string, string>)[
                            cobro.status
                          ] ?? cobro.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            cobro.posted_to_banks ? "secondary" : "outline"
                          }
                        >
                          {cobro.posted_to_banks ? "Posteado" : "Pendiente"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <DialogoCliente
        abierto={dialogoAbierto}
        alCambiarAbierto={establecerDialogoAbierto}
        cliente={cliente}
        alGuardar={cargarDatosFicha}
      />
    </div>
  )
}

export const ClientDetail = PaginaDetalleCliente

