export interface MediaData {
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
