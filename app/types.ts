export interface MediaFormData {
  id: string
  proveedor: string
  claveOriginalSitio: string
  costo: number
  costoInstalacion?: number
  tipoMedio: string
  estado: string
  ciudad: string
  claveZirkel: string
  ubicacion: string
  colonia: string
  delegacion?: string
  municipio?: string
  referencias?: string
  latitud: number
  longitud: number
  coordenadas: string
  base: number
  altura: number
  pixeles?: string
  iluminacion: string
  vista: string
  orientacion: string
  formato: string
  caracteristica?: string
  tarifaVenta: number
  impactosMes?: number
  impactosSemana?: number
  impactosDia?: number
  clasificacion?: string
  nse?: string
  imageUrl?: string
  showInPdf: {
    tipoMedio: boolean
    estado: boolean
    ciudad: boolean
    claveZirkel: boolean
    ubicacion: boolean
    coordenadas: boolean
    iluminacion: boolean
    vista: boolean
    formato: boolean
    impactosMes: boolean
  }
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
