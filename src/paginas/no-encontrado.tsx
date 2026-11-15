import { Link } from "react-router-dom"
import { Compass } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { NOMBRE_DESPACHO } from "@/configuracion/parametros-sistema"

export function PaginaNoEncontrado() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-lg bg-muted">
            <Compass className="size-6 text-muted-foreground" />
          </div>
          <CardTitle>Página no encontrada</CardTitle>
          <CardDescription>
            La dirección que buscó no existe en {NOMBRE_DESPACHO}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/">Volver al Panel</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export const NotFound = PaginaNoEncontrado

