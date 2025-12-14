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
import { multerFieldsOptions } from '../upload/multer.config';
import { Types } from 'mongoose';
import { UploadService } from '../upload/upload.service';
import { Logger } from '@nestjs/common';

@Controller('mobilier')
export class MobilierController {
  private readonly logger = new Logger(MobilierController.name);
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
  ], multerFieldsOptions([
    { name: 'images', folder: 'mobilier/images' },
    { name: 'videos', folder: 'mobilier/videos' },
    { name: 'documents', folder: 'mobilier/documents' }
  ])))
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
      // Guard against missing UploadedFiles (Multer may pass undefined)
      const uploadedFiles = files || {};

      // Validate files if provided
      if (uploadedFiles.images && uploadedFiles.images.length > 0) {
        const imageValidation = this.uploadService.validateImageFiles(uploadedFiles.images);
        if (!imageValidation.valid) throw new BadRequestException(imageValidation.error);
      }

      // Note: Videos validation - using generic file validation (size only, no MIME check)
      if (uploadedFiles.videos && uploadedFiles.videos.length > 0) {
        const videoValidation = this.uploadService.validateGenericFile(uploadedFiles.videos[0], 50);
        if (!videoValidation.valid) throw new BadRequestException(videoValidation.error);
      }

      // Validate documents (PDFs)
      if (uploadedFiles.documents && uploadedFiles.documents.length > 0) {
        const docValidation = this.uploadService.validateDocumentFile(uploadedFiles.documents[0]);
        if (!docValidation.valid) throw new BadRequestException(docValidation.error);
      }

      let data: any;
      if (typeof dataString === 'string') {
        try {
          data = JSON.parse(dataString);
        } catch (e) {
          // Be tolerant of common encodings from form builders (e.g. escaped quotes).
          try {
            const unescaped = (dataString || '').replace(/\\+/g, '');
            data = JSON.parse(unescaped);
          } catch (e2) {
            throw e; // let outer catch handle invalid format
          }
        }
      } else {
        data = dataString;
      }
      const userId = req.user.userId;
      const userType = req.user.type || 'User';

      // Create standardized responses (await because service may upload to cloud)
      const imageResponses = uploadedFiles.images
        ? await this.uploadService.createBulkUploadResponse(uploadedFiles.images, 'mobilier/images')
        : [];
      const videoResponses = uploadedFiles.videos
        ? await this.uploadService.createBulkUploadResponse(uploadedFiles.videos, 'mobilier/videos')
        : [];
      const documentResponses = uploadedFiles.documents
        ? await this.uploadService.createBulkUploadResponse(uploadedFiles.documents, 'mobilier/documents')
        : [];

      const createPayload: any = {
        ...data,
        proprietaire: new Types.ObjectId(userId),
        proprietaireType: userType,
        images: imageResponses.map(r => r.url),
        videos: videoResponses.map(r => r.url),
        documents: documentResponses.map(r => r.url)
      };

      // Validate promotion fields if provided on create
      if (Object.prototype.hasOwnProperty.call(createPayload, 'promotion') && createPayload.promotion) {
        const price = createPayload.promoPrice != null ? Number(createPayload.promoPrice) : null;
        if (price === null || Number.isNaN(price) || price <= 0) {
          throw new BadRequestException('Le prix promotionnel doit être un nombre supérieur à 0');
        }
        if (createPayload.promoStart && createPayload.promoEnd) {
          const s = new Date(createPayload.promoStart);
          const e = new Date(createPayload.promoEnd);
          if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
            throw new BadRequestException('Dates de promotion invalides');
          }
          if (s.getTime() > e.getTime()) {
            throw new BadRequestException('La date de début doit être antérieure ou égale à la date de fin');
          }
        }
      }

      // Ensure promotion fields have sane defaults
      if (createPayload.promotion === undefined) createPayload.promotion = false;
      if (createPayload.promoPrice === undefined) createPayload.promoPrice = null;
      if (createPayload.promoStart === undefined) createPayload.promoStart = null;
      if (createPayload.promoEnd === undefined) createPayload.promoEnd = null;
      if (createPayload.promoComment === undefined) createPayload.promoComment = null;

      // Log payload summary (avoid logging everything for privacy)
      try {
        this.logger.log(`Creating Mobilier: titre='${data?.titre || ''}' proprietaire=${userId} images_count=${(createPayload.images || []).length} videos_count=${(createPayload.videos || []).length} documents_count=${(createPayload.documents || []).length}`);
        this.logger.debug(`createPayload images sample: ${JSON.stringify(createPayload.images.slice(0,5))}`);
      } catch (e) {}

      if (data && data.agentId) {
        try {
          createPayload.agent = new Types.ObjectId(data.agentId);
        } catch (e) {
          console.warn('Invalid agentId provided, ignoring agent field', data.agentId);
        }
      }

      const created = await this.mobilierService.create(createPayload);

      // Log result of DB save and verify urls were stored
      try {
        this.logger.log(`Mobilier created id=${created?._id || created.id || 'unknown'}`);
        this.logger.debug(`Stored images: ${JSON.stringify(created?.images || created?.images || [])}`);
      } catch (e) {}

      return created;
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

  // Lightweight promotions endpoint used by frontend to list promoted items
  @Get('promotions')
  async promotions(@Query() query: any) {
    try {
      const limit = Number(query.limit) || 10;
      const offset = Number(query.offset) || 0;
      const page = Math.floor(offset / limit) + 1;
      // request paginated results filtered by promotion=true
      const res = await this.mobilierService.findAll({ ...query, page, limit, promotion: true });
      // return array to match frontend expectations
      const items = res && res.data ? res.data : [];
      // log sample for debugging
      try { this.logger.log(`Promotions requested offset=${offset} limit=${limit} returned=${items.length}`); } catch (e) {}
      return items;
    } catch (err) {
      // log error and rethrow to let Nest handle response
      try { this.logger.error('Error fetching promotions', err && (err.stack || err.message || err)); } catch (e) {}
      throw err;
    }
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
  ], multerFieldsOptions([
    { name: 'newImages', folder: 'mobilier/images', maxCount: 10 },
    { name: 'newVideos', folder: 'mobilier/videos', maxCount: 5 },
    { name: 'newDocuments', folder: 'mobilier/documents', maxCount: 5 }
  ])))
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
      // Guard uploaded files (Multer may pass undefined when no files are attached)
      const uploaded = files || {};

      // Validate new files if provided
      if (uploaded.newImages && uploaded.newImages.length > 0) {
        const imageValidation = this.uploadService.validateImageFiles(uploaded.newImages);
        if (!imageValidation.valid) throw new BadRequestException(imageValidation.error);
      }

      if (uploaded.newVideos && uploaded.newVideos.length > 0) {
        const videoValidation = this.uploadService.validateGenericFile(uploaded.newVideos[0], 50);
        if (!videoValidation.valid) throw new BadRequestException(videoValidation.error);
      }

      if (uploaded.newDocuments && uploaded.newDocuments.length > 0) {
        const docValidation = this.uploadService.validateDocumentFile(uploaded.newDocuments[0]);
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
      const newImageResponses = uploaded.newImages
        ? await this.uploadService.createBulkUploadResponse(uploaded.newImages, 'mobilier/images')
        : [];
      const newVideoResponses = uploaded.newVideos
        ? await this.uploadService.createBulkUploadResponse(uploaded.newVideos, 'mobilier/videos')
        : [];
      const newDocumentResponses = uploaded.newDocuments
        ? await this.uploadService.createBulkUploadResponse(uploaded.newDocuments, 'mobilier/documents')
        : [];

      // Build updateData but only include media fields when we actually
      // have values to keep or new uploads. This avoids clearing arrays
      // when the client did not intend to modify them.
      const updateData: any = { ...data };
      const keptImages = (data.keepImages || []).slice();
      const newImages = (newImageResponses || []).map(r => r.url || r);
      if (keptImages.length || newImages.length) updateData.images = [...keptImages, ...newImages];

      const keptVideos = (data.keepVideos || []).slice();
      const newVideos = (newVideoResponses || []).map(r => r.url || r);
      if (keptVideos.length || newVideos.length) updateData.videos = [...keptVideos, ...newVideos];

      const keptDocs = (data.keepDocuments || []).slice();
      const newDocs = (newDocumentResponses || []).map(r => r.url || r);
      if (keptDocs.length || newDocs.length) updateData.documents = [...keptDocs, ...newDocs];

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

      // Validate promotion fields if provided on update
      if (Object.prototype.hasOwnProperty.call(updateData, 'promotion')) {
        if (updateData.promotion) {
          const price = updateData.promoPrice != null ? Number(updateData.promoPrice) : null;
          if (price === null || Number.isNaN(price) || price <= 0) {
            throw new BadRequestException('Le prix promotionnel doit être un nombre supérieur à 0');
          }
          if (updateData.promoStart && updateData.promoEnd) {
            const s = new Date(updateData.promoStart);
            const e = new Date(updateData.promoEnd);
            if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
              throw new BadRequestException('Dates de promotion invalides');
            }
            if (s.getTime() > e.getTime()) {
              throw new BadRequestException('La date de début doit être antérieure ou égale à la date de fin');
            }
          }
        }
        // if promotion is false or clearing fields, that's allowed
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
