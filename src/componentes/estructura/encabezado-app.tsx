import { BookOpen, ExternalLink, HelpCircle, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NOMBRE_DESPACHO } from "@/configuracion/parametros-sistema"
import { obtenerElementoNavegacionPorRuta } from "@/utilidades/navegacion"
import { ETIQUETAS_ROLES } from "@/utilidades/tipos"
import { obtenerInicialesNombre } from "@/utilidades/fechas"
import { usarAutenticacion } from "@/ganchos/usar-autenticacion"
import { BusquedaGlobal } from "@/componentes/busqueda-global"
import { PanelAyudaModulo } from "@/componentes/ayuda-modulo"

export function EncabezadoApp({
  rutaActual,
  pathname,
}: {
  rutaActual?: string
  pathname?: string
}) {
  const { perfil, cerrarSesion } = usarAutenticacion()
  const rutaEvaluada = rutaActual ?? pathname ?? "/"
  const elementoActual = obtenerElementoNavegacionPorRuta(rutaEvaluada)

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <h1 className="text-sm font-semibold tracking-tight">
        {elementoActual?.etiqueta ?? NOMBRE_DESPACHO}
      </h1>
      <div className="ml-auto flex items-center gap-2">
        <BusquedaGlobal />

        <PanelAyudaModulo variante="pill" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="size-8">
                <AvatarFallback>
                  {perfil ? obtenerInicialesNombre(perfil.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <span className="sr-only">Menú de usuario</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{perfil?.name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {perfil ? ETIQUETAS_ROLES[perfil.role_id] : ""}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a
                href="/TUTORIAL_POR_ROLES.html"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="size-4" />
                  Tutorial por Roles
                </span>
                <ExternalLink className="size-3 text-muted-foreground" />
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href="/TUTORIAL_ACCESO_TOTAL.html"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="size-4" />
                  Tutorial Acceso Total
                </span>
                <ExternalLink className="size-3 text-muted-foreground" />
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void cerrarSesion()}>
              <LogOut className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export const AppHeader = EncabezadoApp

