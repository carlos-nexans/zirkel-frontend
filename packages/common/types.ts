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
    orientacion: Orientacion
    caracteristica?: string
    impactosMes?: number
    imageUrl?: string
    latitud: number
    longitud: number
}

type TipoMedio = 
    | 'Aeropuertos'
    | 'Bajopuentes'
    | 'Bicivallas'
    | 'Camiones'
    | 'Carteleras'
    | 'Centros Comerciales'
    | 'Gimnasios'
    | 'Impresión de lonas'
    | 'Institutos Educativos'
    | 'Mupi Urbano'
    | 'Mupis Digitales'
    | 'Muros'
    | 'Otros Medios'
    | 'Pantallas Digitales'
    | 'Publiandantes'
    | 'Puente Digital'
    | 'Puentes'
    | 'Sitios de Taxis'
    | 'Stand Metro'
    | 'Suburbano'
    | 'Totem Digital'
    | 'Valla Fija'
    | 'Vallas Móviles';

type Vista = 
    | 'Natural'
    | 'Única'
    | 'Cruzada'
    | 'Lateral'
    | 'Frontal'
    | 'Central'
    | 'N/A'
    | string;

type Orientacion =
    | 'Norte'
    | 'Sur-Norte'
    | 'Sur'
    | 'Norte-Sur'
    | 'Oriente'
    | 'Norte Sur'
    | 'Poniente'
    | 'Oeste'
    | 'Este'
    | 'Sur Norte'
    | string;

type Caracteristica =
|'Valla / Mampara'
|'Videowall'
|'Totem'
|'Unipolar'
|'Estructura'
|'Azotea'
|'Cartelera'
|'Cartelera'
|'Estructura'
|'Varios formatos'
|'Kinder'
|'Preparatoria'
|'Primaria'
|'Secundaria'
|'Universidad'
|'Mupi'
|'Mupi Digital'
|'Muro'
|'Pantalla'
|'Puente'
|'Valla'
|'Ultra Valla'
| string