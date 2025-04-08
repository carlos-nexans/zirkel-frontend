"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react"
import { GeolocationFilter } from "./geolocation-filter"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import type { FilterValues } from "@/app/proposal/page"

interface FilterPanelProps {
  onSubmit: (values: FilterValues) => void
  isLoading: boolean
}

const formSchema = z.object({
  provider: z.string().optional(),
  mediaType: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  costoMin: z.coerce.number().min(0).optional(),
  costoMax: z.coerce.number().min(0).optional(),
  tarifaMin: z.coerce.number().min(0).optional(),
  tarifaMax: z.coerce.number().min(0).optional(),
  orientation: z.string().optional(),
  illumination: z.string().optional(),
  nseClassification: z.string().optional(),
  impactsMin: z.coerce.number().min(0).optional(),
})

// Mock data for dropdowns
const providers = ["MediaCorp", "PubliMax", "VisualAds", "OutdoorMedia", "CityAds"]
const mediaTypes = ["Espectacular", "Mural", "Pantalla Digital", "Valla", "Parabús"]
const states = ["CDMX", "Jalisco", "Nuevo León", "Estado de México", "Puebla"]
const cities = {
  CDMX: ["Ciudad de México"],
  Jalisco: ["Guadalajara", "Zapopan", "Tlaquepaque"],
  "Nuevo León": ["Monterrey", "San Pedro Garza García", "Apodaca"],
  "Estado de México": ["Toluca", "Ecatepec", "Naucalpan"],
  Puebla: ["Puebla", "Cholula", "Atlixco"],
}
const orientations = ["Norte", "Sur", "Este", "Oeste"]
const illuminations = ["LED", "Fluorescente", "Sin iluminación"]
const nseClassifications = ["A/B", "C+", "C", "D+", "D/E"]

// Advanced filter options
const advancedFilterOptions = [
  { id: "orientation", label: "Orientación" },
  { id: "illumination", label: "Iluminación" },
  { id: "nseClassification", label: "Clasificación NSE" },
  { id: "impactsMin", label: "Impactos mínimos" },
]

export function FilterPanel({ onSubmit, isLoading }: FilterPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [activeAdvancedFilters, setActiveAdvancedFilters] = useState<string[]>([])
  const [availableAdvancedFilters, setAvailableAdvancedFilters] = useState(advancedFilterOptions)
  const [selectedState, setSelectedState] = useState<string>("")
  const [costoRange, setCostoRange] = useState([0, 100000])
  const [tarifaRange, setTarifaRange] = useState([0, 100000])
  const [location, setLocation] = useState<{ lat: number; lng: number; radius: number } | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: "",
      mediaType: "",
      state: "",
      city: "",
      costoMin: 0,
      costoMax: 100000,
      tarifaMin: 0,
      tarifaMax: 100000,
      orientation: "",
      illumination: "",
      nseClassification: "",
      impactsMin: 0,
    },
  })

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    // Update cost ranges from sliders
    values.costoMin = costoRange[0]
    values.costoMax = costoRange[1]
    values.tarifaMin = tarifaRange[0]
    values.tarifaMax = tarifaRange[1]

    // Include location in the submission if it exists
    onSubmit({
      ...values,
      ...(location && {
        location: {
          lat: location.lat,
          lng: location.lng,
          radius: location.radius
        }
      })
    } as FilterValues)
  }

  const addAdvancedFilter = (filterId: string) => {
    setActiveAdvancedFilters([...activeAdvancedFilters, filterId])
    setAvailableAdvancedFilters(availableAdvancedFilters.filter((f) => f.id !== filterId))
  }

  const removeAdvancedFilter = (filterId: string) => {
    setActiveAdvancedFilters(activeAdvancedFilters.filter((id) => id !== filterId))
    const filterToAdd = advancedFilterOptions.find((f) => f.id === filterId)
    if (filterToAdd) {
      setAvailableAdvancedFilters([...availableAdvancedFilters, filterToAdd])
    }
  }

  const handleStateChange = (value: string) => {
    setSelectedState(value)
    form.setValue("state", value)
    form.setValue("city", "")
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            {/* Default Filters */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar proveedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {providers.map((provider) => (
                          <SelectItem key={provider} value={provider}>
                            {provider}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mediaType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Medio</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {mediaTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={(value) => handleStateChange(value)} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {states.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedState}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={selectedState ? "Seleccionar ciudad" : "Seleccione un estado primero"}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {selectedState &&
                          cities[selectedState as keyof typeof cities]?.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Rango de Costo (MXN)</FormLabel>
                <div className="pt-4 px-2">
                  <Slider
                    defaultValue={[0, 100000]}
                    max={100000}
                    step={1000}
                    value={costoRange}
                    onValueChange={setCostoRange}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                  <span>${costoRange[0].toLocaleString()}</span>
                  <span>${costoRange[1].toLocaleString()}</span>
                </div>
              </div>

              <div>
                <FormLabel>Rango de Tarifa (MXN)</FormLabel>
                <div className="pt-4 px-2">
                  <Slider
                    defaultValue={[0, 100000]}
                    max={100000}
                    step={1000}
                    value={tarifaRange}
                    onValueChange={setTarifaRange}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                  <span>${tarifaRange[0].toLocaleString()}</span>
                  <span>${tarifaRange[1].toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Advanced Filters Toggle */}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Ocultar filtros avanzados
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Mostrar filtros avanzados
                  </>
                )}
              </Button>
            </div>

            {/* Advanced Filters */}
            {showAdvanced && (
              <div className="space-y-4">
                <Separator />

                {/* Active Advanced Filters */}
                {activeAdvancedFilters.map((filterId) => (
                  <div key={filterId} className="relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => removeAdvancedFilter(filterId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>

                    {filterId === "orientation" && (
                      <FormField
                        control={form.control}
                        name="orientation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Orientación</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar orientación" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {orientations.map((orientation) => (
                                  <SelectItem key={orientation} value={orientation}>
                                    {orientation}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    )}

                    {filterId === "illumination" && (
                      <FormField
                        control={form.control}
                        name="illumination"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Iluminación</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar iluminación" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {illuminations.map((illumination) => (
                                  <SelectItem key={illumination} value={illumination}>
                                    {illumination}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    )}

                    {filterId === "nseClassification" && (
                      <FormField
                        control={form.control}
                        name="nseClassification"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Clasificación NSE</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar NSE" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {nseClassifications.map((nse) => (
                                  <SelectItem key={nse} value={nse}>
                                    {nse}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    )}

                    {filterId === "impactsMin" && (
                      <FormField
                        control={form.control}
                        name="impactsMin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Impactos mínimos por mes</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Ej: 50000"
                                {...field}
                                onChange={(e) => field.onChange(e.target.valueAsNumber)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                ))}

                {/* Add Filter Dropdown */}
                {availableAdvancedFilters.length > 0 && (
                  <div>
                    <Select
                      onValueChange={(value) => {
                        addAdvancedFilter(value)
                      }}
                    >
                      <SelectTrigger>
                        <div className="flex items-center">
                          <Plus className="h-4 w-4 mr-2" />
                          <span>Añadir filtro</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {availableAdvancedFilters.map((filter) => (
                          <SelectItem key={filter.id} value={filter.id}>
                            {filter.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Ubicación</h3>
                </div>
                <GeolocationFilter
                  onLocationSelect={setLocation}
                  isLoading={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Buscando..." : "Buscar espacios"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
