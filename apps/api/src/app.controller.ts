import { BadRequestException, Controller, Get, Post, Sse, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

@Controller()
export class AppController {
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
    } finally {
      // Cleanup: Remove temporary file
      if (fs.existsSync(tempFilePath)) {
        await fs.promises.unlink(tempFilePath);
      }
    }
  }
}
