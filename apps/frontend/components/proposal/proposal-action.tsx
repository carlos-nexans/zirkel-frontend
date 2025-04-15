"use client"

import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ProposalActionProps {
  selectedCount: number
  onGenerate: () => void
  isLoading: boolean
}

export function ProposalAction({ selectedCount, onGenerate, isLoading }: ProposalActionProps) {
  return (
    <div className="flex items-center gap-2">
      {selectedCount > 0 && (
        <Badge variant="secondary" className="mr-2">
          {selectedCount} seleccionados
        </Badge>
      )}

      <Button onClick={onGenerate} disabled={selectedCount === 0 || isLoading} size="sm">
        <FileText className="mr-2 h-4 w-4" />
        Generar propuesta
      </Button>
    </div>
  )
}
