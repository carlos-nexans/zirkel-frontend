"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { MediaFormData } from "@/app/types"

interface StoredProposal {
  proveedor: string
  date: string
  mediaItems: Array<{
    claveZirkel: string
    proveedor: string
  }>
}

export default function HotProposalsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [proposals, setProposals] = useState<StoredProposal[]>([])
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [results, setResults] = useState<MediaFormData[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const { toast } = useToast()
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"

  useEffect(() => {
    // Load proposals from localStorage
    const storedProposals = localStorage.getItem('mediaProposals')
    if (storedProposals) {
      const parsedProposals = JSON.parse(storedProposals)
      setProposals(parsedProposals)

      // Auto-select today's proposals
      const today = new Date().toISOString().split('T')[0]
      const todayProposals = parsedProposals.filter(
        (p: StoredProposal) => p.date.startsWith(today)
      )
      setSelectedDates(todayProposals.map((p: StoredProposal) => p.date))
    }
  }, [])

  const handlePreview = async () => {
    if (selectedDates.length === 0) {
      toast({
        title: "Selección vacía",
        description: "Por favor seleccione al menos una fecha.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Get selected proposals
      const selectedProposals = proposals.filter(p => selectedDates.includes(p.date))
      
      // Extract all Zirkel keys from the selected proposals
      const zirkelKeys = selectedProposals.flatMap(proposal => 
        proposal.mediaItems.map(item => item.claveZirkel)
      )
      
      // Fetch real media data from the API
      const response = await fetch(`${baseUrl}/get-medios-by-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ zirkelKeys }),
      })
      
      if (!response.ok) {
        throw new Error('Error al obtener datos de medios')
      }
      
      const mediaData: MediaFormData[] = await response.json()
      setResults(mediaData)

      toast({
        title: "Vista previa generada",
        description: `Se encontraron ${mediaData.length} espacios de medios.`,
      })
    } catch (error) {
      console.error('Error fetching media data:', error)
      toast({
        title: "Error",
        description: "Hubo un problema al generar la vista previa.",
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

  const handleDateSelect = (date: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedDates((prev) => [...prev, date])
    } else {
      setSelectedDates((prev) => prev.filter((d) => d !== date))
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Propuestas Recientes</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Fechas</h2>
                  <Button
                    onClick={handlePreview}
                    disabled={isLoading || selectedDates.length === 0}
                  >
                    Previsualizar
                  </Button>
                </div>
                
                <Separator className="my-4" />

                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {proposals.map((proposal) => {
                      const formattedDate = format(
                        new Date(proposal.date),
                        "PPP",
                        { locale: es }
                      )
                      
                      return (
                        <div
                          key={proposal.date}
                          className="flex items-center space-x-3"
                        >
                          <Checkbox
                            checked={selectedDates.includes(proposal.date)}
                            onCheckedChange={(checked) =>
                              handleDateSelect(proposal.date, checked as boolean)
                            }
                          />
                          <div>
                            <p className="font-medium">{formattedDate}</p>
                            <p className="text-sm text-muted-foreground">
                              {proposal.proveedor} - {proposal.mediaItems.length} medios
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border p-4 h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Resultados ({results.length})</h2>
            </div>

            <Separator className="mb-4" />

            {isLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <p>Cargando resultados...</p>
              </div>
            ) : results.length > 0 ? (
              <ScrollArea className="h-[600px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                  {results.map((media) => (
                    <Card key={media.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="relative aspect-video">
                          <img
                            src={media.imageUrl}
                            alt={media.claveZirkel}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <Checkbox
                              checked={selectedItems.includes(media.id)}
                              onCheckedChange={(checked) =>
                                handleItemSelect(media.id, checked as boolean)
                              }
                            />
                          </div>
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold">{media.claveZirkel}</p>
                              <p className="text-sm text-muted-foreground">
                                {media.proveedor}
                              </p>
                            </div>
                          </div>
                          <div className="text-sm">
                            <p>{media.tipoMedio}</p>
                            <p>{media.ciudad}, {media.estado}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-[400px]">
                <p className="text-muted-foreground">
                  Seleccione una fecha y haga clic en Previsualizar para ver los resultados
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}