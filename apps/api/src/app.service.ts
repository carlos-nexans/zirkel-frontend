/**
 * This service requires the following environment variables:
 * - GEMINI_API_KEY: API key for Google's Gemini AI
 * - GOOGLE_SHEETS_CREDENTIALS: Base64 encoded Google service account credentials
 * - GOOGLE_SHEETS_ID: ID of the Google Spreadsheet containing media data
 * - GOOGLE_SLIDES_PROPOSAL_TEMPLATE: ID of the Google Slides template for proposals
 * - GOOGLE_DRIVE_PROPOSAL_FOLDER: ID of the Google Drive folder to store proposals
 * - IMAGES_PATH: Path to store media images
 * - NEXT_PUBLIC_API_BASE_URL: Base URL for the API (for image URLs)
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from '@google/genai';
import { MediaDataExtraction } from './types';
import { MediaData, Proveedor, ZirkelMediaData } from '@repo/common/types';
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

  async getMediasByKeys(zirkelKeys: string[]): Promise<ZirkelMediaData[]> {
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
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

      // Get all data from the INVENTARIO sheet
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'INVENTARIO!A:Z',
        valueRenderOption: 'UNFORMATTED_VALUE',
      });

      const rows = response.data.values || [];
      const headers = rows[0] || [];

      // Create a map of column indices
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
        tarifa: headers.indexOf('TARIFA'),
      };

      // Filter rows by Zirkel keys
      const filteredRows = rows.slice(1).filter((row) => {
        const claveZirkel = row[columnMap.claveZirkel];
        return zirkelKeys.includes(claveZirkel);
      });

      // Map filtered rows to MediaData objects
      const mediaDataList: ZirkelMediaData[] = filteredRows.map((row) => {
        // Extract coordinates if available
        let latitud = 0;
        let longitud = 0;
        const coordenadas = row[columnMap.coordenadas] as string;
        if (coordenadas && typeof coordenadas === 'string') {
          const [lat, lng] = coordenadas
            .split(',')
            .map((c) => parseFloat(c.trim()));
          if (!isNaN(lat) && !isNaN(lng)) {
            latitud = lat;
            longitud = lng;
          }
        }

        // Create MediaData object
        const mediaData: ZirkelMediaData = {
          proveedor: row[columnMap.proveedor] || '',
          claveZirkel: row[columnMap.claveZirkel] || '',
          claveOriginalSitio: row[columnMap.claveOriginalSitio] || '',
          costo: row[columnMap.costo] || 0,
          costoInstalacion: row[columnMap.costoInstalacion] || 0,
          tipoMedio: row[columnMap.tipoMedio] || '',
          estado: row[columnMap.estado] || '',
          ciudad: row[columnMap.ciudad] || '',
          base: row[columnMap.base] || 0,
          altura: row[columnMap.altura] || 0,
          iluminacion: row[columnMap.iluminacion] || '',
          vista: row[columnMap.vista] || '',
          orientacion: row[columnMap.orientacion] || '',
          caracteristica: row[columnMap.caracteristica] || '',
          direccion: row[columnMap.direccion] || '',
          delegacion: row[columnMap.delegacion] || '',
          colonia: row[columnMap.colonia] || '',
          codigoPostal: row[columnMap.codigoPostal] || '',
          tarifa: row[columnMap.tarifa] || 0,
          latitud,
          longitud,
          imageUrl: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002'}/media/${row[columnMap.claveZirkel]}.jpeg`,
        };

        return mediaData;
      });

      this.logger.log(
        `Found ${mediaDataList.length} media items for ${zirkelKeys.length} Zirkel keys`,
      );
      return mediaDataList;
    } catch (error) {
      this.logger.error('Error fetching media by keys:', error);
      throw new Error(`Failed to fetch media by keys: ${error.message}`);
    }
  }

  /**
   * Creates a proposal by:
   * 1. Fetching media data from the spreadsheet using the provided Zirkel keys
   * 2. Creating a copy of the Google Slides template
   * 3. Duplicating the second slide for each media
   * 4. Filling in the template with media data
   *
   * @param zirkelKeys Array of Zirkel keys to include in the proposal
   * @returns The ID of the created Google Slides presentation
   */
  async createProposal(zirkelKeys: string[]): Promise<string> {
    this.logger.log(
      `Creando propuesta con ${zirkelKeys.length} claves Zirkel: ${zirkelKeys.join(', ')}`,
    );

    // 1. Fetch Media from the spreadsheet using the claveZirkel
    const mediaList = await this.getMediasByKeys(zirkelKeys);
    if (mediaList.length === 0) {
      throw new Error('No media found with the provided Zirkel keys');
    }

    // Get credentials for Google API
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
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/presentations',
      ],
    });

    // 2. Create a copy of the Google Slides template
    const drive = google.drive({ version: 'v3', auth });
    const slides = google.slides({ version: 'v1', auth });

    // Generate a unique name for the presentation
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const randomString = Math.random().toString(36).substring(2, 6); // 4 random characters
    const presentationName = `${date}_${randomString}`;

    // Create a copy of the template
    const templateId = process.env.GOOGLE_SLIDES_PROPOSAL_TEMPLATE;
    const folderId = process.env.GOOGLE_DRIVE_PROPOSAL_FOLDER;

    if (!templateId) {
      throw new Error(
        'GOOGLE_SLIDES_PROPOSAL_TEMPLATE environment variable is not set',
      );
    }

    if (!folderId) {
      throw new Error(
        'GOOGLE_DRIVE_PROPOSAL_FOLDER environment variable is not set',
      );
    }

    const copyResponse = await drive.files.copy({
      fileId: templateId,
      requestBody: {
        name: presentationName,
        parents: [folderId],
      },
      supportsAllDrives: true,
    });

    const presentationId = copyResponse.data.id;
    if (!presentationId) {
      throw new Error('Failed to create a copy of the template');
    }

    this.logger.log(`Created presentation with ID: ${presentationId}`);

    // 3. Get the presentation to understand its structure
    let presentation = await slides.presentations.get({
      presentationId,
    });

    // Find the second slide (template for media)
    if (presentation.data.slides && presentation.data.slides.length < 2) {
      throw new Error('Template presentation does not have enough slides');
    }

    const templateSlide = presentation.data.slides?.[1];
    const templateSlideId = templateSlide?.objectId;

    if (!templateSlideId) {
      throw new Error('Could not find template slide ID');
    }

    // 3.1. Leave the first page intact

    // 3.2. Duplicate the second page for each media and update content
    const requests: any[] = [];

    const slidesList = presentation.data.slides;

    if (!slidesList || slidesList.length < 2) {
      throw new Error('La presentación no tiene al menos 2 slides');
    }

    // First, create duplicates of the template slide for each media (except the first one)
    for (let i = 1; i < mediaList.length; i++) {
      requests.push({
        duplicateObject: {
          objectId: templateSlideId,
        },
      });
    }

    // Apply the duplication requests
    if (requests.length > 0) {
      await slides.presentations.batchUpdate({
        presentationId,
        requestBody: {
          requests,
        },
      });
    }

    // Fetch the presentation again to get the updated slides
    presentation = await slides.presentations.get({
      presentationId,
    });

    // Now, update each slide with the media data
    for (let i = 0; i < mediaList.length; i++) {
      const media = mediaList[i];
      const currentSlideId = presentation.data.slides?.[i + 1]?.objectId;
      if (!currentSlideId) {
        this.logger.warn(
          `Could not find slide ID for media ${media.claveZirkel}`,
        );
        continue;
      }

      // Get the current slide to find the table
      const slideResponse = await slides.presentations.get({
        presentationId,
        fields: 'slides',
      });

      const currentSlide = slideResponse.data.slides?.find(
        (slide) => slide.objectId === currentSlideId,
      );

      if (!currentSlide) {
        this.logger.warn(`Could not find slide with ID ${currentSlideId}`);
        continue;
      }

      // Find the table and image placeholder in the slide
      const tableElement = currentSlide.pageElements?.find(
        (element) => element.table !== undefined,
      );
      const imagePlaceholder = currentSlide.pageElements?.find(
        (element) => element.shape?.text?.textElements?.some(
          (textElement) => textElement.textRun?.content?.includes('Imagen')
        )
      );

      if (!tableElement || !tableElement.objectId || !tableElement.table) {
        this.logger.warn(`Could not find table in slide ${currentSlideId}`);
        continue;
      }

      if (!imagePlaceholder || !imagePlaceholder.objectId) {
        this.logger.warn(`Could not find image placeholder in slide ${currentSlideId}`);
        continue;
      }

      // Prepare the replacement requests for this slide
      const replacementRequests: any[] = [];

      // Helper function to add text replacement if value exists
      const addReplacement = (
        findText: string,
        replaceText: any,
        deleteRowIfEmpty = true,
      ) => {
        if (
          replaceText !== undefined &&
          replaceText !== null &&
          replaceText !== ''
        ) {
          replacementRequests.push({
            replaceAllText: {
              containsText: { text: findText },
              replaceText: String(replaceText),
              pageObjectIds: [currentSlideId],
            },
          });
          return true;
        } else if (deleteRowIfEmpty) {
          // If we need to delete the row, we'll handle it separately
          return false;
        }
        return true;
      };

      // Add replacements for each field
      const replacements = [
        { find: 'CLAVE', value: media.claveZirkel },
        { find: 'CIUDAD', value: media.ciudad },
        { find: 'DIRECCIÓN', value: media.direccion },
        { find: 'MEDIDA', value: `${media.base}x${media.altura}` },
        { find: 'TIPO', value: media.tipoMedio },
        {
          find: 'COORDENADAS',
          value:
            media.latitud && media.longitud
              ? `${media.latitud}, ${media.longitud}`
              : '',
        },
        { find: 'IMPACTOS', value: media.impactosMes },
        {
          find: 'PRECIO',
          value: media.tarifa ? `$${media.costo.toLocaleString('es-MX')}` : '',
        },
      ];

      // Track which rows need to be deleted due to missing values
      const rowsToDelete: any[] = [];

      // Process each replacement
      replacements.forEach((replacement) => {
        const hasValue = addReplacement(replacement.find, replacement.value);
        if (!hasValue) {
          // Mark this row for deletion
          rowsToDelete.push(replacement.find);
        }
      });

      // Prepare requests for text replacements and image insertion
      const requests = [
        ...replacementRequests,
        {
          createImage: {
            url: `${process.env.NEXT_PUBLIC_API_BASE_URL}/media/${media.claveZirkel}.jpeg`,
            elementProperties: {
              pageObjectId: currentSlideId,
              size: imagePlaceholder.size,
              transform: imagePlaceholder.transform,
            },
          },
        },
        {
          deleteObject: {
            objectId: imagePlaceholder.objectId,
          },
        },
      ];

      // Apply all updates
      await slides.presentations.batchUpdate({
        presentationId,
        requestBody: {
          requests,
        },
      });

      // TODO: Handle row deletion for empty values if needed
      // This would require more complex logic to identify and delete specific table rows
      // which is beyond the scope of this implementation

      // Add data to speaker notes
      const speakerNotesObjectId =
        currentSlide.notesProperties?.speakerNotesObjectId;

      if (speakerNotesObjectId) {
        let speakerNotesText = ``;

        for (let key of Object.keys(media)) {
          const value = media[key as keyof ZirkelMediaData];
          if (value !== undefined && value !== null && value !== '') {
            speakerNotesText += `${key}: ${value}\n`;
          }
        }

        const speakerNotesRequests = [
          {
            replaceAllText: {
              containsText: { text: 'Click to add speaker notes' }, // Target the default placeholder text
              replaceText: speakerNotesText,
              pageObjectIds: [currentSlideId], // Apply to the current slide's notes page
            },
          },
        ];

        await slides.presentations.batchUpdate({
          presentationId,
          requestBody: {
            requests: speakerNotesRequests,
          },
        });
      } else {
        this.logger.warn(
          `Could not find speaker notes object ID for slide ${currentSlideId}`,
        );
      }
    }

    // Delete the original template slide (the second slide) is not needed anymore
    // if (templateSlideId) {
    //   await slides.presentations.batchUpdate({
    //     presentationId,
    //     requestBody: {
    //       requests: [
    //         {
    //           deleteObject: {
    //             objectId: templateSlideId,
    //           },
    //         },
    //       ],
    //     },
    //   });
    // }

    this.logger.log(
      `Propuesta ${presentationName} creada con éxito. ID: ${presentationId}`,
    );
    return presentationId;
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
