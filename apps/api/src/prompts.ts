export const extractPrompt = `
Extrae la siguiente información de este documento.
Si no encuentras algún campo, usa una cadena vacía.
El documento describe un conjunto de medios publicitarios.
Si encuentras un formato como "MEDIDAS: 13.00 X 4.20 MTS.", extrae el primer número como base y el segundo como altura
La base y altura se expresan en metros, utiliza el punto como separador decimal. Si no hay decimales, devuelvelo como entero en una cadena Ej: "13"
Si es posible, infiere o extrae la ciudad y estado.
Utiliza texto capitalizado, primera letra en mayúscula y resto en minúscula. Ej: "Ciudad de México"
Si es posible, infiere o extrae la latitud y longitud. Utiliza el formato de punto flotante. Ej: 19.4323232

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
    | 'Sur'
    | 'Oeste'
    | 'Este'
    | 'Oriente'
    | 'Poniente'
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

La estructura de datos que devuelves debe ser una lista JSON con la siguiente estructura:
type MediaData = {
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
    // Si es posible, infiere o extrae los impactos. Si es necesario, suma los impactos en un solo número.
    impactosMes?: number
    latitud: number
    longitud: number
    pagina: number
    direccion: string
    // Si es posible, infiere o extrae la delegación/municipio de la dirección. Generalmente viene después de la colonia.
    delegacion: string
    // Si es posible, infiere o extrae la colonia de la dirección. Generalmente viene precedido como Col.
    colonia: string
    // Si es posible, infiere o extrae el código postal de la dirección. Generalmente viene precedido como CP o C.P.
    codigoPostal: string
}

Escribe el resultado en formato JSON siguiendo el esquema.
`;
