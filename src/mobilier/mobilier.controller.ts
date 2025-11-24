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
  Query,
  Res,
  NotFoundException
} from '@nestjs/common';
import { MobilierService } from './mobilier.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Types } from 'mongoose';
import { UploadService } from '../upload/upload.service';

@Controller('mobilier')
export class MobilierController {
  constructor(
    private readonly mobilierService: MobilierService,
    private readonly uploadService: UploadService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'images', maxCount: 10 },
    { name: 'videos', maxCount: 5 },
    { name: 'documents', maxCount: 5 }
  ]))
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
      // Validate files if provided
      if (files.images && files.images.length > 0) {
        const imageValidation = this.uploadService.validateImageFiles(files.images);
        if (!imageValidation.valid) throw new BadRequestException(imageValidation.error);
      }

      // Note: Videos validation - using generic file validation (size only, no MIME check)
      if (files.videos && files.videos.length > 0) {
        const videoValidation = this.uploadService.validateGenericFile(files.videos[0], 50);
        if (!videoValidation.valid) throw new BadRequestException(videoValidation.error);
      }

      // Validate documents (PDFs)
      if (files.documents && files.documents.length > 0) {
        const docValidation = this.uploadService.validateDocumentFile(files.documents[0]);
        if (!docValidation.valid) throw new BadRequestException(docValidation.error);
      }

      const data = JSON.parse(dataString);
      const userId = req.user.userId;
      const userType = req.user.type || 'User';

      // Create standardized responses (await because service may upload to cloud)
      const imageResponses = files.images
        ? await this.uploadService.createBulkUploadResponse(files.images, 'mobilier/images')
        : [];
      const videoResponses = files.videos
        ? await this.uploadService.createBulkUploadResponse(files.videos, 'mobilier/videos')
        : [];
      const documentResponses = files.documents
        ? await this.uploadService.createBulkUploadResponse(files.documents, 'mobilier/documents')
        : [];

      const createPayload: any = {
        ...data,
        proprietaire: new Types.ObjectId(userId),
        proprietaireType: userType,
        images: imageResponses.map(r => r.url),
        videos: videoResponses.map(r => r.url),
        documents: documentResponses.map(r => r.url)
      };

      if (data && data.agentId) {
        try {
          createPayload.agent = new Types.ObjectId(data.agentId);
        } catch (e) {
          console.warn('Invalid agentId provided, ignoring agent field', data.agentId);
        }
      }

      return this.mobilierService.create(createPayload);
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

  // Lightweight endpoint returning all mobiliers as an array (no pagination)
  // Useful for simple frontends that request /api/mobilier/all
  @Get('all')
  async findAllRaw(@Query() query: any) {
    return this.mobilierService.findAllRaw(query);
  }

  @Get('owner/:ownerId')
  @UseGuards(JwtAuthGuard)
  async findByOwner(@Param('ownerId') ownerId: string, @Query() query: any) {

    console.log("is owner", ownerId);
    return this.mobilierService.findByProprietaire(ownerId, 'User', query);
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
  ]))
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
      // Validate new files if provided
      if (files.newImages && files.newImages.length > 0) {
        const imageValidation = this.uploadService.validateImageFiles(files.newImages);
        if (!imageValidation.valid) throw new BadRequestException(imageValidation.error);
      }

      if (files.newVideos && files.newVideos.length > 0) {
        const videoValidation = this.uploadService.validateGenericFile(files.newVideos[0], 50);
        if (!videoValidation.valid) throw new BadRequestException(videoValidation.error);
      }

      if (files.newDocuments && files.newDocuments.length > 0) {
        const docValidation = this.uploadService.validateDocumentFile(files.newDocuments[0]);
        if (!docValidation.valid) throw new BadRequestException(docValidation.error);
      }

      const data = JSON.parse(dataString);
      const userId = req.user.userId;
      const userType = req.user.type || 'User';

      // Vérifier que l'utilisateur est bien le propriétaire
      const mobilier = await this.mobilierService.findOne(id);
      if (!mobilier || mobilier.proprietaire._id.toString() !== userId) {
        console.warn(`Unauthorized update attempt on mobilier ${id} by user ${userId}. proprietaire=${mobilier?.proprietaire?._id?.toString()} proprietaireType=${mobilier?.proprietaireType} tokenType=${userType}`);
        throw new BadRequestException('Non autorisé à modifier ce bien');
      }

      // Create standardized responses for new files (await cloud uploads)
      const newImageResponses = files.newImages
        ? await this.uploadService.createBulkUploadResponse(files.newImages, 'mobilier/images')
        : [];
      const newVideoResponses = files.newVideos
        ? await this.uploadService.createBulkUploadResponse(files.newVideos, 'mobilier/videos')
        : [];
      const newDocumentResponses = files.newDocuments
        ? await this.uploadService.createBulkUploadResponse(files.newDocuments, 'mobilier/documents')
        : [];

      // Mettre à jour avec les anciennes et nouvelles images
      const updateData: any = {
        ...data,
        images: [...(data.keepImages || []), ...newImageResponses.map(r => r.url)],
        videos: [...(data.keepVideos || []), ...newVideoResponses.map(r => r.url)],
        documents: [...(data.keepDocuments || []), ...newDocumentResponses.map(r => r.url)]
      };

      // If client provided agentId in the data, convert it to ObjectId. Allow clearing the agent when an empty string or null is provided.
      if (Object.prototype.hasOwnProperty.call(data, 'agentId')) {
        const rawAgentId = data.agentId;
        if (rawAgentId === null || rawAgentId === '') {
          updateData.agent = null;
        } else {
          try {
            updateData.agent = new Types.ObjectId(rawAgentId);
          } catch (e) {
            console.warn('Invalid agentId provided in update, ignoring agent field', rawAgentId);
          }
        }
      }

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
    console.log("user ", userId, " type ", userType);
    console.log("id", id);
    try { console.log('DELETE.authorization header:', req.headers?.authorization); } catch(e){}
    try { console.log('DELETE.req.user:', JSON.stringify(req.user)); } catch(e) { console.log('DELETE.req.user (raw):', req.user); }
    // Vérifier que l'utilisateur est bien le propriétaire
    const mobilier = await this.mobilierService.findOne(id);
    console.log("mobilier trouver",mobilier)
    try { console.log('DELETE.mobilier.proprietaire (raw):', mobilier?.proprietaire, 'toString:', mobilier?.proprietaire?.toString?.()); } catch(e){}
    if (!mobilier || mobilier.proprietaire._id.toString() !== userId) {
      console.warn(`Unauthorized delete attempt on mobilier ${id} by user ${userId}. proprietaire=${mobilier?.proprietaire?._id?.toString()} proprietaireType=${mobilier?.proprietaireType} tokenType=${userType}`);
      throw new BadRequestException('Non autorisé à supprimer ce bien');
    }

    return this.mobilierService.remove(id);
  }
}
