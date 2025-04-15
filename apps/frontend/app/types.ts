import type {MediaData} from "@repo/common/types"

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

export type MediaFormData = Omit<MediaData, "proveedor">;