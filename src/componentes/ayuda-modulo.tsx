import * as React from "react"
import { useLocation } from "react-router-dom"
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  Info,
  Layers,
  Scale,
  ShieldCheck,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  obtenerAyudaPorRuta,
  type ElementoAyudaModulo,
} from "@/utilidades/datos-ayuda"

export interface PropiedadesPanelAyudaModulo {
  ayudaPersonalizada?: ElementoAyudaModulo
  variante?: "icon-only" | "button" | "pill"
  claseAdicional?: string
  customHelp?: ElementoAyudaModulo
  variant?: "icon-only" | "button" | "pill"
  className?: string
}

export function PanelAyudaModulo({
  ayudaPersonalizada,
  variante,
  claseAdicional,
  customHelp,
  variant = "button",
  className = "",
}: PropiedadesPanelAyudaModulo) {
  const [abierto, establecerAbierto] = React.useState(false)
  const ubicacionActual = useLocation()

  const varianteFinal = variante ?? variant
  const claseFinal = claseAdicional ?? className
  const datosAyuda =
    ayudaPersonalizada ??
    customHelp ??
    obtenerAyudaPorRuta(ubicacionActual.pathname)

  // Atajo de teclado F1 al estilo de sistemas empresariales como Aspel SAE
  React.useEffect(() => {
    const manejarTeclaPresionada = (evento: KeyboardEvent) => {
      if (evento.key === "F1") {
        evento.preventDefault()
        establecerAbierto((estadoPrevio) => !estadoPrevio)
      }
    }
    window.addEventListener("keydown", manejarTeclaPresionada)
    return () => window.removeEventListener("keydown", manejarTeclaPresionada)
  }, [])

  return (
    <>
      {varianteFinal === "icon-only" ? (
        <button
          type="button"
          onClick={() => establecerAbierto(true)}
          className={`inline-flex items-center justify-center size-8 rounded-full bg-emerald-50 text-emerald-800 border-2 border-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-500 font-bold text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 ${claseFinal}`}
          title="Ayuda del módulo y tutorial interactivo (Presione F1)"
          aria-label="Ayuda del módulo"
        >
          <span className="font-mono text-base font-extrabold leading-none">
            ?
          </span>
        </button>
      ) : varianteFinal === "pill" ? (
        <button
          type="button"
          onClick={() => establecerAbierto(true)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-500 shadow-sm transition-all ${claseFinal}`}
          title="Ayuda del módulo (F1)"
        >
          <span className="font-mono text-xs font-extrabold px-1 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-950 dark:text-emerald-100">
            ?
          </span>
          <span>Ayuda (F1)</span>
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => establecerAbierto(true)}
          className={`h-8 gap-2 border-emerald-600 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950 font-medium ${claseFinal}`}
          title="Ayuda del módulo y tutorial interactivo (Presione F1)"
        >
          <span className="inline-flex items-center justify-center size-5 rounded-full bg-emerald-600 text-white font-mono font-bold text-xs">
            ?
          </span>
          <span>Ayuda (F1)</span>
        </Button>
      )}

      <Sheet open={abierto} onOpenChange={establecerAbierto}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 gap-0 overflow-hidden"
          showCloseButton={false}
        >
          <div className="bg-emerald-900 text-white p-5 border-b border-emerald-800">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center size-7 rounded-full bg-emerald-500 text-emerald-950 font-mono font-extrabold text-sm">
                  ?
                </span>
                <Badge
                  variant="outline"
                  className="bg-emerald-800/80 text-emerald-200 border-emerald-700 text-xs font-mono"
                >
                  {datosAyuda.code} · {datosAyuda.route}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-300 font-mono hidden sm:inline">
                  Atajo: F1
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => establecerAbierto(false)}
                  className="size-7 text-emerald-200 hover:bg-emerald-800 hover:text-white rounded-md"
                  aria-label="Cerrar ayuda"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            <SheetHeader className="mt-3 text-left">
              <SheetTitle className="text-xl font-bold text-white tracking-tight">
                {datosAyuda.title}
              </SheetTitle>
              <SheetDescription className="text-emerald-200 text-sm line-clamp-2 mt-1">
                {datosAyuda.summary}
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="actions" className="w-full">
              <div className="border-b bg-muted/40 px-5 sticky top-0 z-10">
                <TabsList className="h-11 bg-transparent p-0 gap-2 overflow-x-auto justify-start">
                  <TabsTrigger
                    value="actions"
                    className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md px-3 text-xs font-semibold gap-1.5"
                  >
                    <Layers className="size-3.5" />
                    ¿Qué hace cada opción?
                  </TabsTrigger>
                  <TabsTrigger
                    value="steps"
                    className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md px-3 text-xs font-semibold gap-1.5"
                  >
                    <BookOpen className="size-3.5" />
                    Tutorial de uso
                  </TabsTrigger>
                  <TabsTrigger
                    value="fields"
                    className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md px-3 text-xs font-semibold gap-1.5"
                  >
                    <FileText className="size-3.5" />
                    Campos y columnas
                  </TabsTrigger>
                  <TabsTrigger
                    value="rules"
                    className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md px-3 text-xs font-semibold gap-1.5"
                  >
                    <Scale className="size-3.5" />
                    Reglas y SAR
                  </TabsTrigger>
                  <TabsTrigger
                    value="roles"
                    className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md px-3 text-xs font-semibold gap-1.5"
                  >
                    <ShieldCheck className="size-3.5" />
                    Roles y acceso
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="actions" className="p-5 space-y-4 m-0">
                <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3.5 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                  <Info className="size-4 shrink-0 text-emerald-700 dark:text-emerald-400 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Propósito del módulo:</strong> {datosAyuda.purpose}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Controles, Botones y Acciones Disponibles:
                  </h4>
                  <div className="grid gap-2.5">
                    {datosAyuda.actions.map((accion, indice) => (
                      <div
                        key={indice}
                        className="rounded-lg border bg-card p-3.5 space-y-1 shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground border">
                            {accion.name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                          {accion.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="steps" className="p-5 space-y-4 m-0">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Guía de Uso Paso a Paso:
                  </h4>
                  <div className="space-y-3">
                    {datosAyuda.steps.map((paso) => (
                      <div
                        key={paso.step}
                        className="flex gap-3.5 rounded-lg border bg-card p-3.5 items-start shadow-xs"
                      >
                        <span className="size-6 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {paso.step}
                        </span>
                        <div className="space-y-1">
                          <h5 className="text-sm font-semibold text-foreground">
                            {paso.title}
                          </h5>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {paso.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {datosAyuda.tips && datosAyuda.tips.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Recomendaciones Operativas:
                    </h5>
                    <ul className="space-y-1.5 pl-1">
                      {datosAyuda.tips.map((consejo, indice) => (
                        <li
                          key={indice}
                          className="text-xs text-muted-foreground flex items-start gap-2"
                        >
                          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{consejo}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="fields" className="p-5 space-y-4 m-0">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Glosario de Datos y Columnas:
                  </h4>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted text-muted-foreground font-semibold">
                        <tr>
                          <th className="text-left p-2.5">Campo / Dato</th>
                          <th className="text-left p-2.5">
                            Significado y Regla
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {datosAyuda.fields.map((campo, indice) => (
                          <tr key={indice} className="hover:bg-muted/30">
                            <td className="p-2.5 font-semibold text-foreground align-top whitespace-nowrap">
                              {campo.field}
                            </td>
                            <td className="p-2.5 text-muted-foreground leading-relaxed">
                              {campo.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="rules" className="p-5 space-y-4 m-0">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Reglas de Negocio y Marco Legal SAR (Honduras):
                  </h4>
                  <div className="space-y-2">
                    {datosAyuda.rules.map((regla, indice) => (
                      <div
                        key={indice}
                        className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/30 p-3 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5"
                      >
                        <Scale className="size-4 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
                        <span className="leading-relaxed">{regla}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="roles" className="p-5 space-y-4 m-0">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Permisos de Autorización por Puesto:
                  </h4>
                  <div className="grid gap-2">
                    {datosAyuda.roles.map((rolInfo, indice) => (
                      <div
                        key={indice}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card text-xs shadow-xs"
                      >
                        <span className="font-semibold text-foreground">
                          {rolInfo.role}
                        </span>
                        <span className="text-muted-foreground font-mono">
                          {rolInfo.access}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="border-t bg-muted/30 p-4 flex flex-col sm:flex-row gap-2 justify-between items-center text-xs">
            <div className="flex gap-2 flex-wrap">
              <a
                href="/TUTORIAL_POR_ROLES.html"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 hover:underline font-medium"
              >
                <BookOpen className="size-3.5" />
                Tutorial por Roles
                <ExternalLink className="size-3" />
              </a>
              <span className="text-muted-foreground">·</span>
              <a
                href="/TUTORIAL_ACCESO_TOTAL.html"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 hover:underline font-medium"
              >
                <Layers className="size-3.5" />
                Tutorial Acceso Total
                <ExternalLink className="size-3" />
              </a>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={() => establecerAbierto(false)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white h-7 text-xs px-3"
            >
              Entendido
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export const ModuleHelpSheet = PanelAyudaModulo

