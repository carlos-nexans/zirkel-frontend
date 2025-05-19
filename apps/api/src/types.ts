import type {TipoMedio, Vista, Orientacion, Caracteristica} from "@repo/common/types"

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
    direccion: string;
    delegacion: string;
    colonia: string;
    codigoPostal: string;
}