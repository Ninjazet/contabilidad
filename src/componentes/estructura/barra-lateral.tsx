import { NavLink } from "react-router-dom"
import { BookOpenCheck } from "lucide-react"

import {
  NOMBRE_DESPACHO,
  SUBTITULO_DESPACHO,
  VERSION_SISTEMA,
} from "@/configuracion/parametros-sistema"
import { SECCIONES_NAVEGACION } from "@/utilidades/navegacion"
import { puedeAccederRol } from "@/utilidades/permisos"
import { usarAutenticacion } from "@/ganchos/usar-autenticacion"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { SelectorTema } from "@/componentes/selector-tema"

export function BarraLateralApp() {
  const { perfil } = usarAutenticacion()
  const rolUsuario = perfil?.role_id

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpenCheck className="size-4.5" />
          </div>
          <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold tracking-tight">
              {NOMBRE_DESPACHO}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {SUBTITULO_DESPACHO}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {SECCIONES_NAVEGACION.map((seccion) => {
          const elementosVisibles = seccion.elementos.filter(
            (elemento) => !rolUsuario || puedeAccederRol(rolUsuario, elemento.ruta)
          )
          if (elementosVisibles.length === 0) return null
          return (
            <SidebarGroup key={seccion.titulo}>
              <SidebarGroupLabel>{seccion.titulo}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {elementosVisibles.map((elemento) => (
                    <SidebarMenuItem key={elemento.ruta}>
                      <NavLink to={elemento.ruta}>
                        {({ isActive: estaActivo }) => (
                          <SidebarMenuButton
                            isActive={estaActivo}
                            tooltip={elemento.etiqueta}
                          >
                            <elemento.icono />
                            <span>{elemento.etiqueta}</span>
                          </SidebarMenuButton>
                        )}
                      </NavLink>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
          <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            {VERSION_SISTEMA}
          </span>
          <SelectorTema />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export const AppSidebar = BarraLateralApp

