import { Injectable, Logger } from '@nestjs/common';
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from '@google/genai';
import { MediaDataExtraction } from './types';
import { MediaData, Proveedor } from '@repo/common/types';
import { google } from 'googleapis';
import * as sharp from 'sharp';
import { extractPrompt } from './prompts';
import { promises as fs } from 'fs';

@Injectable()
export class AppService {
  private genAI: GoogleGenAI;
  private readonly logger = new Logger();
  private pdfjs: any = null;

  constructor() {
    this.genAI = new GoogleGenAI({ apiKey: process.env?.GEMINI_API_KEY! });
    this.loadPDFJS();
  }

  private async loadPDFJS() {
    if (!this.pdfjs) {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      this.pdfjs = pdfjsLib;
    }
    return this.pdfjs;
  }

  private async loadPDF(filePath: string) {
    const buffer = await fs.readFile(filePath);
    const uint8Array = new Uint8Array(buffer);
    const pdfjsLib = await this.loadPDFJS();
    return pdfjsLib.getDocument({ data: uint8Array }).promise;
  }

  private async getPageLargestImageFromPDF(page: any): Promise<string | null> {
    try {
      const operatorList = await page.getOperatorList();
      let largestImage = null;
      let maxArea = 0;
      const pdfjsLib = await this.loadPDFJS();

      // First, ensure all objects are resolved
      await page.objs.resolve();

      for (let i = 0; i < operatorList.fnArray.length; i++) {
        const op = operatorList.fnArray[i];
        const args = operatorList.argsArray[i];

        if (op === pdfjsLib.OPS.paintImageXObject && args && args[0]) {
          try {
            const imageXObject = await page.objs.get(args[0]);
            if (!imageXObject) continue;

            if (imageXObject && imageXObject.width && imageXObject.height) {
              let currentTransform = [1, 0, 0, 1, 0, 0];

              for (let j = i - 1; j >= 0; j--) {
                if (operatorList.fnArray[j] === pdfjsLib.OPS.transform) {
                  currentTransform = operatorList.argsArray[j];
                  break;
                }
              }

              const scaledWidth = Math.abs(
                imageXObject.width * currentTransform[0],
              );
              const scaledHeight = Math.abs(
                imageXObject.height * currentTransform[3],
              );
              const area = scaledWidth * scaledHeight;

              if (area > maxArea) {
                maxArea = area;
                largestImage = {
                  ...imageXObject,
                  scaledWidth,
                  scaledHeight,
                };
              }
            }
          } catch (err) {
            // console.warn(`Skipping image ${args[0]}: ${err.message}`);
            continue;
          }
        }
      }

      if (largestImage) {
        const { width, height, data, scaledWidth, scaledHeight } = largestImage;
        const isHorizontal = scaledWidth > scaledHeight;

        let newWidth, newHeight;
        if (isHorizontal) {
          newWidth = Math.min(scaledWidth, 600);
          newHeight = Math.round((scaledHeight * newWidth) / scaledWidth);
        } else {
          newHeight = Math.min(scaledHeight, 600);
          newWidth = Math.round((scaledWidth * newHeight) / scaledHeight);
        }

        const sharpImage = sharp(data, {
          raw: {
            width,
            height,
            channels: 3,
          },
        }).resize(newWidth, newHeight, {
          fit: 'contain',
        });

        const buffer = await sharpImage.jpeg().toBuffer();
        return `data:image/jpeg;base64,${buffer.toString('base64')}`;
      }

      return null;
    } catch (error) {
      console.error('Error extracting image:', error);
      return null;
    }
  }

  async processFile(filePath: string, mimeType: string) {
    try {
      const file = await this.genAI.files.upload({
        file: filePath,
        config: { mimeType },
      });

      const result = await this.genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        // model: 'gemini-2.5-pro-preview-05-06',
        config: {
          responseMimeType: 'application/json',
        },
        contents: createUserContent([
          createPartFromUri(file.uri!, file.mimeType!),
          extractPrompt,
        ]),
      });

