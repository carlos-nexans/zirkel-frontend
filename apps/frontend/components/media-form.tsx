"use client"

import { useState, useEffect } from "react"
import { Copy, Save } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { MediaUploader } from "@/components/media-uploader"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { MediaFormData } from "@/app/types"
import { Combobox } from "./combobox"

interface MediaFormProps {
  initialData: MediaFormData
  onUpdate?: (data: MediaFormData) => void
}

// Update the formSchema to match the simplified MediaFormData type
const formSchema = z.object({
  id: z.string(),
  proveedor: z.string().min(1, { message: "El proveedor es requerido" }),
  claveOriginalSitio: z.string().min(1, { message: "La clave original del sitio es requerida" }),
  claveZirkel: z.string().min(1, { message: "La clave ZIRKEL es requerida" }),
  base: z.coerce.number().min(0, { message: "La base debe ser mayor a 0" }),
  altura: z.coerce.number().min(0, { message: "La altura debe ser mayor a 0" }),
  ciudad: z.string().min(1, { message: "La ciudad es requerida" }),
  estado: z.string().min(1, { message: "El estado es requerido" }),
  tipoMedio: z.string().min(1, { message: "El tipo de medio es requerido" }),
  costo: z.coerce.number().min(0, { message: "El costo debe ser mayor o igual a 0" }),
  costoInstalacion: z.coerce
    .number()
    .min(0, { message: "El costo de instalación debe ser mayor o igual a 0" })
    .optional(),
  iluminacion: z.string().min(1, { message: "La iluminación es requerida" }),
  vista: z.string().min(1, { message: "La vista es requerida" }),
  orientacion: z.string().min(1, { message: "La orientación es requerida" }),
  caracteristica: z.string().optional(),
  impactosMes: z.coerce.number().min(0, { message: "Los impactos por mes deben ser mayor o igual a 0" }).optional(),
  imageUrl: z.string().optional(),
  latitud: z.coerce.number().min(-90).max(90, { message: "La latitud debe estar entre -90 y 90" }),
  longitud: z.coerce.number().min(-180).max(180, { message: "La longitud debe estar entre -180 y 180" }),
})

export function MediaForm({ initialData, onUpdate }: MediaFormProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData,
  })

  // Watch for form changes and update parent component
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (onUpdate) {
        onUpdate({ ...initialData, ...value } as MediaFormData)
      }
    })
    return () => subscription.unsubscribe()
  }, [form.watch, onUpdate, initialData])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSaving(true)

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update the parent component with the new data
      if (onUpdate) {
        onUpdate({ ...initialData, ...values } as MediaFormData)
      }

      toast({
        title: "Datos guardados",
        description: "Los datos han sido guardados correctamente.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un problema al guardar los datos.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const copyToClipboard = () => {
    const formValues = form.getValues()
    navigator.clipboard.writeText(JSON.stringify(formValues, null, 2))

    toast({
      title: "Copiado al portapapeles",
      description: "Los datos han sido copiados en formato JSON.",
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos del Medio</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {/* 1. Picture uploader */}
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagen del medio</FormLabel>
                    <FormControl>
                      <MediaUploader
                        onUpload={async (file) => {
                          setIsUploading(true)
                          try {
                            // Here you would typically upload the file to your server or cloud storage
                            // For now, we'll create a local URL
                            const imageUrl = URL.createObjectURL(file)
                            field.onChange(imageUrl)
                            if (onUpdate) {
                              onUpdate({ ...form.getValues(), imageUrl })
                            }
                            toast({
                              title: "Imagen subida",
                              description: "La imagen se ha subido correctamente",
                            })
                          } catch (error) {
                            console.error("Error uploading image:", error)
                            toast({
                              variant: "destructive",
                              title: "Error",
                              description: "No se pudo subir la imagen",
                            })
                          } finally {
                            setIsUploading(false)
                          }
                        }}
                        isLoading={isUploading}
                        currentImage={field.value}
                        onRemove={() => {
                          field.onChange("")
                          if (onUpdate) {
                            onUpdate({ ...form.getValues(), imageUrl: "" })
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 2. Clave original */}
              <FormField
                control={form.control}
                name="claveOriginalSitio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clave Original del Sitio *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 3. Clave zirkel */}
              <FormField
                control={form.control}
                name="claveZirkel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clave ZIRKEL *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 4-5. Base y Altura */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="base"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base (m)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="altura"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Altura (m)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 6. Coordenadas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="latitud"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitud</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.000001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longitud" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitud</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.000001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 7-8. Ciudad y Estado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="ciudad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 12. Iluminacion */}
              <FormField
                control={form.control}
                name="iluminacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Iluminación</FormLabel>
                    <FormControl>
                      <Combobox
                        options={[
                          'Si',
                          'Pantalla',
                          'No',
                          'Backlight'
                        ]}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 13. Vista */}
              <FormField
                control={form.control}
                name="vista"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vista</FormLabel>
                    <FormControl>
                      <Combobox
                        options={[
                          'Natural',
                          'Única',
                          'Cruzada',
                          'Lateral',
                          'Frontal',
                          'Central',
                          'N/A'
                        ]}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 14. Orientacion */}
              <FormField
                control={form.control}
                name="orientacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orientación</FormLabel>
                    <FormControl>
                      <Combobox
                        options={[
                          'Norte',
                          'Sur-Norte',
                          'Sur',
                          'Norte-Sur',
                          'Oriente',
                          'Norte Sur',
                          'Poniente',
                          'Oeste',
                          'Este',
                          'Sur Norte'
                        ]}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 9. Tipo de medio */}
              <FormField
                control={form.control}
                name="tipoMedio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Medio *</FormLabel>
                    <FormControl>
                      <Combobox
                        options={[
                          'Aeropuertos',
                          'Bajopuentes',
                          'Bicivallas',
                          'Camiones',
                          'Carteleras',
                          'Centros Comerciales',
                          'Gimnasios',
                          'Impresión de lonas',
                          'Institutos Educativos',
                          'Mupi Urbano',
                          'Mupis Digitales',
                          'Muros',
                          'Otros Medios',
                          'Pantallas Digitales',
                          'Publiandantes',
                          'Puente Digital',
                          'Puentes',
                          'Sitios de Taxis',
                          'Stand Metro',
                          'Suburbano',
                          'Totem Digital',
                          'Valla Fija',
                          'Vallas Móviles'
                        ]}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 15. Caracteristica */}
              <FormField
                control={form.control}
                name="caracteristica"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Característica</FormLabel>
                    <FormControl>
                      <Combobox
                        options={[
                          'Valla / Mampara',
                          'Videowall',
                          'Totem',
                          'Unipolar',
                          'Estructura',
                          'Azotea',
                          'Cartelera',
                          'Varios formatos',
                          'Kinder',
                          'Preparatoria',
                          'Primaria',
                          'Secundaria',
                          'Universidad',
                          'Mupi',
                          'Mupi Digital',
                          'Muro',
                          'Pantalla',
                          'Puente',
                          'Valla',
                          'Ultra Valla'
                        ]}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 16. Impactos por mes */}
              <FormField
                control={form.control}
                name="impactosMes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impactos por Mes</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hidden fields for latitude and longitude */}
              <div className="hidden">
                <FormField
                  control={form.control}
                  name="latitud"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="number" step="0.000001" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitud"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="number" step="0.000001" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <CardFooter className="flex justify-end gap-4 px-0">
              <Button type="button" variant="outline" onClick={copyToClipboard}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar al portapapeles
              </Button>

              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>Guardando...</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
