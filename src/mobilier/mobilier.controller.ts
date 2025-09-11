import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Delete, 
  Put, 
  UseGuards, 
  Req,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Query
} from '@nestjs/common';
import { MobilierService } from './mobilier.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Types } from 'mongoose';

@Controller('mobilier')
export class MobilierController {
  constructor(private readonly mobilierService: MobilierService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'images', maxCount: 10 },
    { name: 'videos', maxCount: 5 },
    { name: 'documents', maxCount: 5 }
  ], {
    storage: diskStorage({
      destination: (req: any, file, cb) => {
        let uploadType = 'images';
        if (file.fieldname === 'videos') uploadType = 'videos';
        if (file.fieldname === 'documents') uploadType = 'documents';

        const dateFolder = new Date().toISOString().split('T')[0];
        const uploadPath = join(process.cwd(), 'uploads', 'mobilier', uploadType, dateFolder);
        
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (file.fieldname === 'images') {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(new Error('Seules les images jpg, jpeg et png sont autorisées'), false);
        }
      } else if (file.fieldname === 'videos') {
        if (!file.mimetype.match(/\/(mp4|mpeg|quicktime)$/)) {
          return cb(new Error('Seules les vidéos mp4, mpeg et mov sont autorisées'), false);
        }
      } else if (file.fieldname === 'documents') {
        if (!file.mimetype.match(/\/(pdf)$/)) {
          return cb(new Error('Seuls les documents PDF sont autorisés'), false);
        }
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB max
        return cb(new Error('La taille du fichier ne doit pas dépasser 10MB'), false);
      }
      
      cb(null, true);
    }
  }))
  async create(
    @Req() req,
    @Body('data') dataString: string,
    @UploadedFiles() files: {
      images?: Express.Multer.File[],
      videos?: Express.Multer.File[],
      documents?: Express.Multer.File[]
    }
  ) {
    try {
      const data = JSON.parse(dataString);
      const userId = req.user.userId;
      const userType = req.user.type || 'User';

      // Formater les chemins des fichiers
      const formattedFiles = {
        images: files.images?.map(file => this.formatFilePath(file.path)) || [],
        videos: files.videos?.map(file => this.formatFilePath(file.path)) || [],
        documents: files.documents?.map(file => this.formatFilePath(file.path)) || []
      };

      return this.mobilierService.create({
        ...data,
        proprietaire: new Types.ObjectId(userId),
        proprietaireType: userType,
        images: formattedFiles.images,
        videos: formattedFiles.videos,
        documents: formattedFiles.documents
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestException('Format de données invalide');
      }
      throw error;
    }
  }

  @Get()
  async findAll(@Query() query: any) {
    return this.mobilierService.findAll(query);
  }

  @Get('owner/:ownerId')
  @UseGuards(JwtAuthGuard)
  async findByOwner(@Param('ownerId') ownerId: string, @Query() query: any) {

    console.log(" id owner ", ownerId);
    console.log(" query ", query);
    const properties = await this.mobilierService.findByProprietaire(ownerId, 'User', query);
    return {
      success: true,
      data: properties
    };
  }

  @Get('agent/:agentId')
  @UseGuards(JwtAuthGuard)
  async findByAgent(@Param('agentId') agentId: string, @Query() query: any) {
    return this.mobilierService.findByProprietaire(agentId, 'Agent', query);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async findByUser(@Param('userId') userId: string, @Query() query: any) {
    return this.mobilierService.findByProprietaire(userId, 'User', query);
  }

  @Get('stats/:id')
  @UseGuards(JwtAuthGuard)
  async getStats(@Param('id') id: string, @Req() req) {
    const userType = req.user.type || 'User';
    return this.mobilierService.getStatsByProprietaire(id, userType);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.mobilierService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'newImages', maxCount: 10 },
    { name: 'newVideos', maxCount: 5 },
    { name: 'newDocuments', maxCount: 5 }
  ], {
    storage: diskStorage({
      destination: (req: any, file, cb) => {
        let uploadType = 'images';
        if (file.fieldname === 'newVideos') uploadType = 'videos';
        if (file.fieldname === 'newDocuments') uploadType = 'documents';

        const dateFolder = new Date().toISOString().split('T')[0];
        const uploadPath = join(process.cwd(), 'uploads', 'mobilier', uploadType, dateFolder);
        
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
      }
    })
  }))
  async update(
    @Param('id') id: string,
    @Req() req,
    @Body('data') dataString: string,
    @UploadedFiles() files: {
      newImages?: Express.Multer.File[],
      newVideos?: Express.Multer.File[],
      newDocuments?: Express.Multer.File[]
    }
  ) {
    try {
      const data = JSON.parse(dataString);
      const userId = req.user.userId;
      const userType = req.user.type || 'User';

      // Vérifier que l'utilisateur est bien le propriétaire
      const mobilier = await this.mobilierService.findOne(id);
      if (!mobilier || mobilier.proprietaire.toString() !== userId || mobilier.proprietaireType !== userType) {
        throw new BadRequestException('Non autorisé à modifier ce bien');
      }

      // Formater les nouveaux fichiers
      const newFiles = {
        images: files.newImages?.map(file => this.formatFilePath(file.path)) || [],
        videos: files.newVideos?.map(file => this.formatFilePath(file.path)) || [],
        documents: files.newDocuments?.map(file => this.formatFilePath(file.path)) || []
      };

      // Mettre à jour avec les anciennes et nouvelles images
      const updateData = {
        ...data,
        images: [...(data.keepImages || []), ...newFiles.images],
        videos: [...(data.keepVideos || []), ...newFiles.videos],
        documents: [...(data.keepDocuments || []), ...newFiles.documents]
      };

      return this.mobilierService.update(id, updateData);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestException('Format de données invalide');
      }
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    const userType = req.user.type || 'User';

    // Vérifier que l'utilisateur est bien le propriétaire
    const mobilier = await this.mobilierService.findOne(id);
    if (!mobilier || mobilier.proprietaire.toString() !== userId || mobilier.proprietaireType !== userType) {
      throw new BadRequestException('Non autorisé à supprimer ce bien');
    }

    return this.mobilierService.remove(id);
  }

  private formatFilePath(fullPath: string): string {
    const relativePath = fullPath.split('uploads')[1];
    return `/uploads${relativePath}`.replace(/\\/g, '/');
  }
}
