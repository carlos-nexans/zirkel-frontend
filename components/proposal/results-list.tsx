"use client"

import { useState } from "react"
import { Loader2, MapPin } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import type { MediaResult } from "@/app/proposal/page"

interface ResultsListProps {
  results: MediaResult[]
  isLoading: boolean
  selectedItems: string[]
  onItemSelect: (id: string, isSelected: boolean) => void
}

export function ResultsList({ results, isLoading, selectedItems, onItemSelect }: ResultsListProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Buscando espacios de medios...</p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <MapPin className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">No se encontraron resultados</h3>
        <p className="text-muted-foreground max-w-md">
          Intenta ajustar los filtros o seleccionar una ubicación diferente para encontrar espacios de medios.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {results.map((result) => (
          <Card key={result.id} className="overflow-hidden">
            <div className="relative">
              <img
                src={result.imageUrl || "/placeholder.svg"}
                alt={`${result.provider} - ${result.mediaType}`}
                className="w-full h-40 object-cover"
              />
            </div>

            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium">{result.provider}</h3>
                <Badge variant="outline">{result.mediaType}</Badge>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ubicación:</span>
                  <span>
                    {result.city}, {result.state}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Costo:</span>
                  <span className="font-medium">${result.cost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tarifa:</span>
                  <span className="font-medium">${result.tarifa.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Formato:</span>
                  <span>{result.format}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NSE:</span>
                  <span>{result.nseClassification}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Impactos/mes:</span>
                  <span>{result.impacts.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-4 pt-0 flex justify-between items-center">
              <div className="flex items-center text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 mr-1" />
                <span>
                  {result.location.lat.toFixed(4)}, {result.location.lng.toFixed(4)}
                </span>
              </div>

              <div className="flex items-center">
                <Checkbox
                  checked={selectedItems.includes(result.id)}
                  onCheckedChange={(checked) => onItemSelect(result.id, checked === true)}
                  id={`select-${result.id}`}
                  className="h-4 w-4 mr-2"
                />
                <label htmlFor={`select-${result.id}`} className="text-sm cursor-pointer">
                  {selectedItems.includes(result.id) ? "Seleccionado" : "Seleccionar"}
                </label>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
