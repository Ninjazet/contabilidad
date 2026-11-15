/**
 * ============================================================================
 * ENRUTADOR PRINCIPAL DE LA APLICACIÓN (rutas-aplicacion.tsx)
 * ============================================================================
 * Define todas las rutas del sistema ContaGestión y las conecta con sus
 * respectivas páginas en español dentro de `src/paginas/`.
 * ============================================================================
 */

import { Route, Routes } from "react-router-dom"

import { RequiereAutenticacion } from "@/componentes/requiere-autenticacion"
import { ContenedorApp } from "@/componentes/estructura/contenedor-app"
import { PaginaIniciarSesion } from "@/paginas/iniciar-sesion"
import { PaginaPanelPrincipal } from "@/paginas/panel-principal"
import { PaginaClientes } from "@/paginas/clientes"
import { PaginaDetalleCliente } from "@/paginas/detalle-cliente"
import { PaginaExpedientes } from "@/paginas/expedientes"
import { PaginaDetalleExpediente } from "@/paginas/detalle-expediente"
import { PaginaDocumentos } from "@/paginas/documentos"
import { PaginaListaTareas } from "@/paginas/lista-tareas"
import { PaginaControlMaestro } from "@/paginas/control-maestro"
import { PaginaInformativas } from "@/paginas/informativas"
import { PaginaValidacionDmc } from "@/paginas/validacion-dmc"
import { PaginaCobrosCaja } from "@/paginas/cobros-caja"
import { PaginaVisitasQuimistan } from "@/paginas/visitas-quimistan"
import { PaginaContabilidad } from "@/paginas/contabilidad"
import { PaginaCalendario } from "@/paginas/calendario"
import { PaginaPersonal } from "@/paginas/personal"
import { PaginaAuditoria } from "@/paginas/auditoria"
import { PaginaConfiguracion } from "@/paginas/configuracion"
import { PaginaNoEncontrado } from "@/paginas/no-encontrado"

export function RutasAplicacion() {
  return (
    <Routes>
      <Route path="/acceso" element={<PaginaIniciarSesion />} />
      <Route
        element={
          <RequiereAutenticacion>
            <ContenedorApp />
          </RequiereAutenticacion>
        }
      >
        <Route index element={<PaginaPanelPrincipal />} />
        <Route path="clientes" element={<PaginaClientes />} />
        <Route path="clientes/:id" element={<PaginaDetalleCliente />} />
        <Route path="expedientes" element={<PaginaExpedientes />} />
        <Route path="expedientes/:id" element={<PaginaDetalleExpediente />} />
        <Route path="documentos" element={<PaginaDocumentos />} />
        <Route path="control-maestro" element={<PaginaControlMaestro />} />
        <Route path="informativas" element={<PaginaInformativas />} />
        <Route path="dmc" element={<PaginaValidacionDmc />} />
        <Route path="cobros" element={<PaginaCobrosCaja />} />
        <Route path="visitas-quimistan" element={<PaginaVisitasQuimistan />} />
        <Route path="contabilidad" element={<PaginaContabilidad />} />
        <Route path="checklist" element={<PaginaListaTareas />} />
        <Route path="calendario" element={<PaginaCalendario />} />
        <Route path="personal" element={<PaginaPersonal />} />
        <Route path="auditoria" element={<PaginaAuditoria />} />
        <Route path="configuracion" element={<PaginaConfiguracion />} />
        <Route path="*" element={<PaginaNoEncontrado />} />
      </Route>
    </Routes>
  )
}

export { RutasAplicacion as AppRoutes }

