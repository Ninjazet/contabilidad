import { Outlet, useLocation } from "react-router-dom"

import { BarraLateralApp } from "@/componentes/estructura/barra-lateral"
import { EncabezadoApp } from "@/componentes/estructura/encabezado-app"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function ContenedorApp() {
  const { pathname: rutaActual } = useLocation()

  return (
    <SidebarProvider>
      <BarraLateralApp />
      <SidebarInset>
        <EncabezadoApp rutaActual={rutaActual} />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export const AppShell = ContenedorApp

