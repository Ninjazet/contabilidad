/**
 * ============================================================================
 * COMPONENTE RAÍZ DE LA APLICACIÓN (App.tsx)
 * ============================================================================
 */

import { BrowserRouter } from "react-router-dom"
import { RutasAplicacion } from "@/rutas-aplicacion"

function Aplicacion() {
  return (
    <BrowserRouter>
      <RutasAplicacion />
    </BrowserRouter>
  )
}

export default Aplicacion
