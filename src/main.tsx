/**
 * ============================================================================
 * PUNTO DE ENTRADA DEL FRONTEND (main.tsx)
 * ============================================================================
 */

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import Aplicacion from "./App.tsx"
import { ProveedorTema } from "@/componentes/proveedor-tema.tsx"
import { ProveedorAutenticacion } from "@/ganchos/usar-autenticacion.tsx"
import { Toaster } from "@/components/ui/sonner.tsx"

const elementoRaiz = document.getElementById("root")!

createRoot(elementoRaiz).render(
  <StrictMode>
    <ProveedorTema>
      <ProveedorAutenticacion>
        <Aplicacion />
        <Toaster richColors position="top-right" />
      </ProveedorAutenticacion>
    </ProveedorTema>
  </StrictMode>
)
