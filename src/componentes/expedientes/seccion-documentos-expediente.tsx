import * as React from "react"
import {
  Download,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import { formatearFecha } from "@/utilidades/fechas"

type TipoDocumentoCatalogo = { id: string; name: string }

type DocumentoExpediente = {
  id: string
  file_id: string
  document_type_id: string | null
  name: string
  is_physical: boolean
  storage_path: string | null
  notes: string | null
  received_at: string
}

export type PropiedadesSeccionDocumentosExpediente = {
  idExpediente?: string
  alCambiar?: () => void
  fileId?: string
  onChanged?: () => void
}

export function SeccionDocumentosExpediente({
  idExpediente,
  alCambiar,
  fileId,
  onChanged,
}: PropiedadesSeccionDocumentosExpediente) {
  const idExpedienteActual = idExpediente ?? fileId ?? ""
  const notificarCambio = alCambiar ?? onChanged

  const [documentos, establecerDocumentos] = React.useState<
    DocumentoExpediente[]
  >([])
  const [tiposDocumento, establecerTiposDocumento] = React.useState<
    TipoDocumentoCatalogo[]
  >([])
  const [cargando, establecerCargando] = React.useState(true)

  const [dialogoAbierto, establecerDialogoAbierto] = React.useState(false)
  const [nombreDocumento, establecerNombreDocumento] = React.useState("")
  const [idTipoDocumento, establecerIdTipoDocumento] =
    React.useState<string>("")
  const [esFisico, establecerEsFisico] = React.useState(false)
  const [archivoSubir, establecerArchivoSubir] = React.useState<File | null>(
    null
  )
  const [guardando, establecerGuardando] = React.useState(false)

  const cargarDocumentos = React.useCallback(async () => {
    establecerCargando(true)
    const [respuestaDocumentos, respuestaTipos] = await Promise.all([
      baseDeDatos
        .from("file_documents")
        .select("*")
        .eq("file_id", idExpedienteActual)
        .order("received_at", { ascending: false }),
      baseDeDatos.from("document_types").select("id, name").order("name"),
    ])
    if (respuestaDocumentos.error) {
      toast.error("No se pudieron cargar los documentos.")
      establecerDocumentos([])
    } else {
      establecerDocumentos(respuestaDocumentos.data ?? [])
    }
    establecerTiposDocumento(respuestaTipos.data ?? [])
    establecerCargando(false)
  }, [idExpedienteActual])

  React.useEffect(() => {
    void cargarDocumentos()
  }, [cargarDocumentos])

  const obtenerNombreTipo = (idTipo: string | null) =>
    idTipo
      ? (tiposDocumento.find((tipo) => tipo.id === idTipo)?.name ?? "—")
      : "—"

  const abrirDialogoNuevoDocumento = () => {
    establecerNombreDocumento("")
    establecerIdTipoDocumento("")
    establecerEsFisico(false)
    establecerArchivoSubir(null)
    establecerDialogoAbierto(true)
  }

  const guardarDocumento = async () => {
    if (!nombreDocumento.trim()) {
      toast.error("Escriba el nombre del documento.")
      return
    }
    if (!esFisico && !archivoSubir) {
      toast.error(
        "Seleccione el archivo digital o marque el documento como físico."
      )
      return
    }
    establecerGuardando(true)
    try {
      const { data: datosUsuario } = await baseDeDatos.auth.getUser()
      let rutaAlmacenamiento: string | null = null

      if (!esFisico && archivoSubir) {
        const rutaDestino = `expedientes/${idExpedienteActual}/${Date.now()}-${archivoSubir.name}`
        const { error: errorSubida } = await baseDeDatos.storage
          .from("documentos")
          .upload(rutaDestino, archivoSubir)
        if (errorSubida) {
          toast.error("No se pudo subir el archivo: " + errorSubida.message)
          return
        }
        rutaAlmacenamiento = rutaDestino
      }

      const { error } = await baseDeDatos.from("file_documents").insert({
        file_id: idExpedienteActual,
        document_type_id: idTipoDocumento || null,
        name: nombreDocumento.trim(),
        is_physical: esFisico,
        storage_path: rutaAlmacenamiento,
        received_by: datosUsuario.user?.id ?? null,
      })

      if (error) {
        toast.error("No se pudo registrar el documento: " + error.message)
        return
      }

      toast.success("Documento registrado")
      establecerDialogoAbierto(false)
      void cargarDocumentos()
      notificarCambio?.()
    } finally {
      establecerGuardando(false)
    }
  }

  const descargarDocumento = async (documento: DocumentoExpediente) => {
    if (!documento.storage_path) return
    const { data, error } = await baseDeDatos.storage
      .from("documentos")
      .createSignedUrl(documento.storage_path, 300)
    if (error || !data) {
      toast.error("No se pudo generar el enlace de descarga.")
      return
    }
    window.open(data.signedUrl, "_blank")
  }

  const eliminarDocumento = async (documento: DocumentoExpediente) => {
    if (documento.storage_path) {
      await baseDeDatos.storage
        .from("documentos")
        .remove([documento.storage_path])
    }
    const { error } = await baseDeDatos
      .from("file_documents")
      .delete()
      .eq("id", documento.id)
    if (error) {
      toast.error("No se pudo eliminar el documento.")
      return
    }
    toast.success("Documento eliminado")
    void cargarDocumentos()
    notificarCambio?.()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="size-4" />
          Documentos del expediente
          <Badge variant="outline">{documentos.length}</Badge>
        </CardTitle>
        <Button size="sm" onClick={abrirDialogoNuevoDocumento}>
          <Plus className="size-4" />
          Agregar documento
        </Button>
      </CardHeader>
      <CardContent>
        {cargando ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Cargando documentos…
          </div>
        ) : documentos.length === 0 ? (
          <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <FileText className="size-4" />
            Aún no hay documentos registrados en este expediente.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Formato</TableHead>
                <TableHead>Recibido</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.map((documento) => (
                <TableRow key={documento.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{documento.name}</span>
                      {documento.notes && (
                        <span className="text-xs text-muted-foreground">
                          {documento.notes}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {obtenerNombreTipo(documento.document_type_id)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={documento.is_physical ? "outline" : "secondary"}
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
                          title="Descargar"
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
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogoAbierto} onOpenChange={establecerDialogoAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar documento</DialogTitle>
            <DialogDescription>
              Registre un documento físico recibido o suba un archivo digital.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-name">Nombre del documento *</Label>
              <Input
                id="doc-name"
                value={nombreDocumento}
                onChange={(evento) =>
                  establecerNombreDocumento(evento.target.value)
                }
                placeholder="Ej. Estados de cuenta Banco Atlántida"
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
                <Label htmlFor="is-physical">Documento físico</Label>
                <p className="text-xs text-muted-foreground">
                  Recibido en papel, sin archivo digital
                </p>
              </div>
              <Switch
                id="is-physical"
                checked={esFisico}
                onCheckedChange={establecerEsFisico}
              />
            </div>
            {!esFisico && (
              <div className="space-y-2">
                <Label htmlFor="doc-file">Archivo digital *</Label>
                <Input
                  id="doc-file"
                  type="file"
                  onChange={(evento) =>
                    establecerArchivoSubir(evento.target.files?.[0] ?? null)
                  }
                />
                {archivoSubir && (
                  <p className="text-xs text-muted-foreground">
                    {archivoSubir.name} ({Math.round(archivoSubir.size / 1024)}{" "}
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
            <Button onClick={() => void guardarDocumento()} disabled={guardando}>
              {guardando && <Loader2 className="size-4 animate-spin" />}
              Registrar documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export const FileDocumentsSection = SeccionDocumentosExpediente

