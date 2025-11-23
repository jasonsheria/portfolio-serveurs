import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFiles, UseGuards, Req, BadRequestException, InternalServerErrorException, ConflictException, NotFoundException } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { OwnerService } from './owner.service';
import { CreateOwnerDto, OwnerMetaDto } from './dto/create-owner.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Owner } from '../entity/owner/owner.schema';
import { Types } from 'mongoose';
import { RequestWithUser } from '../common/types/request.interface';
import { UploadService } from '../upload/upload.service';

// Interface pour les fichiers uploadés
interface UploadedOwnerFiles {
  idFile: Express.Multer.File[];
  propertyTitle: Express.Multer.File[];
  profile?: Express.Multer.File[];
}

@Controller('owner')
export class OwnerController {
  constructor(
    private readonly ownerService: OwnerService,
    private readonly uploadService: UploadService
  ) {
    console.log('OwnerController initialized');
  }

  @Post('/create')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'idFile', maxCount: 1 },
    { name: 'propertyTitle', maxCount: 10 },
    { name: 'profile', maxCount: 3 }
  ]))
  async create(
    @UploadedFiles() files: UploadedOwnerFiles,
    @Body('meta') metaString: string,
    @Req() req: RequestWithUser
  ) {
    try {
      // Validate files presence
      if (!files || !files.idFile || files.idFile.length === 0) {
        throw new BadRequestException('Le fichier d\'identité (idFile) est requis');
      }

      // Validate idFile
      const idValidation = this.uploadService.validateDocumentFile(files.idFile[0]);
      if (!idValidation.valid) throw new BadRequestException(idValidation.error);

      // Validate propertyTitle files if present
      if (files.propertyTitle && files.propertyTitle.length > 0) {
        const titleValidation = this.uploadService.validateImageFiles(files.propertyTitle);
        if (!titleValidation.valid) throw new BadRequestException(titleValidation.error);
      }

      // Validate profile images if present
      if (files.profile && files.profile.length > 0) {
        const profileValidation = this.uploadService.validateImageFiles(files.profile);
        if (!profileValidation.valid) throw new BadRequestException(profileValidation.error);
      }

      // Parser les métadonnées
      let meta: OwnerMetaDto;
      try {
        meta = JSON.parse(metaString);
      } catch (e) {
        throw new BadRequestException('Meta JSON invalide ou manquant');
      }

      // Convertir l'ID utilisateur en ObjectId depuis le token JWT
      const userId = new Types.ObjectId(req.user.id);

      // Créer les réponses standardisées
      const idFileResponse = this.uploadService.createUploadResponse(files.idFile[0], 'owners/documents');
      const propertyTitleResponses = files.propertyTitle 
        ? this.uploadService.createBulkUploadResponse(files.propertyTitle, 'owners/documents')
        : [];
      const profileResponses = files.profile
        ? this.uploadService.createBulkUploadResponse(files.profile, 'owners/profiles')
        : [];

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
        user: userId,
        idFilePath: idFileResponse.url,
        propertyTitlePaths: propertyTitleResponses.map(r => r.url),
        subscriptionEndDate: meta.subscriptionEndDate,
        subscriptionType: meta.subscriptionType || 'freemium'
      } as any;

      // Créer le propriétaire
      const owner = await this.ownerService.create(createOwnerDto);

      return {
        message: 'Propriétaire créé avec succès',
        owner
      };
    } catch (error) {
      // Gestion spécifique des erreurs
      if (error instanceof BadRequestException) {
        throw error;
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

  // Create agency account (separate simplified flow)
  @Post('/agency/create')
  @UseGuards(JwtAuthGuard)
  async createAgencyAccount(@Body() body: any, @Req() req: RequestWithUser) {
   
    try {
      const userId = new Types.ObjectId(req.user.id);
      const agency = await this.ownerService.createAgency(userId, body);
      return {
        message: 'Agency created successfully',
        agency,
        success: true
      };
    } catch (error) {

      if (error instanceof BadRequestException) throw error;
      console.error('createAgencyAccount error', error);
      throw new InternalServerErrorException('Unable to create agency account');

    }
  }

  @Get('check-account')
  @UseGuards(JwtAuthGuard)
  async checkUserAccount(@Req() req: RequestWithUser) {
    // Diagnostic logging to help understand why lookups might fail
    try {
      const rawId = req.user?.id || req.user?.userId || req.user?._id;
      const userId = new Types.ObjectId(String(rawId));
      const result = await this.ownerService.findByUserId(userId);
      return result;
    } catch (err) {
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
      const docs = await this.ownerService.findAllByUserId(userId);
      return { count: (docs && docs.length) || 0, docs };
    } catch (err) {
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
  @UseGuards(JwtAuthGuard)
  findAll(@Param('site') site: string) {
    return this.ownerService.findAll(site);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
    

      // Essayer d'abord de trouver par ID de propriétaire
      try {
        const result = await this.ownerService.findOne(id);
        return result;
      } catch (error) {
        if (error instanceof NotFoundException) {
          // Si non trouvé par ID, essayer par ID utilisateur
          const userId = new Types.ObjectId(id);
          const ownerByUser = await this.ownerService.findByUserId(userId);
          if (ownerByUser.hasAccount) {
            return ownerByUser.owner;
          }
        }
        throw error;
      }
    } catch (error) {
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
