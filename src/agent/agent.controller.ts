import { Controller, Get, Post, Body, Param, Put, Delete, UploadedFile, BadRequestException, UseInterceptors, Query, UseGuards, Req, InternalServerErrorException, UsePipes, ValidationPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { AgentService } from './agent.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('agents')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = path.join(process.cwd(), 'uploads', 'agents');
          try {
            if (!fs.existsSync(uploadPath)) {
              fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
          } catch (err) {
            cb(err, uploadPath);
          }
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          const filename = `agents_${Date.now()}${ext}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
        else cb(null, false);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    }))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
      if (!file) throw new BadRequestException('Aucun fichier reçu');
      return { url: `/uploads/agents/${file.filename}` };
    }
  
  

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(@Body() body: CreateAgentDto, @Req() req?: any) {
    // Enforce server-side association: set `user` from authenticated token.
    const user = req && (req.user && (req.user._id || req.user.id || req.user.userId || req.user.sub));
    if (!body.site_id && !user) {
      throw new BadRequestException('site_id est requis si l\'utilisateur non authentifié.');
    }
    // Build payload from validated DTO and attach server-side user id
    const payload: any = { ...body };
    if (user) payload.user = user.toString();
    try {
      return await this.agentService.create(payload);
    } catch (err) {
      console.error('[agents][create] error:', err && err.stack ? err.stack : err);
      // Mongo duplicate key
      if (err && (err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000))) {
        // Attempt to extract duplicate field
        const dupField = err.keyValue ? Object.keys(err.keyValue)[0] : 'field';
        throw new BadRequestException(`Valeur dupliquée pour ${dupField}.`);
      }
      throw new InternalServerErrorException('Erreur serveur lors de la création de l\'agent.');
    }
  }

  @Get()
  findAll(@Query('site') siteIdRaw: string) {
    if (!siteIdRaw || typeof siteIdRaw !== 'string' || !/^[a-fA-F0-9]{24}$/.test(siteIdRaw)) {
      throw new BadRequestException('site_id is invalid or missing (format).');
    }
    return this.agentService.findAll(siteIdRaw);
  }

  // List agents created by the authenticated user
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async findMine(@Req() req?: any) {
    try {
      const user = req && (req.user && (req.user._id || req.user.id || req.user.userId || req.user.sub));
      if (!user) throw new BadRequestException('Utilisateur non authentifié.');
      return await this.agentService.findAllByUser(user.toString());
    } catch (err) {
      console.error('[agents][me] error:', err && err.stack ? err.stack : err);
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Erreur serveur lors de la récupération des agents de l\'utilisateur.');
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agentService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
    // Prevent changing ownership
    if (body.user) delete body.user;
    // Only allow owner to update
    const user = req && (req.user && (req.user._id || req.user.id || req.user.userId || req.user.sub));
    if (!user) throw new BadRequestException('Utilisateur non authentifié.');
    const existing = await this.agentService.findOne(id);
    if (!existing) throw new BadRequestException('Agent introuvable.');
    // existing.user may be ObjectId; compare as strings
    if (existing.user && existing.user.toString() !== user.toString()) {
      throw new BadRequestException('Vous n\'êtes pas autorisé à modifier cet agent.');
    }
    return this.agentService.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req?: any) {
    const user = req && (req.user && (req.user._id || req.user.id || req.user.userId || req.user.sub));
    if (!user) throw new BadRequestException('Utilisateur non authentifié.');
    const existing = await this.agentService.findOne(id);
    if (!existing) throw new BadRequestException('Agent introuvable.');
    if (existing.user && existing.user.toString() !== user.toString()) {
      throw new BadRequestException('Vous n\'êtes pas autorisé à supprimer cet agent.');
    }
    return this.agentService.remove(id);
  }
}
