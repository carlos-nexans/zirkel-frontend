"use client"

import { useEffect, useState } from "react"
import { FileUploader } from "@/components/file-uploader"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { MediaList } from "@/components/media-list"
import { Copy, FileText, Plus, Save } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { MediaFormData } from "@/app/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function MediaPage() {
  const [mediaItems, setMediaItems] = useState<MediaFormData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()


  const handleFileUpload = async (file: File, provider: string) => {
    setIsLoading(true)

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock API call to jsonplaceholder
      const response = await fetch("https://jsonplaceholder.typicode.com/posts/1")
      const data = await response.json()

      // Mock multiple media data items based on the API response
      const mockMediaItems: MediaFormData[] = [
        {
          id: "media-1",
          // proveedor: provider,
          claveOriginalSitio: "MC-001",
          costo: 15000,
          costoInstalacion: 5000,
          tipoMedio: "Espectacular",
          estado: "CDMX",
          ciudad: "Ciudad de México",
          claveZirkel: "ZK-" + Math.floor(Math.random() * 10000),
          coordenadas: "19.4326,-99.1332",
          base: 12.5,
          altura: 7.2,
          iluminacion: "LED",
          vista: "Frontal",
          orientacion: "Norte",
          caracteristica: "Alta visibilidad",
          impactosMes: 150000,
          imageUrl: "/placeholder.svg?height=200&width=300&text=Media+1",
          latitud: 19.4326,
          longitud: -99.1332,
        },
        {
          id: "media-2",
          // proveedor: provider,
          claveOriginalSitio: "PM-002",
          costo: 12000,
          costoInstalacion: 3500,
          tipoMedio: "Mural",
          estado: "Jalisco",
          ciudad: "Guadalajara",
          claveZirkel: "ZK-" + Math.floor(Math.random() * 10000),
          coordenadas: "20.6597,-103.3496",
          base: 10.0,
          altura: 6.0,
          iluminacion: "Fluorescente",
          vista: "Lateral",
          orientacion: "Sur",
          caracteristica: "Zona comercial",
          impactosMes: 120000,
          imageUrl: "/placeholder.svg?height=200&width=300&text=Media+2",
          latitud: 20.6597,
          longitud: -103.3496,
        },
      ]

      setMediaItems(mockMediaItems)
      toast({
        title: "Archivo procesado",
        description: `Se encontraron ${mockMediaItems.length} medios en el archivo.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un problema al procesar el archivo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addNewMedia = () => {
    const newId = `media-${mediaItems.length + 1}-${Date.now()}`
    const newMedia: MediaFormData = {
      id: newId,
      // proveedor: "",
      claveOriginalSitio: "",
      costo: 0,
      tipoMedio: "",
      estado: "",
      ciudad: "",
      claveZirkel: "",
      coordenadas: "",
      base: 0,
      altura: 0,
      iluminacion: "",
      vista: "",
      orientacion: "",
      latitud: 0,
      longitud: 0,
    }

    setMediaItems([...mediaItems, newMedia])

    toast({
      title: "Medio añadido",
      description: "Se ha añadido un nuevo medio a la lista. Complete los datos del formulario.",
    })
  }

  const removeMedia = (id: string) => {
    setMediaItems(mediaItems.filter((item) => item.id !== id))

    toast({
      title: "Medio eliminado",
      description: "Se ha eliminado el medio de la lista.",
    })
  }

  const updateMedia = (id: string, updatedData: MediaFormData) => {
    setMediaItems(mediaItems.map((item) => (item.id === id ? { ...updatedData } : item)))
  }

  const handleSaveAll = async () => {
    if (mediaItems.length === 0) {
      toast({
        title: "No hay datos para guardar",
        description: "Por favor procese un archivo primero.",
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
          title: "Guardar Medios",
          body: "Datos de medios guardados",
          mediaItems: mediaItems,
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
      })

      await response.json()

      toast({
        title: "Datos guardados",
        description: `Se han guardado ${mediaItems.length} espacios de medios.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un problema al guardar los datos.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyAll = () => {
    if (mediaItems.length === 0) {
      toast({
        title: "No hay datos para copiar",
        description: "Por favor procese un archivo primero.",
        variant: "destructive",
      })
      return
    }

    navigator.clipboard.writeText(JSON.stringify(mediaItems, null, 2))

    toast({
      title: "Copiado al portapapeles",
      description: `Se han copiado ${mediaItems.length} espacios de medios en formato JSON.`,
    })
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Gestión de espacios</h1>

      <Tabs defaultValue="file">
        <TabsList>
          <TabsTrigger value="file">
            <FileText className="mr-2 h-4 w-4" />
            Subir archivo
          </TabsTrigger>
          <TabsTrigger value="manual">
            <Plus className="mr-2 h-4 w-4" />
            Agregar manualmente
          </TabsTrigger>
        </TabsList>
        <TabsContent value="file">
          <div className="py-6">
            <h2 className="text-xl font-semibold mb-4">Subir archivo</h2>
            <FileUploader
              onUpload={handleFileUpload}
              isLoading={isLoading}
              title="Subir archivo"
              description="Arrastra y suelta un archivo o haz clic para seleccionar"
              supportedFormats="Formatos soportados: PDF, Excel, CSV"
              accept=".pdf,.xls,.xlsx,.csv"
            />
          </div>
        </TabsContent>
        <TabsContent value="manual">
          <div className="py-6">
            <h2 className="text-xl font-semibold mb-4">Agregar manualmente</h2>
            <Card className="w-full">
              <CardContent className="pt-6">
                <div className="text-center p-6">
                  <h3 className="text-lg font-semibold mb-2">Crear nuevo medio</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Agrega medios manualmente sin necesidad de subir un archivo
                  </p>
                  <Button onClick={addNewMedia} size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar medio manualmente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {mediaItems.length > 0 && (
        <div className="mt-8">
          <MediaList mediaItems={mediaItems} onUpdate={updateMedia} onRemove={removeMedia} />
          {mediaItems.length > 0 && (
            <div className="mt-6 flex justify-end gap-4">
              <Button variant="outline" onClick={handleCopyAll}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar todo al portapapeles
              </Button>

              <Button onClick={handleSaveAll} disabled={isLoading}>
                {isLoading ? (
                  <>Guardando...</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
