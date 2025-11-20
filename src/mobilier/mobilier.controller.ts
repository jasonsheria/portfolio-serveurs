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
        // Use process.cwd() + /uploads for persistent disk on Render
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
      // Relaxed checks: images must start with image/, videos with video/, documents pdf
      try {
        if (file.fieldname === 'images') {
          if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            return cb(new Error('Seules les images (jpg, jpeg, png...) sont autorisées'), false);
          }
        } else if (file.fieldname === 'videos') {
          if (!file.mimetype || !file.mimetype.startsWith('video/')) {
            return cb(new Error('Seules les vidéos (mp4, webm, mov, ...) sont autorisées'), false);
          }
        } else if (file.fieldname === 'documents') {
          if (!file.mimetype || !file.mimetype.match(/\/(pdf)$/)) {
            return cb(new Error('Seuls les documents PDF sont autorisés'), false);
          }
        }

        // Optional size check if multer provides size
        if (typeof file.size === 'number' && file.size > 20 * 1024 * 1024) { // 20MB max server-side
          return cb(new Error('La taille du fichier ne doit pas dépasser 20MB'), false);
        }

        cb(null, true);
      } catch (e) {
        // fallback to accepting the file so the request can be inspected
        console.warn('fileFilter error', e);
        cb(null, true);
      }
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
      // Debug: log incoming files structure to help diagnose missing uploads
      try { console.log('CREATE.received files keys:', Object.keys(files || {})); } catch(e){}
      try { console.log('CREATE.files.images count:', (files.images||[]).length, 'videos count:', (files.videos||[]).length, 'documents count:', (files.documents||[]).length); } catch(e){}
      const data = JSON.parse(dataString);
      const userId = req.user.userId;
      const userType = req.user.type || 'User';

      // Formater les chemins des fichiers
      const formattedFiles = {
        images: files.images?.map(file => this.formatFilePath(file.path)) || [],
        videos: files.videos?.map(file => this.formatFilePath(file.path)) || [],
        documents: files.documents?.map(file => this.formatFilePath(file.path)) || []
      };

      try { console.log('CREATE.formattedFiles:', formattedFiles); } catch(e){}

      // If the client provided an agentId, convert it to ObjectId and store under `agent`
      const createPayload: any = {
        ...data,
        proprietaire: new Types.ObjectId(userId),
        proprietaireType: userType,
        images: formattedFiles.images,
        videos: formattedFiles.videos,
        documents: formattedFiles.documents
      };

      if (data && data.agentId) {
        try {
          createPayload.agent = new Types.ObjectId(data.agentId);
        } catch (e) {
          // If conversion fails, ignore the agent field rather than crashing
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
    }),
    fileFilter: (req, file, cb) => {
      // mirror the create() fileFilter but for new* fieldnames
      try {
        if (file.fieldname === 'newImages') {
          if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            return cb(new Error('Seules les images (jpg, jpeg, png...) sont autorisées'), false);
          }
        } else if (file.fieldname === 'newVideos') {
          if (!file.mimetype || !file.mimetype.startsWith('video/')) {
            return cb(new Error('Seules les vidéos (mp4, webm, mov, ...) sont autorisées'), false);
          }
        } else if (file.fieldname === 'newDocuments') {
          if (!file.mimetype || !file.mimetype.match(/\/(pdf)$/)) {
            return cb(new Error('Seuls les documents PDF sont autorisés'), false);
          }
        }

        if (typeof file.size === 'number' && file.size > 20 * 1024 * 1024) { // 20MB
          return cb(new Error('La taille du fichier ne doit pas dépasser 20MB'), false);
        }

        cb(null, true);
      } catch (e) {
        console.warn('update fileFilter error', e);
        cb(null, true);
      }
    }
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
      // Debug: log incoming auth header and user payload for troubleshooting
      try { console.log('UPDATE.authorization header:', req.headers?.authorization); } catch(e){}
      try { console.log('UPDATE.req.user:', JSON.stringify(req.user)); } catch(e) { console.log('UPDATE.req.user (raw):', req.user); }
      const data = JSON.parse(dataString);
      const userId = req.user.userId;
      const userType = req.user.type || 'User';

      // Vérifier que l'utilisateur est bien le propriétaire
  const mobilier = await this.mobilierService.findOne(id);
  try { console.log('UPDATE.mobilier.proprietaire (raw):', mobilier?.proprietaire, 'toString:', mobilier?.proprietaire?.toString?.()); } catch(e){}
      // Allow if the requesting user is the owner (compare ids). Don't fail when token lacks type claim.
      if (!mobilier || mobilier.proprietaire._id.toString() !== userId) {
        // audit log to help debugging mismatched ownership/auth issues
        console.warn(`Unauthorized update attempt on mobilier ${id} by user ${userId}. proprietaire=${mobilier?.proprietaire?._id?.toString()} proprietaireType=${mobilier?.proprietaireType} tokenType=${userType}`);
        throw new BadRequestException('Non autorisé à modifier ce bien');
      }

      // Formater les nouveaux fichiers
      const newFiles = {
        images: files.newImages?.map(file => this.formatFilePath(file.path)) || [],
        videos: files.newVideos?.map(file => this.formatFilePath(file.path)) || [],
        documents: files.newDocuments?.map(file => this.formatFilePath(file.path)) || []
      };

      // Mettre à jour avec les anciennes et nouvelles images
      const updateData: any = {
        ...data,
        images: [...(data.keepImages || []), ...newFiles.images],
        videos: [...(data.keepVideos || []), ...newFiles.videos],
        documents: [...(data.keepDocuments || []), ...newFiles.documents]
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

  private formatFilePath(fullPath: string): string {
    const relativePath = fullPath.split('uploads')[1];
    return `/uploads${relativePath}`.replace(/\\/g, '/');
  }

  @Get('images/:dateFolder/:filename')
  async serveImage(
    @Param('dateFolder') dateFolder: string,
    @Param('filename') filename: string,
    @Req() req,
    @Res() res
  ) {
    const imagePath = join(process.cwd(), 'uploads', 'mobilier', 'images', dateFolder, filename);
    
    if (!existsSync(imagePath)) {
      throw new NotFoundException('Image non trouvée');
    }
    
    return res.sendFile(imagePath);
  }
}
