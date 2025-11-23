import { Controller, Get, Post, Delete, Body, Param, Query, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from '../upload/upload.service';

@Controller('portfolio')
export class PortfolioController {
  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly uploadService: UploadService,
  ) {}

  @Post()
  async create(@Body() body: any) {
    if (!body.user || !body.site) {
      throw new BadRequestException('Paramètres obligatoires manquants');
    }
    return this.portfolioService.createPortfolio(body);
  }

  @Get("getAll")
  async findAll(@Query() query: any) {
    if (!query.user || !query.site) {
      throw new BadRequestException('user et site sont obligatoires');
    }
    return this.portfolioService.getPortfolios(query);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.portfolioService.deletePortfolio(id);
    return { message: 'Portfolio supprimé' };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    
    // Validate file
    const validation = this.uploadService.validateImageFile(file);
    if (!validation.valid) throw new BadRequestException(validation.error);

    // Create standardized response
    const fileResponse = this.uploadService.createUploadResponse(file, 'portfolio');
    return { url: fileResponse.url };
  }
}
