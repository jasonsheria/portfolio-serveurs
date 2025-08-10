import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { MobilierService } from './mobilier.service';

@Controller('mobiliers')
export class MobilierController {
  constructor(private readonly mobilierService: MobilierService) {}

  @Post()
  create(@Body() body: any) {
    return this.mobilierService.create(body);
  }

  @Get()
  findAll() {
    return this.mobilierService.findAll();
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
