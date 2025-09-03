  import { Controller, Get, Post, Body, Param, Patch, Delete, Query } from '@nestjs/common';
import { NotificationsService } from'./notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(@Query('userId') userId?: string) {
    const items = await this.notificationsService.findAll(userId);
    return { notifications: items };
  }

  @Get('test-fake')
  async fake() {
    return { notifications: await this.notificationsService.fakeData() };
  }

  @Post()
  async create(@Body() body: any) {
    const created = await this.notificationsService.create(body);
    return { notification: created };
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string) {
    const updated = await this.notificationsService.markAsRead(id);
    return { updated };
  }

  @Patch(':id/unread')
  async markUnread(@Param('id') id: string) {
    const updated = await this.notificationsService.markAsUnread(id);
    return { updated };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.notificationsService.remove(id);
    return { message: 'Deleted' };
  }
}
