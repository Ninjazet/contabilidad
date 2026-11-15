import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EXPRESION_REGULAR_RTN } from "@/configuracion/parametros-sistema"
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import type { Cliente } from "@/utilidades/tipos"

const esquemaValidacionCliente = z.object({
  legal_name: z.string().min(3, "Ingrese la razón social o nombre completo"),
  commercial_name: z.string().optional(),
  rtn: z
    .string()
    .regex(EXPRESION_REGULAR_RTN, "El RTN debe tener entre 14 y 16 dígitos"),
  client_type: z.enum(["persona", "empresa"]),
  status: z.enum(["activo", "inactivo", "suspendido"]),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  contact_name: z.string().optional(),
  department: z.string().optional(),
  municipality: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  is_quimistan: z.boolean(),
  zero_declaration_status: z.enum(["si", "no"]),
  responsible_user_id: z.string(),
  secondary_user_id: z.string(),
})

type ValoresFormularioCliente = z.infer<typeof esquemaValidacionCliente>

export type PropiedadesDialogoCliente = {
  abierto?: boolean
  alCambiarAbierto?: (abierto: boolean) => void
  cliente?: Cliente | null
  alGuardar?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  client?: Cliente | null
  onSaved?: () => void
}

export function DialogoCliente({
  abierto,
  alCambiarAbierto,
  cliente,
  alGuardar,
  open,
  onOpenChange,
  client,
  onSaved,
}: PropiedadesDialogoCliente) {
  const dialogoAbierto = abierto ?? open ?? false
  const cambiarEstadoAbierto =
    alCambiarAbierto ?? onOpenChange ?? (() => undefined)
  const clienteActual = cliente !== undefined ? cliente : (client ?? null)
  const notificarGuardado = alGuardar ?? onSaved ?? (() => undefined)

  const esEdicion = Boolean(clienteActual)
  const [enviando, establecerEnviando] = React.useState(false)
  const [personalActivo, establecerPersonalActivo] = React.useState<
    { id: string; name: string }[]
  >([])
  const [catalogoServicios, establecerCatalogoServicios] = React.useState<
    { id: string; name: string; description: string }[]
  >([])
  const [serviciosSeleccionados, establecerServiciosSeleccionados] =
    React.useState<string[]>([])
  const [serviciosIniciales, establecerServiciosIniciales] = React.useState<
    string[]
  >([])

  React.useEffect(() => {
    if (!dialogoAbierto) return
    baseDeDatos
      .from("profiles")
      .select("id, name")
      .eq("active", true)
      .order("name")
      .then(({ data }) => establecerPersonalActivo(data ?? []))

    baseDeDatos
      .from("services")
      .select("id, name, description")
      .eq("active", true)
      .order("name")
      .then(({ data }) => establecerCatalogoServicios(data ?? []))

    if (clienteActual) {
      baseDeDatos
        .from("client_services")
        .select("service_id, active")
        .eq("client_id", clienteActual.id)
        .eq("active", true)
        .then(({ data }) => {
          const listaIds = (data ?? []).map(
            (fila: { service_id: string }) => fila.service_id
          )
          establecerServiciosSeleccionados(listaIds)
          establecerServiciosIniciales(listaIds)
        })
    } else {
      establecerServiciosSeleccionados([])
      establecerServiciosIniciales([])
    }
  }, [dialogoAbierto, clienteActual])

  const formulario = useForm<ValoresFormularioCliente>({
    resolver: zodResolver(esquemaValidacionCliente),
    defaultValues: {
      legal_name: "",
      commercial_name: "",
      rtn: "",
      client_type: "empresa",
      status: "activo",
      phone: "",
      whatsapp: "",
      email: "",
      contact_name: "",
      department: "",
      municipality: "",
      address: "",
      notes: "",
      is_quimistan: false,
      zero_declaration_status: "no",
      responsible_user_id: "none",
      secondary_user_id: "none",
    },
  })

  React.useEffect(() => {
    if (dialogoAbierto) {
      if (clienteActual) {
        formulario.reset({
          legal_name: clienteActual.legal_name,
          commercial_name: clienteActual.commercial_name ?? "",
          rtn: clienteActual.rtn,
          client_type: clienteActual.client_type,
          status: clienteActual.status,
          phone: clienteActual.phone ?? "",
          whatsapp: clienteActual.whatsapp ?? "",
          email: clienteActual.email ?? "",
          contact_name: clienteActual.contact_name ?? "",
          department: clienteActual.department ?? "",
          municipality: clienteActual.municipality ?? "",
          address: clienteActual.address ?? "",
          notes: clienteActual.notes ?? "",
          is_quimistan: clienteActual.is_quimistan,
          zero_declaration_status: clienteActual.zero_declaration_status,
          responsible_user_id: clienteActual.responsible_user_id ?? "none",
          secondary_user_id: clienteActual.secondary_user_id ?? "none",
        })
      } else {
        formulario.reset()
      }
    }
  }, [dialogoAbierto, clienteActual, formulario])

  const guardarCliente = async (valores: ValoresFormularioCliente) => {
    establecerEnviando(true)
    try {
      const datosCliente = {
        legal_name: valores.legal_name.trim(),
        commercial_name: valores.commercial_name?.trim() || null,
        rtn: valores.rtn.trim(),
        client_type: valores.client_type,
        status: valores.status,
        phone: valores.phone?.trim() || null,
        whatsapp: valores.whatsapp?.trim() || null,
        email: valores.email?.trim() || null,
        contact_name: valores.contact_name?.trim() || null,
        department: valores.department?.trim() || null,
        municipality: valores.municipality?.trim() || null,
        address: valores.address?.trim() || null,
        notes: valores.notes?.trim() || null,
        is_quimistan: valores.is_quimistan,
        zero_declaration_status: valores.zero_declaration_status,
        responsible_user_id:
          valores.responsible_user_id === "none"
            ? null
            : valores.responsible_user_id,
        secondary_user_id:
          valores.secondary_user_id === "none"
            ? null
            : valores.secondary_user_id,
      }

      let errorBaseDatos: { message: string } | null = null
      let idClienteGuardado: string | null = clienteActual?.id ?? null

      if (esEdicion && clienteActual) {
        const { error } = await baseDeDatos
          .from("clients")
          .update(datosCliente)
          .eq("id", clienteActual.id)
        errorBaseDatos = error
      } else {
        const { data: datosUsuario } = await baseDeDatos.auth.getUser()
        const { data: clienteCreado, error } = await baseDeDatos
          .from("clients")
          .insert({
            ...datosCliente,
            created_by: datosUsuario.user?.id ?? null,
          })
          .select("id")
          .single()
        errorBaseDatos = error
        if (clienteCreado && "id" in clienteCreado) {
          idClienteGuardado = (clienteCreado as { id: string }).id
        }
      }

      if (errorBaseDatos) {
        if (errorBaseDatos.message.includes("clients_rtn_active_unique")) {
          formulario.setError("rtn", {
            message: "Ya existe un cliente con este RTN",
          })
        } else if (errorBaseDatos.message.includes("duplicate key")) {
          toast.error("Ya existe un registro con ese dato único (RTN o código).")
        } else {
          toast.error(
            "No se pudo guardar el cliente: " + errorBaseDatos.message
          )
        }
        return
      }

      if (idClienteGuardado) {
        const serviciosAEliminar = serviciosIniciales.filter(
          (idServicio) => !serviciosSeleccionados.includes(idServicio)
        )
        if (serviciosAEliminar.length > 0) {
          await baseDeDatos
            .from("client_services")
            .delete()
            .eq("client_id", idClienteGuardado)
            .in("service_id", serviciosAEliminar)
        }
        if (serviciosSeleccionados.length > 0) {
          await baseDeDatos.from("client_services").upsert(
            serviciosSeleccionados.map((idServicio) => ({
              client_id: idClienteGuardado,
              service_id: idServicio,
              active: true,
            })),
            { onConflict: "client_id,service_id" }
          )
        }
      }

      toast.success(
        esEdicion
          ? "Cliente actualizado correctamente"
          : "Cliente creado correctamente"
      )
      cambiarEstadoAbierto(false)
      notificarGuardado()
    } finally {
      establecerEnviando(false)
    }
  }

  const erroresFormulario = formulario.formState.errors

  return (
    <Dialog open={dialogoAbierto} onOpenChange={cambiarEstadoAbierto}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {esEdicion ? "Editar cliente" : "Nuevo cliente"}
          </DialogTitle>
          <DialogDescription>
            {esEdicion
              ? "Actualice los datos del cliente."
              : "Complete los datos del cliente. El código se genera automáticamente."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={formulario.handleSubmit(guardarCliente)}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="legal_name">
                Razón social o nombre completo *
              </Label>
              <Input id="legal_name" {...formulario.register("legal_name")} />
              {erroresFormulario.legal_name && (
                <p className="text-xs text-destructive">
                  {erroresFormulario.legal_name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="commercial_name">Nombre comercial</Label>
              <Input
                id="commercial_name"
                {...formulario.register("commercial_name")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rtn">RTN *</Label>
              <Input
                id="rtn"
                inputMode="numeric"
                {...formulario.register("rtn")}
                onBlur={(evento) =>
                  formulario.setValue(
                    "rtn",
                    evento.target.value.replace(/\D/g, "")
                  )
                }
              />
              {erroresFormulario.rtn && (
                <p className="text-xs text-destructive">
                  {erroresFormulario.rtn.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tipo de cliente</Label>
              <Select
                value={formulario.watch("client_type")}
                onValueChange={(valor) =>
                  formulario.setValue(
                    "client_type",
                    valor as ValoresFormularioCliente["client_type"]
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empresa">Empresa</SelectItem>
                  <SelectItem value="persona">Persona individual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={formulario.watch("status")}
                onValueChange={(valor) =>
                  formulario.setValue(
                    "status",
                    valor as ValoresFormularioCliente["status"]
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                  <SelectItem value="suspendido">Suspendido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" {...formulario.register("phone")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" {...formulario.register("whatsapp")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                {...formulario.register("email")}
              />
              {erroresFormulario.email && (
                <p className="text-xs text-destructive">
                  {erroresFormulario.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_name">Persona de contacto</Label>
              <Input
                id="contact_name"
                {...formulario.register("contact_name")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Input id="department" {...formulario.register("department")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="municipality">Municipio</Label>
              <Input
                id="municipality"
                {...formulario.register("municipality")}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" {...formulario.register("address")} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" rows={2} {...formulario.register("notes")} />
            </div>

            <div className="space-y-2">
              <Label>Responsable principal</Label>
              <Select
                value={formulario.watch("responsible_user_id")}
                onValueChange={(valor) =>
                  formulario.setValue("responsible_user_id", valor)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {personalActivo.map((colaborador) => (
                    <SelectItem key={colaborador.id} value={colaborador.id}>
                      {colaborador.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Responsable secundario</Label>
              <Select
                value={formulario.watch("secondary_user_id")}
                onValueChange={(valor) =>
                  formulario.setValue("secondary_user_id", valor)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {personalActivo.map((colaborador) => (
                    <SelectItem key={colaborador.id} value={colaborador.id}>
                      {colaborador.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-1">
              <div className="space-y-0.5">
                <Label htmlFor="is_quimistan">Cliente de Quimistán</Label>
                <p className="text-xs text-muted-foreground">
                  Servicio con tarifa especial
                </p>
              </div>
              <Switch
                id="is_quimistan"
                checked={formulario.watch("is_quimistan")}
                onCheckedChange={(valor) =>
                  formulario.setValue("is_quimistan", valor)
                }
              />
            </div>

            <div className="space-y-2 sm:col-span-1">
              <Label>Declaración en cero</Label>
              <Select
                value={formulario.watch("zero_declaration_status")}
                onValueChange={(valor) =>
                  formulario.setValue(
                    "zero_declaration_status",
                    valor as ValoresFormularioCliente["zero_declaration_status"]
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="si">
                    Sí presenta declaración en cero
                  </SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {catalogoServicios.length > 0 && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Servicios contratados</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {catalogoServicios.map((servicio) => {
                    const marcado = serviciosSeleccionados.includes(servicio.id)
                    return (
                      <div
                        key={servicio.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2"
                      >
                        <div className="pr-2">
                          <p className="text-sm font-medium">{servicio.name}</p>
                          {servicio.description && (
                            <p className="text-xs text-muted-foreground">
                              {servicio.description}
                            </p>
                          )}
                        </div>
                        <Switch
                          checked={marcado}
                          onCheckedChange={(nuevoValor) => {
                            establecerServiciosSeleccionados((previos) =>
                              nuevoValor
                                ? [...previos, servicio.id]
                                : previos.filter(
                                    (idItem) => idItem !== servicio.id
                                  )
                            )
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => cambiarEstadoAbierto(false)}
              disabled={enviando}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando && <Loader2 className="size-4 animate-spin" />}
              {esEdicion ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export const ClientDialog = DialogoCliente

