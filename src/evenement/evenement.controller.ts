import { Controller, Get, Post, Body, Param, Query, Delete } from '@nestjs/common';
import { EvenementService } from './evenement.service';

@Controller('evenements')
export class EvenementController {
  constructor(private readonly evenementService: EvenementService) {}

  @Get()
  async list(@Query('ownerId') ownerId?: string, @Query('userId') userId?: string) {
    if (ownerId) {
      return { evenements: await this.evenementService.findAllForOwner(ownerId) };
    }
    if (userId) {
      return { evenements: await this.evenementService.findAllForUser(userId) };
    }
    return { evenements: [] };
  }

  @Post()
  async create(@Body() body: any) {
    const created = await this.evenementService.create(body);
    return { evenement: created };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.evenementService.remove(id);
    return { message: 'Deleted' };
  }
}
