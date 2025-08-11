import {
  Controller,
  Post, 
  Put, 
  Body,
  UseInterceptors,
  UploadedFiles,
  Req,
  BadRequestException,
  Get,
  Query,
  Request,
  UseGuards,
  Delete, 
  Param,  
  Res,
} from '@nestjs/common';
import { MobilierService } from './mobilier.service';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('mobiliers')
export class MobilierController {
  constructor(private readonly mobilierService: MobilierService) {}

  @Post()
  create(@Body() body: any) {
    // S'assurer que le payload contient bien site_id et agent
    if (!body.site_id || !body.agent) {
      throw new BadRequestException('site_id et agent sont requis');
    }
    return this.mobilierService.create(body);
  }

  @Get()
  findAll(@Query('site') siteIdRaw: string) {
      if (!siteIdRaw || typeof siteIdRaw !== 'string' || !/^[a-fA-F0-9]{24}$/.test(siteIdRaw)) {
        throw new BadRequestException('site_id is invalid or missing (format).');
      }
    return this.mobilierService.findAll(siteIdRaw);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mobilierService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.mobilierService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mobilierService.remove(id);
  }
}
