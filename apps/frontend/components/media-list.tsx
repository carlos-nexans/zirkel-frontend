"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Check, Trash, Undo } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MediaForm } from "@/components/media-form"
import type { MediaFormData } from "@/app/types"

interface MediaListProps {
  mediaItems: MediaFormData[]
  onUpdate: (id: string, data: MediaFormData) => void
  onRemove: (id: string) => void
}

export function MediaList({ mediaItems, onUpdate, onRemove }: MediaListProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    mediaItems.reduce((acc, item) => ({ ...acc, [item.id]: true }), {}),
  )
  const [reviewedItems, setReviewedItems] = useState<Record<string, boolean>>({})

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const toggleReviewed = (id: string) => {
    setReviewedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
    setExpandedItems((prev) => ({
      ...prev,
      [id]: false,
    }))
  }

  const collapseAll = () => {
    const allIds = mediaItems.map((item) => item.id)
    const newExpandedState = allIds.reduce((acc, id) => ({ ...acc, [id]: false }), {})
    setExpandedItems(newExpandedState)
  }

  const expandAll = () => {
    const allIds = mediaItems.map((item) => item.id)
    const newExpandedState = allIds.reduce((acc, id) => ({ ...acc, [id]: true }), {})
    setExpandedItems(newExpandedState)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Medios ({mediaItems.length})</h2>
        <div className="space-x-2">
          <Button onClick={expandAll} variant="outline" size="sm">
            <ChevronDown className="mr-2 h-4 w-4" />
            Expandir todos
          </Button>
          <Button onClick={collapseAll} variant="outline" size="sm">
            <ChevronUp className="mr-2 h-4 w-4" />
            Colapsar todos
          </Button>
        </div>
      </div>

      {mediaItems.map((item) => (
        <div key={item.id} className="border rounded-lg overflow-hidden">
          <div
            className={`p-4 flex justify-between items-center cursor-pointer ${
              reviewedItems[item.id] ? "bg-green-50" : "bg-gray-50"
            }`}
            onClick={() => toggleExpand(item.id)}
          >
            <div className="flex items-center space-x-2">
              {reviewedItems[item.id] && <Check className="h-5 w-5 text-green-500" />}
              <div>
                <h3 className="font-medium">
                  {"Nuevo medio"} - {item.tipoMedio}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.claveOriginalSitio}, {item.estado}, {item.ciudad} - {item.claveZirkel}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleReviewed(item.id)
                }}
                variant={reviewedItems[item.id] ? "outline" : "default"}
                size="sm"
                className={reviewedItems[item.id] ? "bg-green-100 hover:bg-green-200 text-green-700" : ""}
              >
                {reviewedItems[item.id] ? <Undo className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
                {reviewedItems[item.id] ? "Deshacer confirmación" : "Confirmar revisión"}
              </Button>

              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(item.id)
                }}
                variant="destructive"
                size="sm"
              >
                <Trash className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
              {expandedItems[item.id] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </div>

          {expandedItems[item.id] && (
            <div className="p-4 border-t">
              <MediaForm initialData={item} onUpdate={(data) => onUpdate(item.id, data)} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
