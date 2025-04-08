"use client"

import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { FilterPanel } from "@/components/proposal/filter-panel"
import { GeolocationFilter } from "@/components/proposal/geolocation-filter"
import { ResultsList } from "@/components/proposal/results-list"
import { ProposalAction } from "@/components/proposal/proposal-action"
import { Separator } from "@/components/ui/separator"
import type { FilterValues, MediaResult } from "@/app/types"

export default function ProposalPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<MediaResult[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const { toast } = useToast()

  const handleFilterSubmit = async (filters: FilterValues) => {
    setIsLoading(true)

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock API call to jsonplaceholder
      const response = await fetch("https://jsonplaceholder.typicode.com/posts/1")
      await response.json()

      // Mock results based on filters
      const mockResults: MediaResult[] = Array.from({ length: 12 }, (_, i) => ({
        id: `media-${i + 1}`,
        provider: ["MediaCorp", "PubliMax", "VisualAds"][Math.floor(Math.random() * 3)],
        mediaType: ["Espectacular", "Mural", "Pantalla Digital", "Valla"][Math.floor(Math.random() * 4)],
        state: filters.state || ["CDMX", "Jalisco", "Nuevo León"][Math.floor(Math.random() * 3)],
        city: filters.city || ["Ciudad de México", "Guadalajara", "Monterrey"][Math.floor(Math.random() * 3)],
        cost: Math.floor(Math.random() * (50000 - 5000) + 5000),
        tarifa: Math.floor(Math.random() * (70000 - 10000) + 10000),
        orientation: ["Norte", "Sur", "Este", "Oeste"][Math.floor(Math.random() * 4)],
        illumination: ["LED", "Fluorescente", "Sin iluminación"][Math.floor(Math.random() * 3)],
        nseClassification: ["A/B", "C+", "C", "D+", "D/E"][Math.floor(Math.random() * 5)],
        impacts: Math.floor(Math.random() * (200000 - 50000) + 50000),
        location: {
          lat: 19.4326 + (Math.random() * 0.1 - 0.05),
          lng: -99.1332 + (Math.random() * 0.1 - 0.05),
        },
        imageUrl: `/placeholder.svg?height=200&width=300&text=Media+${i + 1}`,
      }))

      setResults(mockResults)

      toast({
        title: "Búsqueda completada",
        description: `Se encontraron ${mockResults.length} espacios de medios.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un problema al buscar espacios de medios.",
        variant: "destructive",
      })
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleItemSelect = (id: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedItems((prev) => [...prev, id])
    } else {
      setSelectedItems((prev) => prev.filter((itemId) => itemId !== id))
    }
  }

  const handleGenerateProposal = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "Selección vacía",
        description: "Por favor seleccione al menos un espacio de medio.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock POST API call to jsonplaceholder
      const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
        method: "POST",
        body: JSON.stringify({
          title: "Nueva Propuesta",
          body: "Propuesta de medios",
          mediaIds: selectedItems,
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
      })

      await response.json()

      toast({
        title: "Propuesta generada",
        description: `Se ha generado una propuesta con ${selectedItems.length} espacios de medios.`,
      })

      // Reset selection after successful proposal generation
      setSelectedItems([])
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un problema al generar la propuesta.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Generador de Propuestas</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Filtros</h2>
            <FilterPanel onSubmit={handleFilterSubmit} isLoading={isLoading} />
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Ubicación</h2>
            <GeolocationFilter
              onLocationSelect={(location) => {
                handleFilterSubmit({
                  provider: "",
                  mediaType: "",
                  state: "",
                  city: "",
                  costoMin: 0,
                  costoMax: 0,
                  tarifaMin: 0,
                  tarifaMax: 0,
                  orientation: "",
                  illumination: "",
                  nseClassification: "",
                  impactsMin: 0,
                  location,
                })
              }}
              isLoading={isLoading}
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border p-4 h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Resultados ({results.length})</h2>
              <ProposalAction
                selectedCount={selectedItems.length}
                onGenerate={handleGenerateProposal}
                isLoading={isLoading}
              />
            </div>

            <Separator className="mb-4" />

            <ResultsList
              results={results}
              isLoading={isLoading}
              selectedItems={selectedItems}
              onItemSelect={handleItemSelect}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
