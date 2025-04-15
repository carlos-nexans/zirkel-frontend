export interface MediaFormData {
  id: string
  proveedor: string
  claveOriginalSitio: string
  claveZirkel: string
  base: number
  altura: number
  coordenadas: string
  ciudad: string
  estado: string
  tipoMedio: string
  costo: number
  costoInstalacion?: number
  iluminacion: string
  vista: string
  orientacion: string
  caracteristica?: string
  impactosMes?: number
  imageUrl?: string
  latitud: number
  longitud: number
}

export interface FilterValues {
  provider: string
  mediaType: string
  state: string
  city: string
  costoMin: number
  costoMax: number
  tarifaMin: number
  tarifaMax: number
  orientation: string
  illumination: string
  nseClassification: string
  impactsMin: number
  location?: {
    lat: number
    lng: number
    radius: number
  }
}
