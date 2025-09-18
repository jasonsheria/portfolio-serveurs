import { Controller, Get, Post, Delete, Body, Param, Query, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

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
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads', 'portfolio');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `portfolio-${uniqueSuffix}${path.extname(file.originalname)}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Seuls les fichiers jpg, jpeg, png et gif sont autorisés'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    return { url: `/uploads/portfolio/${file.filename}` };
  }
}
