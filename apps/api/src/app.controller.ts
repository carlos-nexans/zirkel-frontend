import { BadRequestException, Controller, Get, InternalServerErrorException, Logger, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AppService } from './app.service';
import { Proveedor } from '@repo/common/types';

@Controller()
export class AppController {
  private readonly logger = new Logger();
  constructor(private readonly appService: AppService) {}

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

    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, file.originalname);

    try {
      // Save the uploaded file to temp directory
      await fs.promises.writeFile(tempFilePath, file.buffer);

      // Process the file using Gemini
      const result = await this.appService.processFile(tempFilePath, file.mimetype);

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
}
