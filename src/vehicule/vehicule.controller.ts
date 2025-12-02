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
} from '@nestjs/common';
import { VehiculeService } from './vehicule.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { multerFieldsOptions } from '../upload/multer.config';
import { UploadService } from '../upload/upload.service';
import { Types } from 'mongoose';

@Controller('vehicules')
export class VehiculeController {
  constructor(private readonly vehiculeService: VehiculeService, private readonly uploadService: UploadService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 10 },
        { name: 'videos', maxCount: 5 },
        { name: 'documents', maxCount: 5 },
      ],
      multerFieldsOptions([
        { name: 'images', folder: 'vehicules/images' },
        { name: 'videos', folder: 'vehicules/videos' },
        { name: 'documents', folder: 'vehicules/documents' },
      ]),
    ),
  )
  async create(
    @Req() req,
    @Body('data') dataString: string,
    @UploadedFiles()
    files: { images?: Express.Multer.File[]; videos?: Express.Multer.File[]; documents?: Express.Multer.File[] },
  ) {
    try {
      let data: any;
      if (typeof dataString === 'string') {
        try {
          data = JSON.parse(dataString);
        } catch (e) {
          try {
            const unescaped = (dataString || '').replace(/\\+/g, '');
            data = JSON.parse(unescaped);
          } catch (e2) {
            throw e;
          }
        }
      } else data = dataString;

      // Validate files via UploadService utilities
      if (files.images && files.images.length > 0) {
        const iv = this.uploadService.validateImageFiles(files.images);
        if (!iv.valid) throw new BadRequestException(iv.error);
      }
      if (files.videos && files.videos.length > 0) {
        const vv = this.uploadService.validateGenericFile(files.videos[0], 50);
        if (!vv.valid) throw new BadRequestException(vv.error);
      }

      const userId = req.user.userId;
      const userType = req.user.type || 'User';

      const imageResponses = files.images ? await this.uploadService.createBulkUploadResponse(files.images, 'vehicules/images') : [];
      const videoResponses = files.videos ? await this.uploadService.createBulkUploadResponse(files.videos, 'vehicules/videos') : [];
      const docResponses = files.documents ? await this.uploadService.createBulkUploadResponse(files.documents, 'vehicules/documents') : [];

      const payload: any = {
        ...data,
        proprietaire: new Types.ObjectId(userId),
        proprietaireType: userType,
        images: imageResponses.map(r => r.url),
        videos: videoResponses.map(r => r.url),
        documents: docResponses.map(r => r.url),
      };

      if (data && data.agentId) {
        try {
          payload.agentId = data.agentId;
        } catch (e) {}
      }

      const created = await this.vehiculeService.create(payload);
      return created;
    } catch (error) {
      if (error instanceof SyntaxError) throw new BadRequestException('Format de données invalide');
      throw error;
    }
  }

  @Get()
  async findAll(@Query() query: any) {
    return this.vehiculeService.findAll(query);
  }

  @Get('owner/:ownerId')
  @UseGuards(JwtAuthGuard)
  async findByOwner(@Param('ownerId') ownerId: string, @Query() query: any) {
    return this.vehiculeService.findByProprietaire(ownerId, 'Owner', query);
  }

  @Get('agent/:agentId')
  @UseGuards(JwtAuthGuard)
  async findByAgent(@Param('agentId') agentId: string, @Query() query: any) {
    return this.vehiculeService.findByProprietaire(agentId, 'Agent', query);
  }

  @Get('all')
  async findAllRaw(@Query() query: any) {
    return this.vehiculeService.findAllRaw(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.vehiculeService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() body: any, @Req() req) {
    // simple update - frontend should send images/videos urls or use upload endpoints to add new media
    return this.vehiculeService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    return this.vehiculeService.remove(id);
  }
}