      const response = await result;
      this.logger.log(
        `Gemini API usage ${response.usageMetadata?.totalTokenCount}`,
      );
      const extractedData = JSON.parse(response.text!) as MediaDataExtraction[];

      let pdfDocument;
      if (mimeType === 'application/pdf') {
        pdfDocument = await this.loadPDF(filePath);
      }

      // Add the largest image to each extracted item
      const extractedDataWithImages = extractedData.map(async (item) => {
        let largestImage: string | null = null;
        if (mimeType === 'application/pdf') {
          const page = await pdfDocument.getPage(item.pagina);
          largestImage = await this.getPageLargestImageFromPDF(page);
        }

        return {
          ...item,
          largestImage,
        };
      });

      return Promise.all(extractedDataWithImages);
    } catch (error) {
      throw new Error(`Failed to process file: ${error.message}`);
    }
  }

  async getProveedores(): Promise<Proveedor[]> {
    try {
      const credentials = Buffer.from(
        process.env.GOOGLE_SHEETS_CREDENTIALS || '',
        'base64',
      ).toString();
      if (!credentials) {
        throw new Error(
          'GOOGLE_SHEETS_CREDENTIALS environment variable is not set',
        );
      }

      const parsedCredentials = JSON.parse(credentials);

      const auth = new google.auth.GoogleAuth({
        credentials: parsedCredentials,
        scopes: [
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/spreadsheets.readonly',
        ],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'PROVEEDORES!A:AA', // Get all columns from the PROVEEDORES sheet
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING',
      });

      const rows = response.data.values || [];
      const data = rows.slice(1);

      return data.map((row) => {
        const proveedor: Proveedor = {
          clave: row[0]?.toString() || '',
          proveedor: row[1]?.toString() || '',
          razonSocial: row[2]?.toString() || '',
          negociacion: row[3]?.toString() || '',
          cobertura: row[4]?.toString() || '',
          carteleras: row[5]?.toString().toLowerCase() === 'x',
          pantallas: row[6]?.toString().toLowerCase() === 'x',
          puentes: row[7]?.toString().toLowerCase() === 'x',
          muros: row[8]?.toString().toLowerCase() === 'x',
          sitiosTaxis: row[9]?.toString().toLowerCase() === 'x',
          vallasFijas: row[10]?.toString().toLowerCase() === 'x',
          aeropuertos: row[11]?.toString().toLowerCase() === 'x',
          vallasMoviles: row[12]?.toString().toLowerCase() === 'x',
          gimnasios: row[13]?.toString().toLowerCase() === 'x',
          suburbano: row[14]?.toString().toLowerCase() === 'x',
          metro: row[15]?.toString().toLowerCase() === 'x',
          mupisDigitales: row[16]?.toString().toLowerCase() === 'x',
          centrosComerciales: row[17]?.toString().toLowerCase() === 'x',
          totemDigital: row[18]?.toString().toLowerCase() === 'x',
          autobuses: row[19]?.toString().toLowerCase() === 'x',
          universidades: row[20]?.toString().toLowerCase() === 'x',
          otrosAlternativos: row[21]?.toString().toLowerCase() === 'x',
          impresion: row[22]?.toString().toLowerCase() === 'x',
          contacto: row[23]?.toString() || '',
          telefono: row[24]?.toString() || '',
          email: row[25]?.toString() || '',
          restricciones: row[26]?.toString() || '',
        };
        return proveedor;
      });
    } catch (error) {
      this.logger.error('Error fetching proveedores:', error);
      throw new Error(`Failed to fetch proveedores: ${error.message}`);
    }
  }

  async updateMedias(mediaDataList: MediaData[]): Promise<void> {
    try {
      const credentials = Buffer.from(
        process.env.GOOGLE_SHEETS_CREDENTIALS || '',
        'base64',
      ).toString();
      if (!credentials) {
        throw new Error(
          'GOOGLE_SHEETS_CREDENTIALS environment variable is not set',
        );
      }

      const parsedCredentials = JSON.parse(credentials);
      const auth = new google.auth.GoogleAuth({
        credentials: parsedCredentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

      // Primero obtenemos todos los datos actuales del spreadsheet
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'INVENTARIO!A:Z',
        valueRenderOption: 'UNFORMATTED_VALUE',
      });

      const existingRows = response.data.values || [];
      const headers = existingRows[0] || [];

      // Crear un mapa de índices de columnas
      const columnMap = {
        proveedor: headers.indexOf('PROVEEDOR'),
        claveZirkel: headers.indexOf('CLAVE'),
        claveOriginalSitio: headers.indexOf('CLAVE ORIGINAL'),
        costo: headers.indexOf('COSTO'),
        costoInstalacion: headers.indexOf('COSTO DE INSTALACIÓN'),
        tipoMedio: headers.indexOf('MEDIO'),
        estado: headers.indexOf('ESTADO '),
        ciudad: headers.indexOf('CIUDAD'),
        base: headers.indexOf('BASE'),
        altura: headers.indexOf('ALTURA'),
        iluminacion: headers.indexOf('ILUMINACIÓN'),
        vista: headers.indexOf('VISTA'),
        orientacion: headers.indexOf('ORIENTACIÓN'),
        caracteristica: headers.indexOf('CARACTERISTICAS'),
        coordenadas: headers.indexOf('COORDENADAS'),
        direccion: headers.indexOf('DIRECCIÓN'),
        delegacion: headers.indexOf('DELEGACIÓN / MUNICIPIO'),
        colonia: headers.indexOf('COLONIA'),
        codigoPostal: headers.indexOf('CÓDIGO POSTAL'),
      };

      // Procesar cada medio
      for (const mediaData of mediaDataList) {
        // Remove image handling since it's now done in the controller

        // Crear el string de coordenadas combinando latitud y longitud
        const coordenadas =
          mediaData.latitud && mediaData.longitud
            ? `${mediaData.latitud}, ${mediaData.longitud}`
            : '';

        // Buscar si el medio ya existe
        const existingRowIndex = existingRows.findIndex(
          (row) => row[columnMap.claveZirkel] === mediaData.claveZirkel,
        );

        if (existingRowIndex > 0) {
          // Actualizar medio existente
          const existingRow = existingRows[existingRowIndex];
          const updatedRow = [...existingRow];

          // Actualizar solo los campos que vienen en mediaData
          Object.entries(mediaData).forEach(([key, value]) => {
            if (columnMap[key] !== undefined && value !== undefined) {
              // Si no es latitud ni longitud, actualizar normalmente
              if (key !== 'latitud' && key !== 'longitud') {
                updatedRow[columnMap[key]] = value;
              }
            }
          });

          // Actualizar las coordenadas
          if (coordenadas) {
            updatedRow[columnMap.coordenadas] = coordenadas;
          }

          // Actualizar la fila en el spreadsheet
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `INVENTARIO!A${existingRowIndex + 1}:Z${existingRowIndex + 1}`,
            valueInputOption: 'RAW',
            requestBody: {
              values: [updatedRow],
            },
          });
        } else {
          // Crear nuevo medio
          const newRow = new Array(headers.length).fill('');
          Object.entries(mediaData).forEach(([key, value]) => {
            if (
              columnMap[key] !== undefined &&
              key !== 'latitud' &&
              key !== 'longitud'
            ) {
              newRow[columnMap[key]] = value;
            }
          });

          // Agregar las coordenadas combinadas
          if (coordenadas) {
            newRow[columnMap.coordenadas] = coordenadas;
          }

          // Agregar la nueva fila al final del spreadsheet
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'INVENTARIO!A:Z',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
              values: [newRow],
            },
          });
        }
      }

      this.logger.log(
        `Actualización de ${mediaDataList.length} medios completada`,
      );
    } catch (error) {
      this.logger.error('Error actualizando medios:', error);
      throw new Error(`Error actualizando medios: ${error.message}`);
    }
  }
}
