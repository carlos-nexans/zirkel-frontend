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
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import type { MediaFormData } from "@/app/types"

interface MediaFormProps {
  initialData: MediaFormData
  onUpdate?: (data: MediaFormData) => void
}

// Update the formSchema to include the id field
const formSchema = z.object({
  id: z.string(),
  proveedor: z.string().min(1, { message: "El proveedor es requerido" }),
  claveOriginalSitio: z.string().min(1, { message: "La clave original del sitio es requerida" }),
  costo: z.coerce.number().min(0, { message: "El costo debe ser mayor o igual a 0" }),
  costoInstalacion: z.coerce.number().min(0, { message: "El costo de instalación debe ser mayor o igual a 0" }).optional(),
  tipoMedio: z.string().min(1, { message: "El tipo de medio es requerido" }),
  estado: z.string().min(1, { message: "El estado es requerido" }),
  ciudad: z.string().min(1, { message: "La ciudad es requerida" }),
  claveZirkel: z.string().min(1, { message: "La clave ZIRKEL es requerida" }),
  ubicacion: z.string().min(1, { message: "La ubicación es requerida" }),
  colonia: z.string().min(1, { message: "La colonia es requerida" }),
  delegacion: z.string().optional(),
  municipio: z.string().optional(),
  referencias: z.string().optional(),
  latitud: z.coerce.number().min(-90).max(90, { message: "La latitud debe estar entre -90 y 90" }),
  longitud: z.coerce.number().min(-180).max(180, { message: "La longitud debe estar entre -180 y 180" }),
  coordenadas: z.string().min(1, { message: "Las coordenadas son requeridas" }),
  base: z.coerce.number().min(0, { message: "La base debe ser mayor a 0" }),
  altura: z.coerce.number().min(0, { message: "La altura debe ser mayor a 0" }),
  pixeles: z.string().optional(),
  iluminacion: z.string().min(1, { message: "La iluminación es requerida" }),
  vista: z.string().min(1, { message: "La vista es requerida" }),
  orientacion: z.string().min(1, { message: "La orientación es requerida" }),
  formato: z.string().min(1, { message: "El formato es requerido" }),
  caracteristica: z.string().optional(),
  tarifaVenta: z.coerce.number().min(0, { message: "La tarifa de venta debe ser mayor o igual a 0" }),
  impactosMes: z.coerce.number().min(0, { message: "Los impactos por mes deben ser mayor o igual a 0" }).optional(),
  impactosSemana: z.coerce.number().min(0, { message: "Los impactos por semana deben ser mayor o igual a 0" }).optional(),
  impactosDia: z.coerce.number().min(0, { message: "Los impactos por día deben ser mayor o igual a 0" }).optional(),
  clasificacion: z.string().optional(),
  nse: z.string().optional(),
  imageUrl: z.string().optional(),
})

interface Provider {
  id: number;
  name: string;
}

export function MediaForm({ initialData, onUpdate }: MediaFormProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [providers, setProviders] = useState<Provider[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        // Mocked API call to JSONPlaceholder
        const response = await fetch('https://jsonplaceholder.typicode.com/users')
        const data = await response.json()
        // Take only first 5 users and map them to providers
        const mockProviders = data.slice(0, 5).map((user: any) => ({
          id: user.id,
          name: user.company.name
        }))
        setProviders(mockProviders)
      } catch (error) {
        console.error('Error fetching providers:', error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los proveedores"
        })
      }
    }

    fetchProviders()
  }, [])

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
            {/* Información Básica */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Información Básica</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="proveedor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proveedor *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar proveedor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {providers.map((provider) => (
                            <SelectItem key={provider.id} value={provider.name}>
                              {provider.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <FormField
                  control={form.control}
                  name="claveZirkel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clave ZIRKEL *</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <FormField
                  control={form.control}
                  name="costo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo del Espacio *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="costoInstalacion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo de Instalación</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tarifaVenta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tarifa de Venta *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} readOnly />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <FormField
                  control={form.control}
                  name="tipoMedio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Medio *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Aeropuertos">Aeropuertos</SelectItem>
                          <SelectItem value="Bajopuentes">Bajopuentes</SelectItem>
                          <SelectItem value="Carteleras">Carteleras</SelectItem>
                          <SelectItem value="Gimnasios">Gimnasios</SelectItem>
                          <SelectItem value="Institutos Educativos">Institutos Educativos</SelectItem>
                          <SelectItem value="Mupi">Mupi</SelectItem>
                          <SelectItem value="Mupi Urbano">Mupi Urbano</SelectItem>
                          <SelectItem value="Mupis Digitales">Mupis Digitales</SelectItem>
                          <SelectItem value="Muros">Muros</SelectItem>
                          <SelectItem value="Pantallas Digitales">Pantallas Digitales</SelectItem>
                          <SelectItem value="Puente Digital">Puente Digital</SelectItem>
                          <SelectItem value="Puentes">Puentes</SelectItem>
                          <SelectItem value="Sitios de Taxis">Sitios de Taxis</SelectItem>
                          <SelectItem value="Suburbano">Suburbano</SelectItem>
                          <SelectItem value="Totem Digital">Totem Digital</SelectItem>
                          <SelectItem value="Valla Fija">Valla Fija</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <FormField
                  control={form.control}
                  name="costo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="costoInstalacion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo de Instalación</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="claveZirkel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clave ZIRKEL</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coordenadas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coordenadas</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tarifaVenta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tarifa de Venta</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
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
                <FormField
                  control={form.control}
                  name="iluminacion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Iluminación</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LED">LED</SelectItem>
                          <SelectItem value="Fluorescente">Fluorescente</SelectItem>
                          <SelectItem value="Sin iluminación">Sin iluminación</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vista"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vista</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar vista" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Frontal">Frontal</SelectItem>
                          <SelectItem value="Lateral">Lateral</SelectItem>
                          <SelectItem value="Posterior">Posterior</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <FormField
                  control={form.control}
                  name="orientacion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Orientación</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar orientación" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Norte">Norte</SelectItem>
                          <SelectItem value="Sur">Sur</SelectItem>
                          <SelectItem value="Este">Este</SelectItem>
                          <SelectItem value="Oeste">Oeste</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="formato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formato</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar formato" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Unipolar">Unipolar</SelectItem>
                          <SelectItem value="Adosado">Adosado</SelectItem>
                          <SelectItem value="Estructura">Estructura</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                </div>
                <FormField
                  control={form.control}
                  name="caracteristica"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Característica</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

              <FormField
                control={form.control}
                name="impactosSemana"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impactos por Semana</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="impactosDia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impactos por Día</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                            onUpdate({ ...form.getValues(), imageUrl, showInPdf: initialData.showInPdf })
                          }
                          toast({
                            title: "Imagen subida",
                            description: "La imagen se ha subido correctamente"
                          })
                        } catch (error) {
                          console.error('Error uploading image:', error)
                          toast({
                            variant: "destructive",
                            title: "Error",
                            description: "No se pudo subir la imagen"
                          })
                        } finally {
                          setIsUploading(false)
                        }
                      }}
                      isLoading={isUploading}
                      currentImage={field.value}
                      onRemove={() => {
                        field.onChange('')
                        if (onUpdate) {
                          onUpdate({ ...form.getValues(), imageUrl: '', showInPdf: initialData.showInPdf })
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
