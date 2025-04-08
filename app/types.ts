export interface MediaFormData {
  id: string
  proveedor: string
  tipoMedio: string
  ciudad: string
  estado: string
  costo: number
  costoInstalacion: number
  claveZirkel: string
  coordenadas: string
  base: number
  altura: number
  tamano: string
  iluminacion: string
  vista: string
  orientacion: string
  formato: string
  caracteristica: string
  tarifaVenta: number
  impactosMes: number
  impactosSemana: number
  impactosDia: number
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

export interface MediaResult {
  id: string
  provider: string
  mediaType: string
  state: string
  city: string
  cost: number
  tarifa: number
  orientation: string
  illumination: string
  nseClassification: string
  impacts: number
  location: {
    lat: number
    lng: number
  }
  imageUrl: string
}
