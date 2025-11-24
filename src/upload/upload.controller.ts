import { Controller, Post, UploadedFile, UseInterceptors, Req, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { multerOptions } from './multer.config';

@Controller('upload')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', multerOptions('general')))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier n\'a été uploadé');
    }

    // Valider le fichier
    const validation = this.uploadService.validateImageFile(file);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // Retourner une réponse standardisée (peut uploader vers Cloudinary si configuré)
    return await this.uploadService.createUploadResponse(file, 'general');
  }

  @Post('document')
  @UseInterceptors(FileInterceptor('file', multerOptions('documents')))
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier n\'a été uploadé');
    }

    const validation = this.uploadService.validateDocumentFile(file);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    return await this.uploadService.createUploadResponse(file, 'documents');
  }
}
