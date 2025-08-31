import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from '../entity/notifications/notification.schema';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@InjectModel(Notification.name) private notificationModel: Model<Notification>) {}

  async findAll(userId?: string) {
    try {
      if (!userId) {
        return await this.notificationModel.find().sort({ createdAt: -1 }).limit(50).lean().exec();
      }
      return await this.notificationModel.find({ user: userId }).sort({ createdAt: -1 }).lean().exec();
    } catch (error) {
      this.logger.error('findAll notifications error: ' + error.message, error.stack);
      return [];
    }
  }

  async create(body: any) {
    try {
      const created = await new this.notificationModel(body).save();
      return created;
    } catch (error) {
      this.logger.error('create notification error: ' + error.message, error.stack);
      throw error;
    }
  }

  async markAsRead(id: string) {
    try {
      const updated = await this.notificationModel.findByIdAndUpdate(id, { $set: { isRead: true, readAt: new Date() } }, { new: true }).lean().exec();
      return updated;
    } catch (error) {
      this.logger.error('markAsRead error: ' + error.message, error.stack);
      throw error;
    }
  }

  async markAsUnread(id: string) {
    try {
      const updated = await this.notificationModel.findByIdAndUpdate(id, { $set: { isRead: false }, $unset: { readAt: 1 } }, { new: true }).lean().exec();
      return updated;
    } catch (error) {
      this.logger.error('markAsUnread error: ' + error.message, error.stack);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.notificationModel.findByIdAndDelete(id).exec();
      return true;
    } catch (error) {
      this.logger.error('remove notification error: ' + error.message, error.stack);
      throw error;
    }
  }

  // Fake data for frontend testing
  async fakeData() {
    return [
      { id: 'n1', user: null, content: 'Nouvelle mise à jour disponible', source: 'system', date: new Date().toISOString(), isRead: false },
      { id: 'n2', user: null, content: 'Un utilisateur a commenté votre post', source: 'comments', date: new Date().toISOString(), isRead: false },
      { id: 'n3', user: null, content: 'Rapport d’activité', source: 'system', date: new Date().toISOString(), isRead: true },
    ];
  }
}
