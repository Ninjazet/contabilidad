import * as React from "react"
import { Link } from "react-router-dom"
import { Eye, Loader2, Plus, Search } from "lucide-react"

import { EncabezadoPagina } from "@/componentes/encabezado-pagina"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DialogoCliente } from "@/componentes/clientes/dialogo-cliente"
import { ETIQUETAS_ESTADO_CLIENTE } from "@/configuracion/parametros-sistema"
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import { obtenerInicialesNombre } from "@/utilidades/fechas"
import type { Cliente, EstadoCliente, PerfilUsuario } from "@/utilidades/tipos"

function obtenerVarianteInsigniaEstado(
  estado: EstadoCliente
): "secondary" | "outline" | "destructive" {
  if (estado === "activo") return "secondary"
  if (estado === "inactivo") return "outline"
  return "destructive"
}

export function PaginaClientes() {
  const [listaClientes, establecerListaClientes] = React.useState<Cliente[]>([])
  const [listaPerfiles, establecerListaPerfiles] = React.useState<
    PerfilUsuario[]
  >([])
  const [cargando, establecerCargando] = React.useState(true)
  const [mensajeError, establecerMensajeError] = React.useState<string | null>(
    null
  )

  const [textoBusqueda, establecerTextoBusqueda] = React.useState("")
  const [filtroEstado, establecerFiltroEstado] = React.useState<string>("todos")
  const [filtroTipo, establecerFiltroTipo] = React.useState<string>("todos")

  const [dialogoAbierto, establecerDialogoAbierto] = React.useState(false)
  const [clienteEnEdicion, establecerClienteEnEdicion] =
    React.useState<Cliente | null>(null)

  const cargarDatosClientes = React.useCallback(async () => {
    establecerCargando(true)
    const [respuestaClientes, respuestaPerfiles] = await Promise.all([
      baseDeDatos.from("clients").select("*").order("code"),
      baseDeDatos.from("profiles").select("*").order("name"),
    ])
    if (respuestaClientes.error || respuestaPerfiles.error) {
      establecerMensajeError("No se pudieron cargar los clientes.")
      establecerListaClientes([])
      establecerListaPerfiles([])
    } else {
      establecerListaClientes(respuestaClientes.data ?? [])
      establecerListaPerfiles(respuestaPerfiles.data ?? [])
      establecerMensajeError(null)
    }
    establecerCargando(false)
  }, [])

  React.useEffect(() => {
    void cargarDatosClientes()
  }, [cargarDatosClientes])

  const mapaPerfilPorId = React.useMemo(() => {
    const mapa = new Map<string, PerfilUsuario>()
    listaPerfiles.forEach((perfil) => mapa.set(perfil.id, perfil))
    return mapa
  }, [listaPerfiles])

  const clientesFiltrados = React.useMemo(() => {
    const consulta = textoBusqueda.trim().toLowerCase()
    return listaClientes.filter((cliente) => {
      if (filtroEstado !== "todos" && cliente.status !== filtroEstado)
        return false
      if (filtroTipo !== "todos" && cliente.client_type !== filtroTipo)
        return false
      if (!consulta) return true
      return (
        cliente.legal_name.toLowerCase().includes(consulta) ||
        (cliente.commercial_name?.toLowerCase().includes(consulta) ?? false) ||
        cliente.rtn.includes(consulta) ||
        cliente.code.toLowerCase().includes(consulta)
      )
    })
  }, [listaClientes, textoBusqueda, filtroEstado, filtroTipo])

  const abrirNuevoCliente = () => {
    establecerClienteEnEdicion(null)
    establecerDialogoAbierto(true)
  }

  const abrirEdicionCliente = (cliente: Cliente) => {
    establecerClienteEnEdicion(cliente)
    establecerDialogoAbierto(true)
  }

  return (
    <div>
      <EncabezadoPagina
        titulo="Clientes"
        descripcion="Registro de clientes de la firma y sus datos principales."
        acciones={
          <Button onClick={abrirNuevoCliente}>
            <Plus className="size-4" />
            Nuevo cliente
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, RTN o código…"
            value={textoBusqueda}
            onChange={(evento) => establecerTextoBusqueda(evento.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filtroEstado} onValueChange={establecerFiltroEstado}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="inactivo">Inactivos</SelectItem>
            <SelectItem value="suspendido">Suspendidos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={establecerFiltroTipo}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="empresa">Empresas</SelectItem>
            <SelectItem value="persona">Personas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {cargando && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Cargando clientes…
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
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>RTN</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesFiltrados.map((cliente) => {
                  const responsableAsignado = cliente.responsible_user_id
                    ? mapaPerfilPorId.get(cliente.responsible_user_id)
                    : null
                  return (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-mono text-xs">
                        {cliente.code}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {cliente.legal_name}
                          </span>
                          {cliente.commercial_name && (
                            <span className="text-xs text-muted-foreground">
                              {cliente.commercial_name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {cliente.rtn}
                      </TableCell>
                      <TableCell>
                        {responsableAsignado ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="size-6">
                              <AvatarFallback className="text-[10px]">
                                {obtenerInicialesNombre(
                                  responsableAsignado.name
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {responsableAsignado.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Sin asignar
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={obtenerVarianteInsigniaEstado(
                            cliente.status
                          )}
                        >
                          {ETIQUETAS_ESTADO_CLIENTE[cliente.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="size-8"
                          >
                            <Link
                              to={`/clientes/${cliente.id}`}
                              title="Ver ficha"
                            >
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => abrirEdicionCliente(cliente)}
                            title="Editar"
                          >
                            <Plus className="hidden" />
                            <span className="sr-only">Editar</span>
                            <svg
                              className="size-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              <path d="m15 5 4 4" />
                            </svg>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {clientesFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Search className="size-6" />
                        <p className="text-sm">
                          {listaClientes.length === 0
                            ? "Aún no hay clientes registrados. Cree el primero con el botón 'Nuevo cliente'."
                            : "Ningún cliente coincide con la búsqueda o los filtros."}
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

      <DialogoCliente
        abierto={dialogoAbierto}
        alCambiarAbierto={establecerDialogoAbierto}
        cliente={clienteEnEdicion}
        alGuardar={cargarDatosClientes}
      />
    </div>
  )
}

export const Clients = PaginaClientes

