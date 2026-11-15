import * as React from "react"
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileStack,
  FolderOpen,
  Users,
} from "lucide-react"
import { Link } from "react-router-dom"

import { EncabezadoPagina } from "@/componentes/encabezado-pagina"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { ACCESOS_RAPIDOS_PANEL } from "@/configuracion/parametros-sistema"
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import {
  sumarDiasIso,
  formatearFecha,
  formatearFechaLarga,
  fechaHoyIso,
} from "@/utilidades/fechas"
import { usarAutenticacion } from "@/ganchos/usar-autenticacion"
import { puedeAccederRol } from "@/utilidades/permisos"

type TareaVencimientoProxima = {
  id: string
  due_date: string
  status: "pendiente" | "en_proceso" | "completado"
  nombreObligacion: string
  nombreCliente: string
}

export function PaginaPanelPrincipal() {
  const { perfil } = usarAutenticacion()
  const [estadisticas, establecerEstadisticas] = React.useState({
    clientes: 0,
    expedientes: 0,
    documentos: 0,
    proximosVencimientos: 0,
  })
  const [proximasTareas, establecerProximasTareas] = React.useState<
    TareaVencimientoProxima[]
  >([])
  const [cantidadAtrasados, establecerCantidadAtrasados] = React.useState(0)
  const [progresoChecklist, establecerProgresoChecklist] = React.useState({
    completadas: 0,
    total: 0,
  })
  const [cargando, establecerCargando] = React.useState(true)

  React.useEffect(() => {
    const cargarDatosPanel = async () => {
      const fechaHoy = fechaHoyIso()
      const fechaEn30Dias = sumarDiasIso(30)

      const [
        respuestaClientes,
        respuestaExpedientes,
        respuestaDocumentos,
        respuestaTareasProximas,
        respuestaTareasAtrasadas,
      ] = await Promise.all([
        baseDeDatos.from("clients").select("id", { count: "exact", head: true }),
        baseDeDatos.from("files").select("id", { count: "exact", head: true }),
        baseDeDatos
          .from("file_documents")
          .select("id", { count: "exact", head: true }),
        baseDeDatos
          .from("deadline_tasks")
          .select("id, due_date, status, client_id, obligation_id")
          .gte("due_date", fechaHoy)
          .lte("due_date", fechaEn30Dias)
          .neq("status", "completado")
          .order("due_date"),
        baseDeDatos
          .from("deadline_tasks")
          .select("id, due_date, status, client_id, obligation_id")
          .lt("due_date", fechaHoy)
          .neq("status", "completado")
          .order("due_date"),
      ])

      establecerEstadisticas({
        clientes: respuestaClientes.count ?? 0,
        expedientes: respuestaExpedientes.count ?? 0,
        documentos: respuestaDocumentos.count ?? 0,
        proximosVencimientos:
          respuestaTareasProximas.count ??
          respuestaTareasProximas.data?.length ??
          0,
      })

      const idsObligaciones = Array.from(
        new Set(
          (respuestaTareasProximas.data ?? []).map(
            (tarea) => tarea.obligation_id
          )
        )
      )
      const idsClientes = Array.from(
        new Set(
          (respuestaTareasProximas.data ?? []).map((tarea) => tarea.client_id)
        )
      )

      const [respuestaObligaciones, respuestaNombresClientes] =
        await Promise.all([
          idsObligaciones.length
            ? baseDeDatos
                .from("fiscal_obligations")
                .select("id, name")
                .in("id", idsObligaciones)
            : Promise.resolve({ data: [], error: null }),
          idsClientes.length
            ? baseDeDatos
                .from("clients")
                .select("id, legal_name")
                .in("id", idsClientes)
            : Promise.resolve({ data: [], error: null }),
        ])

      const mapaObligaciones = new Map<string, string>()
      ;(respuestaObligaciones.data ?? []).forEach((obligacion) =>
        mapaObligaciones.set(obligacion.id, obligacion.name)
      )
      const mapaClientes = new Map<string, string>()
      ;(respuestaNombresClientes.data ?? []).forEach((cliente) =>
        mapaClientes.set(cliente.id, cliente.legal_name)
      )

      establecerProximasTareas(
        (respuestaTareasProximas.data ?? []).slice(0, 5).map((tarea) => ({
          id: tarea.id,
          due_date: tarea.due_date,
          status: tarea.status,
          nombreObligacion: mapaObligaciones.get(tarea.obligation_id) ?? "—",
          nombreCliente: mapaClientes.get(tarea.client_id) ?? "—",
        }))
      )
      establecerCantidadAtrasados(
        respuestaTareasAtrasadas.count ??
          respuestaTareasAtrasadas.data?.length ??
          0
      )

      const respuestaChecklist = await baseDeDatos
        .from("file_checklist_items")
        .select("status")

      const elementosChecklist = respuestaChecklist.data ?? []
      establecerProgresoChecklist({
        completadas: elementosChecklist.filter(
          (elemento) => elemento.status === "completado"
        ).length,
        total: elementosChecklist.length,
      })

      establecerCargando(false)
    }
    void cargarDatosPanel()
  }, [])

  const TARJETAS_RESUMEN = [
    {
      etiqueta: "Clientes",
      valor: estadisticas.clientes,
      icono: Users,
      ruta: "/clientes",
    },
    {
      etiqueta: "Expedientes",
      valor: estadisticas.expedientes,
      icono: FolderOpen,
      ruta: "/expedientes",
    },
    {
      etiqueta: "Documentos",
      valor: estadisticas.documentos,
      icono: FileStack,
      ruta: "/documentos",
    },
    {
      etiqueta: "Vencimientos (30 días)",
      valor: estadisticas.proximosVencimientos,
      icono: CalendarClock,
      ruta: "/calendario",
    },
  ]

  const porcentajeAvance =
    progresoChecklist.total === 0
      ? 0
      : Math.round(
          (progresoChecklist.completadas / progresoChecklist.total) * 100
        )

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Panel"
        descripcion={formatearFechaLarga(new Date())}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TARJETAS_RESUMEN.map((tarjeta) => (
          <Card
            key={tarjeta.etiqueta}
            className="hover:bg-muted/30 transition-colors"
          >
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <tarjeta.icono className="size-4" />
                {tarjeta.etiqueta}
              </CardDescription>
              {cargando ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <CardTitle className="text-2xl">{tarjeta.valor}</CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <Button
                asChild
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
              >
                <Link to={tarjeta.ruta}>
                  Ver {tarjeta.etiqueta.toLowerCase()}
                  <ArrowRight className="size-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Avance general del checklist</CardTitle>
          <CardDescription>
            Tareas de expedientes completadas sobre el total.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="size-4 text-primary" />
                {cargando
                  ? "Cargando…"
                  : `${progresoChecklist.completadas} de ${progresoChecklist.total} tareas`}
              </span>
              <span className="font-medium tabular-nums">
                {porcentajeAvance}%
              </span>
            </div>
            <Progress value={porcentajeAvance} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vencimientos próximos</CardTitle>
          <CardDescription>
            Obligaciones pendientes en los próximos 30 días.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {cantidadAtrasados > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              Tiene {cantidadAtrasados} vencimiento
              {cantidadAtrasados === 1 ? "" : "s"} atrasado
              {cantidadAtrasados === 1 ? "" : "s"} sin completar.
            </div>
          )}
          {cargando && <Skeleton className="h-20 w-full" />}
          {!cargando && proximasTareas.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No hay vencimientos pendientes en los próximos 30 días. Genere el
              mes desde el Calendario.
            </p>
          )}
          {proximasTareas.map((tarea) => (
            <div
              key={tarea.id}
              className="flex flex-wrap items-center gap-2 text-sm"
            >
              <CalendarClock className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {formatearFecha(tarea.due_date)}
              </span>
              <span className="font-medium">{tarea.nombreObligacion}</span>
              <span className="text-muted-foreground">
                · {tarea.nombreCliente}
              </span>
              <Badge variant="outline" className="ml-auto capitalize">
                {tarea.status.replace("_", " ")}
              </Badge>
            </div>
          ))}
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link to="/calendario">
              Ver calendario completo
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ir a</CardTitle>
          <CardDescription>Accesos rápidos a los módulos.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {ACCESOS_RAPIDOS_PANEL.filter((modulo) =>
            perfil ? puedeAccederRol(perfil.role_id, modulo.ruta) : true
          ).map((modulo) => (
            <Button key={modulo.ruta} asChild variant="outline" size="sm">
              <Link to={modulo.ruta}>
                {modulo.etiqueta}
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export const Dashboard = PaginaPanelPrincipal

