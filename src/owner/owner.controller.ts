import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFiles, UseGuards, Req, BadRequestException, InternalServerErrorException, ConflictException, NotFoundException } from '@nestjs/common';
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
import { Request } from 'express';
import { RequestWithUser } from '../common/types/request.interface';

// Interface pour les fichiers uploadés
interface UploadedOwnerFiles {
  idFile: Express.Multer.File[];
  propertyTitle: Express.Multer.File[];
}

@Controller('owner')
export class OwnerController {
  constructor(private readonly ownerService: OwnerService) {
    console.log('OwnerController initialized');
  }

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
      let meta: OwnerMetaDto;
      try {
        meta = JSON.parse(metaString);
      } catch (e) {
        throw new BadRequestException('Meta JSON invalide ou manquant');
      }

      // Convertir l'ID utilisateur en ObjectId depuis le token JWT
      const userId = new Types.ObjectId(req.user.id);

      // Validate files presence
      if (!files || !files.idFile || files.idFile.length === 0) {
        throw new BadRequestException('Le fichier d\'identité (idFile) est requis');
      }

      // Formater les chemins de fichiers pour être relatifs à la racine du projet
      const idFilePath = this.formatFilePath(files.idFile[0].path);
      const propertyTitlePaths = (files.propertyTitle || []).map(file =>
        this.formatFilePath(file.path)
      );

      // Créer l'objet owner avec la référence user
      // Validate required meta fields and provide sensible defaults
      if (!meta || !meta.form) {
        throw new BadRequestException('Données meta manquantes');
      }
      const form = meta.form;
      if (!form.address) {
        throw new BadRequestException('Adresse manquante dans les données du propriétaire');
      }
      if (!meta.types || !Array.isArray(meta.types) || meta.types.length === 0) {
        throw new BadRequestException('Types de propriété manquants');
      }

      const createOwnerDto: CreateOwnerDto = {
        ...form,
        types: meta.types,
        user: userId,  // Référence à l'utilisateur
        idFilePath,
        propertyTitlePaths,
        subscriptionEndDate: meta.subscriptionEndDate,
        // subscriptionType is required by the schema; use provided value or default to 'freemium'
        subscriptionType: meta.subscriptionType || 'freemium'
      } as any;

      // Créer le propriétaire
      const owner = await this.ownerService.create(createOwnerDto);

      return {
        message: 'Propriétaire créé avec succès',
        owner
      };
    } catch (error) {
      // Supprimer les fichiers en cas d'erreur (si présents)
      try {
        if (files?.idFile && files.idFile[0] && files.idFile[0].path && existsSync(files.idFile[0].path)) {
          unlinkSync(files.idFile[0].path);
        }
        if (files?.propertyTitle && files.propertyTitle.length) {
          files.propertyTitle.forEach(file => {
            if (file && file.path && existsSync(file.path)) unlinkSync(file.path);
          });
        }
      } catch (e) {
        // ignore cleanup errors but log
        console.warn('Error cleaning up uploaded files', e);
      }

      // Gestion spécifique des erreurs
      if (error instanceof BadRequestException) {
        throw error; // Renvoi de l'erreur de validation telle quelle
      } else if (error && (error as any).code === 11000) {
        throw new ConflictException('Un owner avec cet email existe déjà');
      } else {
        console.error('owner.create error', error);
        throw new InternalServerErrorException(
          'Une erreur est survenue lors de la création de l\'owner'
        );
      }
    }
  }

  @Get('check-account')
  @UseGuards(JwtAuthGuard)
  async checkUserAccount(@Req() req: RequestWithUser) {
    // Diagnostic logging to help understand why lookups might fail
    try {
      console.log('checkUserAccount: req.user =', req.user);
      const rawId = req.user?.id || req.user?.userId || req.user?._id;
      console.log('checkUserAccount: resolved rawId =', rawId);
      const userId = new Types.ObjectId(String(rawId));
      console.log('checkUserAccount: using ObjectId =', userId.toString());
      const result = await this.ownerService.findByUserId(userId);
      console.log('checkUserAccount: ownerService result =', result && (result.hasAccount ? 'HAS_ACCOUNT' : 'NO_ACCOUNT'));
      return result;
    } catch (err) {
      console.error('checkUserAccount: error resolving userId', err);
      throw err;
    }
  }

  // Debug endpoint: returns raw owner documents that reference the authenticated user
  @Get('debug-account')
  @UseGuards(JwtAuthGuard)
  async debugAccount(@Req() req: RequestWithUser) {
    try {
      const rawId = req.user?.id || req.user?.userId || req.user?._id;
      const userId = new Types.ObjectId(String(rawId));
      console.log('debugAccount: resolved userId=', String(userId));
      const docs = await this.ownerService.findAllByUserId(userId);
      console.log('debugAccount: found docs count=', (docs && docs.length) || 0);
      return { count: (docs && docs.length) || 0, docs };
    } catch (err) {
      console.error('debugAccount: error', err);
      throw err;
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: RequestWithUser) {
    const userId = new Types.ObjectId(req.user.id);
    return this.ownerService.getProfile(userId);
  }

  @Get()
  findAll() {
    return this.ownerService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      console.log("Route /api/owner/:id appelée");
      console.log("ID reçu:", id);

      // Essayer d'abord de trouver par ID de propriétaire
      try {
        const result = await this.ownerService.findOne(id);
        console.log("Propriétaire trouvé par ID:", result);
        return result;
      } catch (error) {
        if (error instanceof NotFoundException) {
          // Si non trouvé par ID, essayer par ID utilisateur
          console.log("Tentative de recherche par ID utilisateur");
          const userId = new Types.ObjectId(id);
          const ownerByUser = await this.ownerService.findByUserId(userId);
          if (ownerByUser.hasAccount) {
            console.log("Propriétaire trouvé par ID utilisateur:", ownerByUser.owner);
            return ownerByUser.owner;
          }
        }
        throw error;
      }
    } catch (error) {
      console.error("Erreur dans findOne:", error);
      if (error instanceof NotFoundException) {
        throw new NotFoundException("Propriétaire non trouvé");
      }
      throw new BadRequestException("Erreur lors de la recherche du propriétaire: " + error.message);
    }
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
    const userId = new Types.ObjectId(req.user.id);

    return this.ownerService.activateFreemium(ownerId, userId);
  }

  @Post(':id/activate-commission')
  @UseGuards(JwtAuthGuard)
  async activateCommission(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ) {
    const ownerId = new Types.ObjectId(id);
    const userId = new Types.ObjectId(req.user.id);

    return this.ownerService.activateCommission(ownerId, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ownerService.remove(id);
  }
}
