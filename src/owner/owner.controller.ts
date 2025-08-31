import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFiles, UseGuards, Req, BadRequestException, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { OwnerService } from './owner.service';
import { CreateOwnerDto, OwnerMetaDto } from './dto/create-owner.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Owner } from '../entity/owner/owner.schema';
import * as path from 'path';
import * as fs from 'fs';
import { Types } from 'mongoose';
// Étendre l'interface Request pour inclure l'utilisateur
interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
  };
}

// Interface pour les fichiers uploadés
interface UploadedOwnerFiles {
  idFile: Express.Multer.File[];
  propertyTitle: Express.Multer.File[];
}

@Controller('api/owner')
export class OwnerController {
  constructor(private readonly ownerService: OwnerService) {}

  private formatFilePath(fullPath: string): string {
    // Obtenir le chemin relatif à partir de la racine du projet
    const relativePath = fullPath.split('uploads')[1];
    return `/uploads${relativePath}`.replace(/\\/g, '/');
  }



  @Post('/create')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'idFile', maxCount: 1 },
    { name: 'propertyTitle', maxCount: 10 }
  ], {
    storage: diskStorage({
      destination: (req: any, file, cb) => {
        // Créer les dossiers de base s'ils n'existent pas
        const baseUploadPath = join(process.cwd(), 'uploads', 'owners');
        if (!existsSync(baseUploadPath)) {
          mkdirSync(baseUploadPath, { recursive: true });
        }
        
        // Créer un dossier pour cet utilisateur
        const userUploadPath = join(baseUploadPath, new Date().toISOString().split('T')[0]);
        if (!existsSync(userUploadPath)) {
          mkdirSync(userUploadPath, { recursive: true });
        }
        
        cb(null, userUploadPath);
      },
      filename: (req, file, cb) => {
        // Créer un nom de fichier unique avec timestamp
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (file.size > 5 * 1024 * 1024) {
        return cb(new Error('File is too large'), false);
      }
      if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
        return cb(new Error('Only jpg, jpeg, png and pdf files are allowed'), false);
      }
      cb(null, true);
    },
  }))
  async create(
    @UploadedFiles() files: UploadedOwnerFiles,
    @Body('meta') metaString: string,
    @Req() req: RequestWithUser
  ) {
    try {
      // Parser les métadonnées
      const meta: OwnerMetaDto = JSON.parse(metaString);
      
      // Convertir l'ID utilisateur en ObjectId depuis le token JWT
      const userId = new Types.ObjectId(req.user.userId);
      
      // Formater les chemins de fichiers pour être relatifs à la racine du projet
      const idFilePath = this.formatFilePath(files.idFile[0].path);
      const propertyTitlePaths = files.propertyTitle.map(file => 
        this.formatFilePath(file.path)
      );
      
      // Créer l'objet owner avec la référence user
      const createOwnerDto: CreateOwnerDto = {
        ...meta.form,
        types: meta.types,
        user: userId,  // Référence à l'utilisateur
        idFilePath,
        propertyTitlePaths
      };

      // Créer le propriétaire
      const owner = await this.ownerService.create(createOwnerDto);

      return {
        message: 'Propriétaire créé avec succès',
        owner
      };
    } catch (error) {
      // Supprimer les fichiers en cas d'erreur
      if (files.idFile) {
        unlinkSync(files.idFile[0].path);
      }
      if (files.propertyTitle) {
        files.propertyTitle.forEach(file => unlinkSync(file.path));
      }

      // Gestion spécifique des erreurs
      if (error instanceof BadRequestException) {
        throw error; // Renvoi de l'erreur de validation telle quelle
      } else if (error.code === 11000) {
        throw new ConflictException('Un owner avec cet email existe déjà');
      } else {
        throw new InternalServerErrorException(
          'Une erreur est survenue lors de la création de l\'owner'
        );
      }
    }
  }

  @Get('check-account')
  @UseGuards(JwtAuthGuard)
  async checkUserAccount(@Req() req: RequestWithUser) {
    const userId = new Types.ObjectId(req.user.userId);
    return this.ownerService.findByUserId(userId);
  }

  @Get()
  findAll() {
    return this.ownerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ownerService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOwnerDto: UpdateOwnerDto) {
    return this.ownerService.update(id, updateOwnerDto);
  }

  @Post(':id/activate-freemium')
  @UseGuards(JwtAuthGuard)
  async activateFreemium(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ) {
    const ownerId = new Types.ObjectId(id);
    const userId = new Types.ObjectId(req.user.userId);

    return this.ownerService.activateFreemium(ownerId, userId);
  }

  @Post(':id/activate-commission')
  @UseGuards(JwtAuthGuard)
  async activateCommission(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ) {
    const ownerId = new Types.ObjectId(id);
    const userId = new Types.ObjectId(req.user.userId);

    return this.ownerService.activateCommission(ownerId, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ownerService.remove(id);
  }
}
