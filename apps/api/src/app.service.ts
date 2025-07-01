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
  createPartFromBase64,
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
        //model: 'gemini-2.0-flash',
        model: 'gemini-2.5-pro',
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
      //console.log(response.text!)
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
          // largestImage = await this.getPageLargestImageFromPDF(page);
          largestImage = await this.findBestImageForMedia(page, item);
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

      const response = await this.retryWithBackoff(
        () => sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'PROVEEDORES!A:AA', // Get all columns from the PROVEEDORES sheet
          valueRenderOption: 'UNFORMATTED_VALUE',
          dateTimeRenderOption: 'FORMATTED_STRING',
        }),
        5,
        1000,
        'Get proveedores data'
      );

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
      const response = await this.retryWithBackoff(
        () => sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'INVENTARIO!A:Z',
          valueRenderOption: 'UNFORMATTED_VALUE',
        }),
        5,
        1000,
        'Get media inventory data'
      );

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
        impactos: headers.indexOf('IMPACTOS MES'),
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
          impactosMes: row[columnMap.impactos] || 0,
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

    // Ordenar medios por ciudad alfabeticamente antes de crear las slides
    mediaList.sort((a, b) => a.ciudad.localeCompare(b.ciudad));

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

    const copyResponse = await this.retryWithBackoff(
      () => drive.files.copy({
        fileId: templateId,
        requestBody: {
          name: presentationName,
          parents: [folderId],
        },
        supportsAllDrives: true,
      }),
      5,
      1000,
      'Drive file copy'
    );

    const presentationId = copyResponse.data.id;
    if (!presentationId) {
      throw new Error('Failed to create a copy of the template');
    }

    this.logger.log(`Created presentation with ID: ${presentationId}`);

    // 3. Get the presentation to understand its structure
    let presentation = await this.retryWithBackoff(
      () => slides.presentations.get({
        presentationId,
      }),
      5,
      1000,
      'Get presentation structure'
    );

    // Find the first and second slides
    if (!presentation.data.slides || presentation.data.slides.length < 2) {
      throw new Error('Template presentation does not have enough slides');
    }

    const firstSlide = presentation.data.slides[0];
    const firstSlideId = firstSlide.objectId;

    const templateSlide = presentation.data.slides[1];
    const templateSlideId = templateSlide.objectId;

    if (!firstSlideId || !templateSlideId) {
      throw new Error('Could not find slide IDs');
    }

    // 3.1. Update the date on the first slide
    const currentDate = new Date();
    const monthYearFormat = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

    const requests: any[] = [
      {
        replaceAllText: {
          containsText: { text: 'FECHA' },
          replaceText: monthYearFormat,
          pageObjectIds: [firstSlideId],
        },
      },
    ];

    // 3.2. Duplicate the second page for each media and update content

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
      await this.retryWithBackoff(
        () => slides.presentations.batchUpdate({
          presentationId,
          requestBody: {
            requests,
          },
        }),
        5,
        1000,
        'Batch update for slide duplication'
      );
    }

    // Fetch the presentation again to get the updated slides
    presentation = await this.retryWithBackoff(
      () => slides.presentations.get({
        presentationId,
      }),
      5,
      1000,
      'Get updated presentation'
    );

    // Now, update each slide with the media data
    this.logger.log(`Processing ${mediaList.length} media items for slides...`);

    for (let i = 0; i < mediaList.length; i++) {
      const media = mediaList[i];
      const currentSlideId = presentation.data.slides?.[i + 1]?.objectId;

      this.logger.log(`Processing media ${i + 1}/${mediaList.length}: ${media.claveZirkel}`);

      if (!currentSlideId) {
        this.logger.warn(
          `Could not find slide ID for media ${media.claveZirkel}`,
        );
        continue;
      }

      // Get the current slide to find the table
      const slideResponse = await this.retryWithBackoff(
        () => slides.presentations.get({
          presentationId,
          fields: 'slides',
        }),
        5,
        1000,
        `Get slide ${i + 1} details`
      );

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
      const imagePlaceholder = currentSlide.pageElements?.find((element) =>
        element.shape?.text?.textElements?.some((textElement) =>
          textElement.textRun?.content?.includes('Imagen'),
        ),
      );

      if (!tableElement || !tableElement.objectId || !tableElement.table) {
        this.logger.warn(`Could not find table in slide ${currentSlideId}`);
        continue;
      }

      if (!imagePlaceholder || !imagePlaceholder.objectId) {
        this.logger.warn(
          `Could not find image placeholder in slide ${currentSlideId}`,
        );
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
      const replacements: any[] = [
        { find: 'CLAVE', value: media.claveZirkel || 'N/A' },
        { find: 'CIUDAD', value: media.ciudad || 'N/A' },
        {
          find: 'DIRECCIÓN',
          value:
            media.direccion && media.direccion.length > 40
              ? `${media.direccion.substring(0, 40)}...`
              : media.direccion || 'N/A',
        },
        {
          find: 'MEDIDA',
          value:
            media.base && media.altura
              ? `${media.base.toFixed(2)} x ${media.altura.toFixed(2)}`
              : 'N/A',
        },
        { find: 'TIPO', value: media.tipoMedio || 'N/A' },
        {
          find: 'COORDENADAS',
          value:
            media.latitud && media.longitud
              ? `${media.latitud}, ${media.longitud}`
              : 'N/A',
        },
        { find: 'IMPACTOS', value: media.impactosMes || 'N/A' },
        {
          find: 'PRECIO',
          value: media.tarifa
            ? `$${media.tarifa.toLocaleString('es-MX')}`
            : 'Consultar',
        },
        //CARACTERISTICAS
        {
          find: 'CARACTERISTICAS',
          value: media.caracteristica ? media.caracteristica : 'N/A',
        },
        {
          find: 'MEDIO',
          value: media.tipoMedio ? media.tipoMedio : '',
        },
        {
          find: 'ESTADO',
          value: media.estado ? media.estado : '',
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

      const url = process.env.NEXT_PUBLIC_API_BASE_URL?.includes('localhost')
        ? 'https://images.unsplash.com/photo-1513757378314-e46255f6ed16?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/media/${media.claveZirkel}.jpeg`;

      // Prepare requests for text replacements and image insertion
      const requests = [
        // eslint-disable-next-line
        ...replacementRequests,
        {
          createImage: {
            url,
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
      await this.retryWithBackoff(
        () => slides.presentations.batchUpdate({
          presentationId,
          requestBody: {
            requests,
          },
        }),
        5,
        1000,
        `Update slide ${i + 1} content`
      );

      // Add progressive delay between each media processing to reduce API pressure
      // Longer delays for larger batches to be more conservative
      if (i < mediaList.length - 1) {
        const baseDelay = 500;
        const progressiveDelay = mediaList.length > 10 ? 200 : 0;
        await this.delay(baseDelay + progressiveDelay);
        this.logger.log(`Completed media ${i + 1}/${mediaList.length}, continuing...`);
      }

      // TODO: Handle row deletion for empty values if needed
      // This would require more complex logic to identify and delete specific table rows
      // which is beyond the scope of this implementation

      // Add data as off-screen text
      let dataText = ``;
      for (const key of Object.keys(media)) {
        // eslint-disable-next-line
        const value = media[key as keyof ZirkelMediaData];
        if (value !== undefined && value !== null && value !== '') {
          dataText += `${key}: ${value}\n`;
        }
      }

      // Create a text box off-screen with the data
      const offScreenTextRequests = [
        {
          createShape: {
            objectId: `data_${currentSlideId}`,
            shapeType: 'TEXT_BOX',
            elementProperties: {
              pageObjectId: currentSlideId,
              size: {
                width: { magnitude: 300, unit: 'PT' },
                height: { magnitude: 500, unit: 'PT' },
              },
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: 1000, // Position off-screen
                translateY: 0,
                unit: 'PT',
              },
            },
          },
        },
        {
          insertText: {
            objectId: `data_${currentSlideId}`,
            text: dataText,
          },
        },
      ];

      await this.retryWithBackoff(
        () => slides.presentations.batchUpdate({
          presentationId,
          requestBody: {
            requests: offScreenTextRequests,
          },
        }),
        5,
        1000,
        `Add off-screen data for slide ${i + 1}`
      );
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

      // Obtener prefijos de proveedores para generar claves nuevas
      const proveedores = await this.getProveedores();
      const proveedorMap = new Map(
        proveedores.map((p) => [p.proveedor.toLowerCase(), p.clave]),
      );

      // Primero obtenemos todos los datos actuales del spreadsheet
      const response = await this.retryWithBackoff(
        () => sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'INVENTARIO!A:Z',
          valueRenderOption: 'UNFORMATTED_VALUE',
        }),
        5,
        1000,
        'Get spreadsheet data'
      );

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
        impactosMes: headers.indexOf('IMPACTOS MES'),
      };

      // Track used rows during this batch operation to avoid conflicts
      const usedRowIndices = new Set<number>();

      // Find the first TARIFA column to determine safe update range
      let firstTarifaColumn = headers.length; // Default to end of headers if no tarifa found
      headers.forEach((header, index) => {
        if (header?.toString().toUpperCase().includes('TARIFA') && index < firstTarifaColumn) {
          firstTarifaColumn = index;
        }
      });

      const safeUpdateRange = firstTarifaColumn > 0 ? this.getColumnLetter(firstTarifaColumn) : 'Z';
      this.logger.log(`Safe update range: A:${safeUpdateRange} (stopping before TARIFA columns at column ${firstTarifaColumn + 1})`);

      // Check for duplicates in input data
      const claveZirkelCounts = new Map<string, number>();
      const duplicates = new Set<string>();

      mediaDataList.forEach((media, index) => {
        const clave = media.claveZirkel;
        if (clave) {
          const count = claveZirkelCounts.get(clave) || 0;
          claveZirkelCounts.set(clave, count + 1);
          if (count > 0) {
            duplicates.add(clave);
          }
        }
      });

      // Determine the list to process (deduplicated or original)
      let processedMediaList = mediaDataList;

      if (duplicates.size > 0) {
        this.logger.warn(`⚠️  Found ${duplicates.size} duplicate claveZirkel values in input data:`);
        Array.from(duplicates).forEach(clave => {
          const count = claveZirkelCounts.get(clave);
          this.logger.warn(`  - ${clave}: appears ${count} times`);
        });
        this.logger.warn(`This will result in ${mediaDataList.length - duplicates.size} actual spreadsheet rows instead of ${mediaDataList.length}`);

        // Deduplicate the input data (keep last occurrence)
        const seenClaves = new Set<string>();
        const deduplicatedList: MediaData[] = [];

        // Process in reverse to keep the last occurrence of each duplicate
        for (let i = mediaDataList.length - 1; i >= 0; i--) {
          const media = mediaDataList[i];
          const clave = media.claveZirkel;
          if (!clave || !seenClaves.has(clave)) {
            if (clave) seenClaves.add(clave);
            deduplicatedList.unshift(media);
          }
        }

        this.logger.log(`🔧 Deduplicated: ${mediaDataList.length} → ${deduplicatedList.length} items (keeping last occurrence of duplicates)`);
        processedMediaList = deduplicatedList;
      }

      // Procesar cada medio
      this.logger.log(`Processing ${processedMediaList.length} media items for spreadsheet updates...`);

      for (let i = 0; i < processedMediaList.length; i++) {
        const mediaData = processedMediaList[i];
        const isDuplicate = duplicates.has(mediaData.claveZirkel || '');
        const duplicateMarker = isDuplicate ? ' 🔄 [DUPLICATE]' : '';
        this.logger.log(`Processing media ${i + 1}/${processedMediaList.length}: ${mediaData.claveZirkel || 'New item'}${duplicateMarker}`);
        // Remove image handling since it's now done in the controller

        // Crear el string de coordenadas combinando latitud y longitud
        const coordenadas =
          mediaData.latitud && mediaData.longitud
            ? `${mediaData.latitud}, ${mediaData.longitud}`
            : '';

        // Si no tenemos clave, intentar generar una basada en el proveedor
        if (!mediaData.claveZirkel) {
          const prefijo = proveedorMap.get(mediaData.proveedor.toLowerCase());
          if (prefijo) {
            const prefixWithZm = `ZM${prefijo}`;
            let maxNum = 0;
            for (const row of existingRows.slice(1)) {
              const key = row[columnMap.claveZirkel];
              if (typeof key === 'string' && key.startsWith(prefixWithZm)) {
                const match = key.match(/-(\d+)$/);
                if (match) {
                  const num = parseInt(match[1], 10);
                  if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                  }
                }
              }
            }
            mediaData.claveZirkel = `${prefixWithZm}-${maxNum + 1}`;
          }
        }

        // Buscar si el medio ya existe
        const existingRowIndex = existingRows.findIndex(
          (row) => row[columnMap.claveZirkel] === mediaData.claveZirkel,
        );

        if (existingRowIndex > 0) {
          // Actualizar medio existente
          const existingRow = existingRows[existingRowIndex];
          // Only preserve data up to TARIFA columns to avoid accidentally overwriting them
          const updatedRow = [...existingRow.slice(0, firstTarifaColumn)];
          // Ensure the array is the right length by padding with empty strings if needed
          while (updatedRow.length < firstTarifaColumn) {
            updatedRow.push('');
          }

          // Mark this row as used
          usedRowIndices.add(existingRowIndex);

          // Actualizar solo los campos que vienen en mediaData
          Object.entries(mediaData).forEach(([key, value]) => {
            if (columnMap[key] !== undefined && value !== undefined && columnMap[key] < firstTarifaColumn) {
              // Skip coordinates fields
              if (key !== 'latitud' && key !== 'longitud') {
                updatedRow[columnMap[key]] = value;
              }
            }
          });

          // Actualizar las coordenadas
          if (coordenadas && columnMap.coordenadas < firstTarifaColumn) {
            updatedRow[columnMap.coordenadas] = coordenadas;
          }

          // Update our local existingRows to reflect the changes (only up to TARIFA)
          // Preserve the TARIFA columns from the original row
          const updatedRowWithTarifa = [...existingRow];
          for (let i = 0; i < firstTarifaColumn; i++) {
            updatedRowWithTarifa[i] = updatedRow[i];
          }
          existingRows[existingRowIndex] = updatedRowWithTarifa;

          // Update the row but only up to the column before TARIFA
          await this.retryWithBackoff(
            () => sheets.spreadsheets.values.update({
              spreadsheetId,
              range: `INVENTARIO!A${existingRowIndex + 1}:${safeUpdateRange}${existingRowIndex + 1}`,
              valueInputOption: 'USER_ENTERED',
              requestBody: {
                values: [updatedRow],
              },
            }),
            5,
            1000,
            `Update existing row ${existingRowIndex + 1} for ${mediaData.claveZirkel}`
          );

          // Add a small delay between operations to reduce API pressure
          if (i < processedMediaList.length - 1) {
            await this.delay(300);
            this.logger.log(`Completed media ${i + 1}/${processedMediaList.length}, continuing...`);
          }
        } else {
          // Crear nuevo medio
          const newRow = new Array(headers.length).fill('');
          Object.entries(mediaData).forEach(([key, value]) => {
            if (columnMap[key] !== undefined && key !== 'latitud' && key !== 'longitud') {
              if (value !== undefined && value !== null && value !== '') {
                newRow[columnMap[key]] = value;
              }
            }
          });

          // Agregar las coordenadas combinadas
          if (coordenadas) {
            newRow[columnMap.coordenadas] = coordenadas;
          }

          // Buscar la primera fila vacía que no tenga ni claveZirkel ni proveedor y que no haya sido usada en este batch
          let emptyRowIndex = -1;
          for (let idx = 1; idx < existingRows.length; idx++) {
            const row = existingRows[idx];
            if (
              !usedRowIndices.has(idx) &&
              (!row[columnMap.claveZirkel] || row[columnMap.claveZirkel] === '') &&
              (!row[columnMap.proveedor] || row[columnMap.proveedor] === '')
            ) {
              emptyRowIndex = idx;
              break;
            }
          }

          // Si no encontramos una fila vacía, usar la siguiente posición después de todas las filas
          if (emptyRowIndex === -1) {
            emptyRowIndex = existingRows.length;
            // Extend existingRows array to include this new row
            existingRows.push(new Array(headers.length).fill(''));
          }

          // Mark this row as used
          usedRowIndices.add(emptyRowIndex);

          // Update our local existingRows to reflect the new data for subsequent iterations
          existingRows[emptyRowIndex] = [...newRow];

          // Insert new row but only up to the column before TARIFA
          await this.retryWithBackoff(
            () => sheets.spreadsheets.values.update({
              spreadsheetId,
              range: `INVENTARIO!A${emptyRowIndex + 1}:${safeUpdateRange}${emptyRowIndex + 1}`,
              valueInputOption: 'USER_ENTERED',
              requestBody: {
                values: [newRow.slice(0, firstTarifaColumn)],
              },
            }),
            5,
            1000,
            `Insert new row ${emptyRowIndex + 1} for ${mediaData.claveZirkel}`
          );

          // Add a small delay between operations to reduce API pressure
          if (i < mediaDataList.length - 1) {
            await this.delay(300);
            this.logger.log(`Completed media ${i + 1}/${mediaDataList.length}, continuing...`);
          }
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
  private async getAllImagesFromPDFPage(page: any): Promise<string[]> {
    const images: string[] = [];

    try {
      // Using the pdf-extractor library which handles resolving internal
      // XObject references automatically. This avoids the "object not resolved"
      // issues seen with the previous implementation.
      const { extractImagesFromPage } = await import('pdf-extractor');

      // extractImagesFromPage is expected to accept a pdf.js page instance and
      // return an array of image buffers
      const pageImages: Buffer[] = await extractImagesFromPage(page);

      for (const imgBuf of pageImages) {
        const buffer = await sharp(imgBuf)
          .resize(600, null, {
            fit: 'contain',
            withoutEnlargement: true,
          })
          .jpeg()
          .toBuffer();

        images.push(`data:image/jpeg;base64,${buffer.toString('base64')}`);
      }
    } catch (error) {
      this.logger.error('Error extracting images:', error);
    }

    return images;
  }

  async findBestImageForMedia(
    page: any,
    mediaData: MediaDataExtraction,
  ): Promise<string | null> {
    try {
      const images = await this.getAllImagesFromPDFPage(page);

      if (images.length === 0) {
        return null;
      }

      // Create prompt including media data and asking Gemini to select the best image
      const prompt = `Given the following media data:
  ${JSON.stringify(mediaData, null, 2)}
  
  Select the image that best represents this media data. Respond with the index of the best image (0-based).
  If not image is suitable, respond with the best available one.
  Have preference for photographs of the media, if avaialble.
  If there is not photographs, the second best is the map.
  Respond using this schema { "index": number }.
  `;

      const contents = createUserContent([
        ...images.map((img) => {
          // Remove the Data URL prefix if present
          const base64Data = img.startsWith('data:image/jpeg;base64,')
            ? img.substring('data:image/jpeg;base64,'.length)
            : img;
          return createPartFromBase64(base64Data, 'image/jpeg');
        }),
        prompt,
      ]);

      const result = await this.genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        // model: 'gemini-2.5-pro-preview-05-06',
        config: {
          responseMimeType: 'application/json',
        },
        contents,
      });

      const responseText = result.text!;

      this.logger.log(
        `Gemini API usage for image selection: ${result.usageMetadata?.totalTokenCount}`,
      );

      // eslint-disable-next-line
      const json = JSON.parse(responseText);

      // eslint-disable-next-line
      const selectedIndex: number = json.index;

      if (selectedIndex >= 0 && selectedIndex < images.length) {
        return images[selectedIndex];
      } else {
        this.logger.warn(
          `Gemini returned invalid index ${selectedIndex}. Returning null.`,
        );
        return null;
      }
    } catch (error) {
      this.logger.error('Error finding best image:', error);
      return null;
    }
  }

  /**
   * Convert column number to Excel column letter (1-based)
   * e.g., 1 = A, 2 = B, 27 = AA, etc.
   */
  private getColumnLetter(columnNumber: number): string {
    let result = '';
    while (columnNumber > 0) {
      columnNumber--;
      result = String.fromCharCode(65 + (columnNumber % 26)) + result;
      columnNumber = Math.floor(columnNumber / 26);
    }
    return result;
  }

  /**
   * Utility function to add delay between API calls
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry function with exponential backoff for Google API calls
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 5,
    baseDelay: number = 1000,
    operationName: string = 'API call'
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        const isRateLimitError =
          error?.message?.includes('write requests per minute per user exceeded') ||
          error?.message?.includes('rate limit') ||
          error?.message?.includes('quota exceeded') ||
          error?.status === 429 ||
          error?.code === 429;

        if (isRateLimitError && attempt < maxRetries) {
          const delayMs = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
          this.logger.warn(
            `${operationName} rate limited (attempt ${attempt}/${maxRetries}). ` +
            `Retrying in ${Math.round(delayMs)}ms...`
          );
          await this.delay(delayMs);
          continue;
        }

        // If it's not a rate limit error or we've exhausted retries, throw the error
        this.logger.error(`${operationName} failed after ${attempt} attempts:`, error?.message);
        throw error;
      }
    }
    throw new Error(`${operationName} failed after ${maxRetries} attempts`);
  }
}
