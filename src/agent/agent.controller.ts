import { Controller, Get, Post, Body, Param, Put, Delete, UploadedFile, BadRequestException, UseInterceptors, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { AgentService } from './agent.service';

@Controller('agents')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
      storage: diskStorage({
        destination: '/upload/agents', // <-- persistent disk for agents uploads
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          const filename = `agents_${Date.now()}${ext}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(null, false);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    }))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
      if (!file) throw new BadRequestException('Aucun fichier reçu');
      return { url: `/uploads/agents/${file.filename}` };
    }
  
  

  @Post()
  create(@Body() body: any) {
    if (!body.site_id) {
      throw new BadRequestException('site_id est requis');
    }
    return this.agentService.create(body);
  }

  @Get()
  findAll(@Query('site') siteIdRaw: string) {
    if (!siteIdRaw || typeof siteIdRaw !== 'string' || !/^[a-fA-F0-9]{24}$/.test(siteIdRaw)) {
      throw new BadRequestException('site_id is invalid or missing (format).');
    }
    return this.agentService.findAll(siteIdRaw);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agentService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.agentService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.agentService.remove(id);
  }
}
