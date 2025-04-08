"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MediaForm } from "@/components/media-form"
import type { MediaFormData } from "@/app/page"

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

  const markAsReviewed = (id: string) => {
    setReviewedItems((prev) => ({
      ...prev,
      [id]: true,
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
      <div className="flex justify-end space-x-2">
        <Button onClick={expandAll} variant="outline" size="sm">
          Expandir todos
        </Button>
        <Button onClick={collapseAll} variant="outline" size="sm">
          Colapsar todos
        </Button>
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
                  {item.proveedor || "Nuevo medio"} - {item.tipoMedio}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.ciudad}, {item.estado} - {item.claveZirkel}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!reviewedItems[item.id] && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    markAsReviewed(item.id)
                  }}
                  variant="outline"
                  size="sm"
                >
                  Confirmar revisión
                </Button>
              )}
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(item.id)
                }}
                variant="destructive"
                size="sm"
              >
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
