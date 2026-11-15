import * as React from "react"
import { Link } from "react-router-dom"
import {
  Download,
  FileText,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { EncabezadoPagina } from "@/componentes/encabezado-pagina"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import { formatearFecha } from "@/utilidades/fechas"

type DocumentoBoveda = {
  id: string
  file_id: string
  document_type_id: string | null
  name: string
  is_physical: boolean
  storage_path: string | null
  notes: string | null
  received_at: string
}

type ExpedienteResumido = { id: string; code: string; client_id: string }
type ClienteResumido = { id: string; legal_name: string }
type TipoDocumentoResumido = { id: string; name: string }

export function PaginaDocumentos() {
  const [listaDocumentos, establecerListaDocumentos] = React.useState<
    DocumentoBoveda[]
  >([])
  const [listaExpedientes, establecerListaExpedientes] = React.useState<
    ExpedienteResumido[]
  >([])
  const [listaClientes, establecerListaClientes] = React.useState<
    ClienteResumido[]
  >([])
  const [tiposDocumento, establecerTiposDocumento] = React.useState<
    TipoDocumentoResumido[]
  >([])
  const [cargando, establecerCargando] = React.useState(true)
  const [mensajeError, establecerMensajeError] = React.useState<string | null>(
    null
  )

  const [textoBusqueda, establecerTextoBusqueda] = React.useState("")
  const [filtroCliente, establecerFiltroCliente] =
    React.useState<string>("todos")
  const [filtroFormato, establecerFiltroFormato] =
    React.useState<string>("todos")

  const [dialogoAbierto, establecerDialogoAbierto] = React.useState(false)
  const [idExpedienteSeleccionado, establecerIdExpedienteSeleccionado] =
    React.useState<string>("")
  const [nombreDocumento, establecerNombreDocumento] = React.useState("")
  const [idTipoDocumento, establecerIdTipoDocumento] =
    React.useState<string>("")
  const [esFisico, establecerEsFisico] = React.useState(false)
  const [archivoASubir, establecerArchivoASubir] = React.useState<File | null>(
    null
  )
  const [guardando, establecerGuardando] = React.useState(false)

  const cargarBovedaDocumentos = React.useCallback(async () => {
    establecerCargando(true)
    const [
      respuestaDocumentos,
      respuestaExpedientes,
      respuestaClientes,
      respuestaTipos,
    ] = await Promise.all([
      baseDeDatos
        .from("file_documents")
        .select("*")
        .order("received_at", { ascending: false }),
      baseDeDatos
        .from("files")
        .select("id, code, client_id")
        .order("code", { ascending: false }),
      baseDeDatos
        .from("clients")
        .select("id, legal_name")
        .order("legal_name"),
      baseDeDatos
        .from("document_types")
        .select("id, name")
        .eq("active", true)
        .order("name"),
    ])
    if (
      respuestaDocumentos.error ||
      respuestaExpedientes.error ||
      respuestaClientes.error
    ) {
      establecerMensajeError("No se pudieron cargar los documentos.")
      establecerListaDocumentos([])
    } else {
      establecerListaDocumentos(
        (respuestaDocumentos.data as DocumentoBoveda[]) ?? []
      )
      establecerListaExpedientes(respuestaExpedientes.data ?? [])
      establecerListaClientes(respuestaClientes.data ?? [])
      establecerTiposDocumento(respuestaTipos.data ?? [])
      establecerMensajeError(null)
    }
    establecerCargando(false)
  }, [])

  React.useEffect(() => {
    void cargarBovedaDocumentos()
  }, [cargarBovedaDocumentos])

  const mapaExpedientePorId = React.useMemo(() => {
    const mapa = new Map<string, ExpedienteResumido>()
    listaExpedientes.forEach((expediente) => mapa.set(expediente.id, expediente))
    return mapa
  }, [listaExpedientes])

  const mapaNombreClientePorExpediente = React.useMemo(() => {
    const mapa = new Map<string, string>()
    listaExpedientes.forEach((expediente) => {
      const cliente = listaClientes.find(
        (itemCliente) => itemCliente.id === expediente.client_id
      )
      if (cliente) mapa.set(expediente.id, cliente.legal_name)
    })
    return mapa
  }, [listaExpedientes, listaClientes])

  const mapaTipoDocumentoPorId = React.useMemo(() => {
    const mapa = new Map<string, string>()
    tiposDocumento.forEach((tipo) => mapa.set(tipo.id, tipo.name))
    return mapa
  }, [tiposDocumento])

  const documentosFiltrados = React.useMemo(() => {
    const consulta = textoBusqueda.trim().toLowerCase()
    return listaDocumentos.filter((documento) => {
      const expediente = mapaExpedientePorId.get(documento.file_id)
      if (filtroCliente !== "todos" && expediente?.client_id !== filtroCliente)
        return false
      if (filtroFormato === "fisico" && !documento.is_physical) return false
      if (filtroFormato === "digital" && documento.is_physical) return false
      if (!consulta) return true
      return (
        documento.name.toLowerCase().includes(consulta) ||
        (mapaNombreClientePorExpediente
          .get(documento.file_id)
          ?.toLowerCase()
          .includes(consulta) ??
          false) ||
        (expediente?.code.toLowerCase().includes(consulta) ?? false)
      )
    })
  }, [
    listaDocumentos,
    textoBusqueda,
    filtroCliente,
    filtroFormato,
    mapaExpedientePorId,
    mapaNombreClientePorExpediente,
  ])

  const abrirDialogoSubida = () => {
    establecerIdExpedienteSeleccionado(listaExpedientes[0]?.id ?? "")
    establecerNombreDocumento("")
    establecerIdTipoDocumento("")
    establecerEsFisico(false)
    establecerArchivoASubir(null)
    establecerDialogoAbierto(true)
  }

  const guardarDocumentoEnBoveda = async () => {
    if (!idExpedienteSeleccionado) {
      toast.error("Seleccione el expediente al que pertenece el documento.")
      return
    }
    if (!nombreDocumento.trim()) {
      toast.error("Escriba el nombre del documento.")
      return
    }
    if (!esFisico && !archivoASubir) {
      toast.error(
        "Seleccione el archivo digital o marque el documento como físico."
      )
      return
    }

    establecerGuardando(true)
    try {
      const { data: datosUsuario } = await baseDeDatos.auth.getUser()
      let rutaAlmacenamiento: string | null = null

      if (!esFisico && archivoASubir) {
        const rutaDestino = `expedientes/${idExpedienteSeleccionado}/${Date.now()}-${archivoASubir.name}`
        const { error: errorSubida } = await baseDeDatos.storage
          .from("documentos")
          .upload(rutaDestino, archivoASubir)
        if (errorSubida) {
          toast.error("No se pudo subir el archivo: " + errorSubida.message)
          return
        }
        rutaAlmacenamiento = rutaDestino
      }

      const { error: errorInsercion } = await baseDeDatos
        .from("file_documents")
        .insert({
          file_id: idExpedienteSeleccionado,
          document_type_id: idTipoDocumento || null,
          name: nombreDocumento.trim(),
          is_physical: esFisico,
          storage_path: rutaAlmacenamiento,
          received_by: datosUsuario.user?.id ?? null,
        })

      if (errorInsercion) {
        toast.error(
          "No se pudo registrar el documento: " + errorInsercion.message
        )
        return
      }

      toast.success("Documento registrado en la bóveda")
      establecerDialogoAbierto(false)
      await cargarBovedaDocumentos()
    } finally {
      establecerGuardando(false)
    }
  }

  const descargarDocumento = async (documento: DocumentoBoveda) => {
    if (!documento.storage_path) return
    const { data, error: errorFirma } = await baseDeDatos.storage
      .from("documentos")
      .createSignedUrl(documento.storage_path, 300)
    if (errorFirma || !data?.signedUrl) {
      toast.error("No se pudo generar el enlace de descarga.")
      return
    }
    window.open(data.signedUrl, "_blank")
  }

  const eliminarDocumento = async (documento: DocumentoBoveda) => {
    if (documento.storage_path) {
      await baseDeDatos.storage
        .from("documentos")
        .remove([documento.storage_path])
    }
    const { error: errorBorrado } = await baseDeDatos
      .from("file_documents")
      .delete()
      .eq("id", documento.id)
    if (errorBorrado) {
      toast.error("No se pudo eliminar el documento.")
      return
    }
    toast.success("Documento eliminado")
    await cargarBovedaDocumentos()
  }

  return (
    <div>
      <EncabezadoPagina
        titulo="Documentos"
        descripcion="Bóveda central de documentos físicos y digitales asociados a los expedientes."
        acciones={
          <Button onClick={abrirDialogoSubida}>
            <Plus className="size-4" />
            Subir documento
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por documento, cliente o expediente…"
            value={textoBusqueda}
            onChange={(evento) => establecerTextoBusqueda(evento.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filtroCliente} onValueChange={establecerFiltroCliente}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los clientes</SelectItem>
            {listaClientes.map((cliente) => (
              <SelectItem key={cliente.id} value={cliente.id}>
                {cliente.legal_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroFormato} onValueChange={establecerFiltroFormato}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Ambos formatos</SelectItem>
            <SelectItem value="digital">Digitales</SelectItem>
            <SelectItem value="fisico">Físicos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {cargando && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Cargando documentos…
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
                  <TableHead>Documento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Expediente</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Recibido</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentosFiltrados.map((documento) => {
                  const expediente = mapaExpedientePorId.get(documento.file_id)
                  return (
                    <TableRow key={documento.id}>
                      <TableCell className="font-medium">
                        {documento.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {documento.document_type_id
                          ? (mapaTipoDocumentoPorId.get(
                              documento.document_type_id
                            ) ?? "—")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {mapaNombreClientePorExpediente.get(
                          documento.file_id
                        ) ?? "—"}
                      </TableCell>
                      <TableCell>
                        {expediente ? (
                          <Link
                            to={`/expedientes/${expediente.id}`}
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {expediente.code}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            documento.is_physical ? "outline" : "secondary"
                          }
                        >
                          {documento.is_physical ? "Físico" : "Digital"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatearFecha(documento.received_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {!documento.is_physical && documento.storage_path && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title="Ver / Descargar"
                              onClick={() => void descargarDocumento(documento)}
                            >
                              <Download className="size-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive"
                            title="Eliminar"
                            onClick={() => void eliminarDocumento(documento)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {documentosFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="size-6" />
                        <p className="text-sm">
                          {listaDocumentos.length === 0
                            ? "No hay documentos registrados. Use el botón 'Subir documento' para agregar uno."
                            : "Ningún documento coincide con la búsqueda o los filtros."}
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

      <Dialog open={dialogoAbierto} onOpenChange={establecerDialogoAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subir documento a la bóveda</DialogTitle>
            <DialogDescription>
              Asocie un archivo digital o registre un documento físico en un
              expediente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Expediente *</Label>
              <Select
                value={idExpedienteSeleccionado}
                onValueChange={establecerIdExpedienteSeleccionado}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione un expediente" />
                </SelectTrigger>
                <SelectContent>
                  {listaExpedientes.map((expediente) => (
                    <SelectItem key={expediente.id} value={expediente.id}>
                      {expediente.code} —{" "}
                      {mapaNombreClientePorExpediente.get(expediente.id) ??
                        "Cliente"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vault-doc-name">Nombre del documento *</Label>
              <Input
                id="vault-doc-name"
                value={nombreDocumento}
                onChange={(evento) =>
                  establecerNombreDocumento(evento.target.value)
                }
                placeholder="Ej. Declaración IVA Octubre 2026"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de documento</Label>
              <Select
                value={idTipoDocumento}
                onValueChange={establecerIdTipoDocumento}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposDocumento.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="vault-is-physical">Documento físico</Label>
                <p className="text-xs text-muted-foreground">
                  Recibido en papel, sin archivo digital adjunto
                </p>
              </div>
              <Switch
                id="vault-is-physical"
                checked={esFisico}
                onCheckedChange={establecerEsFisico}
              />
            </div>
            {!esFisico && (
              <div className="space-y-2">
                <Label htmlFor="vault-doc-file">Archivo digital *</Label>
                <Input
                  id="vault-doc-file"
                  type="file"
                  onChange={(evento) =>
                    establecerArchivoASubir(evento.target.files?.[0] ?? null)
                  }
                />
                {archivoASubir && (
                  <p className="text-xs text-muted-foreground">
                    {archivoASubir.name} ({Math.round(archivoASubir.size / 1024)}{" "}
                    KB)
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => establecerDialogoAbierto(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void guardarDocumentoEnBoveda()}
              disabled={guardando}
            >
              {guardando && <Loader2 className="mr-2 size-4 animate-spin" />}
              Registrar documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const Documents = PaginaDocumentos

