import { Controller, Post, Get, Param, Body, UploadedFiles, UseInterceptors, Req, BadRequestException, Patch, Delete, Query } from '@nestjs/common';
import { TemplateService } from './template.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../upload/multer.config';
import { Request } from 'express';
import { UploadService } from '../upload/upload.service';

@Controller('template')
export class TemplateController {
  constructor(
    private readonly templateService: TemplateService,
    private readonly uploadService: UploadService,
  ) {}

  @Post('create')
  @UseInterceptors(FilesInterceptor('images', 3, multerOptions('templates')))
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
    @Req() req: Request
  ) {
    const userId = body.userId;
    const siteId = body.siteId;
    if (!userId) throw new BadRequestException('Utilisateur non authentifié');
    if (!siteId) throw new BadRequestException('Site manquant');

    // Validate images if provided
    if (files && files.length > 0) {
      const imageValidation = this.uploadService.validateImageFiles(files);
      if (!imageValidation.valid) throw new BadRequestException(imageValidation.error);
    }

    // Upload files to cloud and create template using returned URLs
    const fileResponses = files && files.length > 0 ? await this.uploadService.createBulkUploadResponse(files, 'templates') : [];
    console.log('[TemplateController] create: user=', userId, ' site=', siteId, ' uploadedFiles=', files ? files.length : 0);
    if (fileResponses && fileResponses.length > 0) console.log('[TemplateController] create: fileResponses sample=', fileResponses.map(r => ({ filename: r.filename, url: r.url })).slice(0,5));
    const created = await this.templateService.createTemplateWithMedia(body, fileResponses, userId, siteId);
    console.log('[TemplateController] create: created template id=', created._id, ' images_count=', created.images?.length || 0);
    return created;
  }

  @Post('site')
  async getBySite(@Body() body: any) {
    const siteId = body.siteId;
    if (!siteId) throw new BadRequestException('Site manquant');
    return this.templateService.getTemplatesBySite(siteId);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    if (id === 'getall') {
      // Redirige vers la vraie méthode getAllTemplates si l'URL est /template/getall
      return this.getAllTemplates();
    }
    console.log('[BACKEND][TemplateController] getOne called with id:', id);
    return this.templateService.getTemplate(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Body() body: any) {
    const { userId, password } = body;
    if (!userId || !password) throw new BadRequestException('Utilisateur ou mot de passe manquant');
    await this.templateService.deleteTemplate(id, userId, password);
    return { message: 'Template supprimé' };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const updated = await this.templateService.updateTemplate(id, body);
    return updated;
  }
  
  // Nouvelle route pour lister les templates publics filtrés par type
  @Get()
  async getPublicTemplatesByType(@Query('type') type: string, @Query('isPublic') isPublic: string) {
    // isPublic peut être 'true' ou 'false' en string
    const isPublicBool = isPublic =='true';
    return this.templateService.getPublicTemplatesByType(type, isPublicBool);
  }
  // ajouter une autre fonction qui returne tous les templates sans condition
  @Get('getall')
  async getAllTemplates() {
    console.log('[BACKEND][TemplateController] getAllTemplates called');
    return this.templateService.getAllTemplates();
  }
}
