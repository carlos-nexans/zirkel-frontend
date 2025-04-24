import { BadRequestException, Controller, Get, InternalServerErrorException, Logger, Post, UploadedFile, UseInterceptors, Body, UploadedFiles, Inject } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Cache } from 'cache-manager';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { AppService } from './app.service';
import { MediaData, Proveedor } from '@repo/common/types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Controller()
export class AppController {
  private readonly logger = new Logger();

  constructor(
    private readonly appService: AppService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  private generateFileHash(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  @Get()
  health(): string {
    return 'ok';
  }

  @Post('extract')
  @UseInterceptors(FileInterceptor('file'))
  async extractFromFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Generate hash from file buffer
    const fileHash = this.generateFileHash(file.buffer);

    // Try to get from cache
    const cachedResult = await this.cacheManager.get(fileHash);
    if (cachedResult) {
      this.logger.log(`Cache hit for file hash: ${fileHash}`);
      return cachedResult;
    }

    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, file.originalname);

    try {
      // Save the uploaded file to temp directory
      await fs.promises.writeFile(tempFilePath, file.buffer);

      // Process the file using Gemini
      const result = await this.appService.processFile(tempFilePath, file.mimetype);

      // Store in cache with TTL of 10 minutes (600 seconds)
      await this.cacheManager.set(fileHash, result, 600000);

      return result;
    } catch (error) {
      console.error('Error processing file:', error);
      throw new InternalServerErrorException('Error processing file'); 
    } finally {
      // Cleanup: Remove temporary file
      if (fs.existsSync(tempFilePath)) {
        await fs.promises.unlink(tempFilePath);
      }
    }
  }

  @Get('proveedores')
  getProveedores(): Promise<Proveedor[]> {
    return this.appService.getProveedores();
  }

  @Post('medios')
  @UseInterceptors(FilesInterceptor('files'))
  async updateMedias(@Body() body: any, @UploadedFiles() files: Express.Multer.File[]) {
    try {
      // Parsear el string JSON a array de MediaData
      const mediaDataList: MediaData[] = typeof body.mediaDataList === 'string' 
        ? JSON.parse(body.mediaDataList)
        : body.mediaDataList;

      console.log('Datos de medios recibidos:', mediaDataList);
      
      // Procesar los datos de los medios
      await this.appService.updateMedias(mediaDataList);

      // TODO: Procesar los archivos si es necesario
      console.log('Archivos recibidos:', files);

      return { message: 'Datos de medios actualizados correctamente' };
    } catch (error) {
      this.logger.error('Error al procesar los medios:', error);
      throw new InternalServerErrorException('Error al procesar los medios');
    }
  }
}
