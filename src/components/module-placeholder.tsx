import { Construction } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type Props = {
  module: string
  description: string
}

function ModulePlaceholder({ module, description }: Props) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
          <Construction className="size-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold">{module}: en construcción</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <Badge variant="outline">Pendiente para fases siguientes</Badge>
      </CardContent>
    </Card>
  )
}

export { ModulePlaceholder }
