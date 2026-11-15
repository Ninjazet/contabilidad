import * as React from "react"
import { Download, History, Loader2, Search } from "lucide-react"
import { toast } from "sonner"

import { EncabezadoPagina } from "@/componentes/encabezado-pagina"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  ETIQUETAS_TABLAS_AUDITORIA,
  ETIQUETAS_ACCION_AUDITORIA,
} from "@/configuracion/parametros-sistema"
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import { formatearFechaHora } from "@/utilidades/fechas"
import { descargarArchivoCsv } from "@/utilidades/exportar-csv"
import type { AccionAuditoria, RegistroAuditoria } from "@/utilidades/tipos"

function obtenerVarianteAccionAuditoria(
  accion: AccionAuditoria
): "secondary" | "outline" | "destructive" {
  if (accion === "create") return "secondary"
  if (accion === "delete") return "destructive"
  return "outline"
}

export function PaginaAuditoria() {
  const [registrosAuditoria, establecerRegistrosAuditoria] = React.useState<
    RegistroAuditoria[]
  >([])
  const [cargando, establecerCargando] = React.useState(true)
  const [mensajeError, establecerMensajeError] = React.useState<string | null>(
    null
  )
  const [sinAcceso, establecerSinAcceso] = React.useState(false)

  const [textoBusqueda, establecerTextoBusqueda] = React.useState("")
  const [filtroAccion, establecerFiltroAccion] = React.useState<string>("todas")
  const [filtroModulo, establecerFiltroModulo] = React.useState<string>("todas")

  React.useEffect(() => {
    const cargarBitacoraAuditoria = async () => {
      establecerCargando(true)
      const { data, error } = await baseDeDatos
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300)

      if (error) {
        if (
          error.code === "42501" ||
          error.message.includes("row-level security")
        ) {
          establecerSinAcceso(true)
        } else {
          establecerMensajeError("No se pudo cargar el historial.")
        }
        establecerRegistrosAuditoria([])
      } else {
        establecerRegistrosAuditoria(data ?? [])
        establecerSinAcceso(false)
        establecerMensajeError(null)
      }
      establecerCargando(false)
    }
    void cargarBitacoraAuditoria()
  }, [])

  const registrosFiltrados = registrosAuditoria.filter((registro) => {
    if (filtroAccion !== "todas" && registro.action !== filtroAccion)
      return false
    if (filtroModulo !== "todas" && registro.table_name !== filtroModulo)
      return false
    const consulta = textoBusqueda.trim().toLowerCase()
    if (!consulta) return true
    return (
      registro.actor_name.toLowerCase().includes(consulta) ||
      registro.summary.toLowerCase().includes(consulta) ||
      (ETIQUETAS_TABLAS_AUDITORIA[registro.table_name] ?? registro.table_name)
        .toLowerCase()
        .includes(consulta)
    )
  })

  const exportarBitacoraCsv = () => {
    if (registrosFiltrados.length === 0) {
      toast.info("No hay registros de auditoría para exportar.")
      return
    }
    descargarArchivoCsv(
      `auditoria-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "ID",
        "Fecha y Hora",
        "Usuario",
        "Acción",
        "Módulo",
        "Detalle",
        "Campos Modificados",
      ],
      registrosFiltrados.map((registro) => [
        registro.id,
        formatearFechaHora(registro.created_at),
        registro.actor_name,
        ETIQUETAS_ACCION_AUDITORIA[registro.action] ?? registro.action,
        ETIQUETAS_TABLAS_AUDITORIA[registro.table_name] ?? registro.table_name,
        registro.summary,
        (registro.changed_fields ?? []).join(", "),
      ])
    )
    toast.success("CSV de Auditoría descargado")
  }

  return (
    <div>
      <EncabezadoPagina
        titulo="Auditoría"
        descripcion="Historial de cambios y actividad de los usuarios."
        acciones={
          <Button variant="outline" onClick={exportarBitacoraCsv}>
            <Download className="mr-2 size-4" />
            Exportar CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuario o detalle…"
            value={textoBusqueda}
            onChange={(evento) => establecerTextoBusqueda(evento.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filtroAccion} onValueChange={establecerFiltroAccion}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las acciones</SelectItem>
            <SelectItem value="create">Creaciones</SelectItem>
            <SelectItem value="update">Actualizaciones</SelectItem>
            <SelectItem value="delete">Eliminaciones</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroModulo} onValueChange={establecerFiltroModulo}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos los módulos</SelectItem>
            <SelectItem value="clients">Clientes</SelectItem>
            <SelectItem value="client_services">
              Servicios por cliente
            </SelectItem>
            <SelectItem value="files">Expedientes</SelectItem>
            <SelectItem value="file_documents">Documentos</SelectItem>
            <SelectItem value="file_checklist_items">
              Tareas de expediente
            </SelectItem>
            <SelectItem value="deadline_tasks">Vencimientos</SelectItem>
            <SelectItem value="monthly_master_control">
              Control Maestro
            </SelectItem>
            <SelectItem value="informative_tasks">Informativas</SelectItem>
            <SelectItem value="dmc_checks">Checklist DMC</SelectItem>
            <SelectItem value="collections">Cobros y Caja</SelectItem>
            <SelectItem value="quimistan_visits">Visitas Quimistán</SelectItem>
            <SelectItem value="accounting_tasks">Contabilidad</SelectItem>
            <SelectItem value="profiles">Personal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {cargando && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Cargando historial…
        </div>
      )}

      {sinAcceso && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <History className="size-8" />
            <p className="text-sm">
              El historial de auditoría está disponible para el Administrador y
              el Gerente de Operaciones.
            </p>
          </CardContent>
        </Card>
      )}

      {mensajeError && !sinAcceso && (
        <Card className="border-destructive/50">
          <CardContent className="py-8 text-center text-sm text-destructive">
            {mensajeError}
          </CardContent>
        </Card>
      )}

      {!cargando && !mensajeError && !sinAcceso && (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha y hora</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrosFiltrados.map((registro) => (
                  <TableRow key={registro.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatearFechaHora(registro.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {registro.actor_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ETIQUETAS_TABLAS_AUDITORIA[registro.table_name] ??
                        registro.table_name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={obtenerVarianteAccionAuditoria(registro.action)}
                      >
                        {ETIQUETAS_ACCION_AUDITORIA[registro.action]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {registro.summary ||
                        (registro.changed_fields.length > 0
                          ? `Campos: ${registro.changed_fields.join(", ")}`
                          : "—")}
                    </TableCell>
                  </TableRow>
                ))}
                {registrosFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <History className="size-6" />
                        <p className="text-sm">
                          {registrosAuditoria.length === 0
                            ? "Aún no hay actividad registrada."
                            : "Ningún registro coincide con la búsqueda o los filtros."}
                        </p>
                      </div>
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

export const Audit = PaginaAuditoria

