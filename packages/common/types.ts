// Revisar luego

export interface MediaData {
    proveedor: string
    claveOriginalSitio: string
    claveZirkel: string
    base: number
    altura: number
    ciudad: string
    estado: string
    tipoMedio: string
    costo: number
    costoInstalacion?: number
    iluminacion?: Iliminacion
    vista: string
    orientacion: Orientacion
    caracteristica?: string
    impactosMes?: number
    imageUrl?: string
    latitud: number
    longitud: number
    direccion: string
    delegacion: string
    colonia: string
    codigoPostal: string
}

export type ZirkelMediaData = MediaData & { tarifa: number }

export type Iliminacion = 
    | 'Si'
    | 'Pantalla'
    | 'No'
    | 'Backlight'
    | string;

export type TipoMedio = 
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
    | 'Vallas Móviles'
    | string;

export type Vista = 
    | 'Natural'
    | 'Única'
    | 'Cruzada'
    | 'Lateral'
    | 'Frontal'
    | 'Central'
    | 'N/A'
    | string;

export type Orientacion =
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

export type Caracteristica =
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


export interface Proveedor {
    clave: string;
    proveedor: string;
    razonSocial: string;
    negociacion: string;
    cobertura: string;
    carteleras: boolean;
    pantallas: boolean;
    puentes: boolean;
    muros: boolean;
    sitiosTaxis: boolean;
    vallasFijas: boolean;
    aeropuertos: boolean;
    vallasMoviles: boolean;
    gimnasios: boolean;
    suburbano: boolean;
    metro: boolean;
    mupisDigitales: boolean;
    centrosComerciales: boolean;
    totemDigital: boolean;
    autobuses: boolean;
    universidades: boolean;
    otrosAlternativos: boolean;
    impresion: boolean;
    contacto: string;
    telefono: string;
    email: string;
    restricciones: string;
  }