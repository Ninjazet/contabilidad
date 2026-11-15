import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { baseDeDatos } from "@/utilidades/cliente-supabase"
import { obtenerInicialesNombre } from "@/utilidades/fechas"

type ResultadoBusqueda = {
  tipo: "cliente" | "expediente"
  id: string
  titulo: string
  subtitulo: string
}

export function BusquedaGlobal() {
  const navegar = useNavigate()
  const [consulta, establecerConsulta] = React.useState("")
  const [resultados, establecerResultados] = React.useState<
    ResultadoBusqueda[]
  >([])
  const [buscando, establecerBuscando] = React.useState(false)
  const [abierto, establecerAbierto] = React.useState(false)

  React.useEffect(() => {
    const textoLimpio = consulta.trim()
    if (textoLimpio.length < 2) {
      establecerResultados([])
      establecerAbierto(false)
      return
    }

    establecerBuscando(true)
    const temporizador = setTimeout(async () => {
      const patronBusqueda = `%${textoLimpio}%`
      const [respuestaClientes, respuestaExpedientes] = await Promise.all([
        baseDeDatos
          .from("clients")
          .select("id, code, legal_name, commercial_name, rtn")
          .or(
            `legal_name.ilike.${patronBusqueda},commercial_name.ilike.${patronBusqueda},rtn.ilike.${patronBusqueda},code.ilike.${patronBusqueda}`
          )
          .limit(5),
        baseDeDatos
          .from("files")
          .select("id, code, client_id")
          .ilike("code", patronBusqueda)
          .limit(5),
      ])

      const listaResultados: ResultadoBusqueda[] = []
      if (!respuestaClientes.error) {
        for (const cliente of respuestaClientes.data ?? []) {
          listaResultados.push({
            tipo: "cliente",
            id: cliente.id,
            titulo: cliente.legal_name,
            subtitulo: `${cliente.code} · RTN ${cliente.rtn}`,
          })
        }
      }
      if (!respuestaExpedientes.error) {
        for (const expediente of respuestaExpedientes.data ?? []) {
          listaResultados.push({
            tipo: "expediente",
            id: expediente.id,
            titulo: `Expediente ${expediente.code}`,
            subtitulo: expediente.code,
          })
        }
      }
      establecerResultados(listaResultados)
      establecerAbierto(true)
      establecerBuscando(false)
    }, 300)

    return () => clearTimeout(temporizador)
  }, [consulta])

  const irAResultado = (resultado: ResultadoBusqueda) => {
    establecerAbierto(false)
    establecerConsulta("")
    if (resultado.tipo === "cliente") {
      navegar(`/clientes/${resultado.id}`)
    } else {
      navegar(`/expedientes/${resultado.id}`)
    }
  }

  return (
    <Popover open={abierto} onOpenChange={establecerAbierto}>
      <PopoverTrigger asChild>
        <div className="relative hidden w-64 sm:block">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes, expedientes…"
            className="h-8 pl-8"
            value={consulta}
            onChange={(evento) => establecerConsulta(evento.target.value)}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-1">
        {buscando && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Buscando…
          </div>
        )}
        {!buscando && resultados.length === 0 && (
          <p className="px-3 py-2 text-sm text-muted-foreground">
            Sin resultados para "{consulta}".
          </p>
        )}
        {!buscando &&
          resultados.map((resultado) => (
            <button
              key={`${resultado.tipo}-${resultado.id}`}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-muted"
              onClick={() => irAResultado(resultado)}
            >
              <Avatar className="size-7">
                <AvatarFallback className="text-[10px]">
                  {obtenerInicialesNombre(resultado.titulo)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {resultado.titulo}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {resultado.subtitulo}
                </p>
              </div>
            </button>
          ))}
      </PopoverContent>
    </Popover>
  )
}

export const GlobalSearch = BusquedaGlobal

