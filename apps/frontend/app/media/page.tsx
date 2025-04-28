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
import { Caracteristica, MediaData, Orientacion, Proveedor, TipoMedio, Vista } from "@repo/common/types"
import { useProveedores } from "@/hooks/use-proveedores"
import { FormLabel } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export type MediaDataExtraction = {
  // Clave única del medio
  clave?: string
  base: number
  altura: number
  ciudad: string
  estado: string
  tipoMedio: TipoMedio
  costo: number
  costoInstalacion?: number
  iluminacion: "Si" | "No"
  vista: Vista
  orientacion: Orientacion
  caracteristica?: Caracteristica
  impactosMes?: number
  latitud: number
  longitud: number
  pagina: number
  // Base64 string of the largest image
  largestImage?: string
}

export default function MediaPage() {
  const [mediaItems, setMediaItems] = useState<MediaFormData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [provider, setProvider] = useState<Proveedor | null>(null);
  const { toast } = useToast()
  const { providers = [], isLoadingProviders } = useProveedores();

  const handleFileUpload = async (file: File) => {
    setIsLoading(true)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
      const url = `${baseUrl}/extract`;

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al procesar el archivo');
      }

      const mediaItems: MediaDataExtraction[] = await response.json();

      const transformedItems: MediaFormData[] = mediaItems.map((item, index) => ({
        id: Math.random().toString(36).toString(),
        claveZirkel: `ZM${provider!.clave}${item.clave}`,
        claveOriginalSitio: item.clave || '',
        costo: item.costo,
        costoInstalacion: item.costoInstalacion,
        tipoMedio: item.tipoMedio,
        estado: item.estado,
        ciudad: item.ciudad,
        base: item.base,
        altura: item.altura,
        iluminacion: item.iluminacion,
        vista: item.vista,
        orientacion: item.orientacion,
        caracteristica: item.caracteristica,
        impactosMes: item.impactosMes,
        imageUrl: item.largestImage,
        latitud: item.latitud,
        longitud: item.longitud,
      }));
      setMediaItems(transformedItems)
      toast({
        title: "Archivo procesado",
        description: `Se encontraron ${transformedItems.length} medios en el archivo.`,
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
    const newMedia: MediaFormData = {
      id: Math.random().toString(36).toString(),
      // proveedor: "",
      claveOriginalSitio: "",
      costo: 0,
      tipoMedio: "",
      estado: "",
      ciudad: "",
      claveZirkel: "",
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
      const mediaData: MediaData[] = mediaItems.map((item) => ({
        ...item,
        proveedor: provider?.proveedor!,
        // Remove base64 image from the data, it will fly as a file
        imageUrl: undefined,
      }))

      const formData = new FormData();
      formData.append('mediaDataList', JSON.stringify(mediaData));

      // Para cada media que tenga imagen
      for (const media of mediaItems) {
        if (media.imageUrl) {
          if (media.imageUrl.startsWith('blob:')) {
            // Fetch the blob URL to get the file
            const response = await fetch(media.imageUrl);
            const blob = await response.blob();
            // Create a File object from the blob
            const file = new File([blob], media.claveZirkel, { type: blob.type });
            formData.append('files', file);
          } else {
            // Convertir base64 a File
            const base64Response = await fetch(media.imageUrl);
            const blob = await base64Response.blob();
            const file = new File([blob], media.claveZirkel, { type: blob.type });
            formData.append('files', file);
          }
        }
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/medios`, {
        method: "POST",
        body: formData
      });

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

    // Define CSV headers
    const headers = [
      'Clave Original',
      'Clave ZIRKEL',
      'Base',
      'Altura',
      'Ciudad',
      'Estado',
      'Tipo de Medio',
      'Costo',
      'Costo Instalación',
      'Iluminación',
      'Vista',
      'Orientación',
      'Característica',
      'Impactos por Mes',
      'Latitud',
      'Longitud'
    ].join(',')

    // Convert each media item to CSV row
    const rows = mediaItems.map(item => [
      item.claveOriginalSitio || '',
      item.claveZirkel || '',
      item.base || '',
      item.altura || '',
      item.ciudad || '',
      item.estado || '',
      item.tipoMedio || '',
      item.costo || '',
      item.costoInstalacion || '',
      item.iluminacion || '',
      item.vista || '',
      item.orientacion || '',
      item.caracteristica || '',
      item.impactosMes || '',
      item.latitud || '',
      item.longitud || ''
    ].join(','))

    // Combine headers and rows
    const csvContent = [headers, ...rows].join('\n')

    navigator.clipboard.writeText(csvContent)

    toast({
      title: "Copiado al portapapeles",
      description: `Se han copiado ${mediaItems.length} espacios de medios en formato CSV.`,
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
              provider={provider}
              setProvider={setProvider}
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
                <div className="mb-4">
                  <Label htmlFor="provider">Proveedor *</Label>
                  <Select onValueChange={(value) => {
                    const selectedProvider = providers.find((p: Proveedor) => p.clave === value)
                    setProvider(selectedProvider!)
                  }} value={provider?.clave}>
                    <SelectTrigger id="provider">
                      <SelectValue placeholder={isLoadingProviders ? "Cargando proveedores..." : "Seleccionar proveedor"} />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((p: Proveedor) => (
                        <SelectItem key={p.clave} value={p.clave}>
                          <p>{p.proveedor} <span className="text-gray-300">{p.clave}</span></p>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    El proveedor seleccionado se aplicará a todos los medios creados manualmente
                  </p>
                </div>
                <div className="text-center p-6">
                  <h3 className="text-lg font-semibold mb-2">Crear nuevo medio</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Agrega medios manualmente sin necesidad de subir un archivo
                  </p>
                  <Button onClick={addNewMedia} size="sm" variant="outline" disabled={!provider}>
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
