  import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from '../entity/notifications/notification.schema';
  import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  // Note: ChatGateway is injected using forwardRef in NotificationsModule to avoid circular dependency
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    @Inject(forwardRef(() => ChatGateway)) private readonly chatGateway: ChatGateway,
  ) {}

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

  async findUnread(userId: string) {
    try {
      if (!userId) return [];
      return await this.notificationModel.find({ user: userId, isRead: { $in: [false, null, undefined] } }).sort({ createdAt: -1 }).lean().exec();
    } catch (error) {
      this.logger.error('findUnread notifications error: ' + error.message, error.stack);
      return [];
    }
  }

  async create(body: any) {
    try {
      const created = await new this.notificationModel(body).save();
      // After creation, try to emit websocket notification to the target user (if any)
      try {
        const targetUserId = created.user || null;
        if (targetUserId && this.chatGateway && typeof this.chatGateway.emitNotificationToUser === 'function') {
          // Build a sanitized payload with the fields the frontend expects
          const payload = {
            id: (created as any)._id ? (created as any)._id.toString() : (created as any).id || null,
            user: (created as any).user ? ((created as any).user.toString ? (created as any).user.toString() : (created as any).user) : null,
            userId: (created as any).user ? ((created as any).user.toString ? (created as any).user.toString() : (created as any).user) : null,
            senderId: (created as any).sender ? ((created as any).sender.toString ? (created as any).sender.toString() : (created as any).sender) : null,
            title: (created as any).title || null,
            message: (created as any).message || (created as any).content || '',
            unread: !(created as any).isRead,
            timestamp: (created as any).createdAt || new Date(),
          };
          this.chatGateway.emitNotificationToUser(targetUserId.toString(), payload);
        }
      } catch (err) {
        this.logger.error('emit websocket notification error: ' + (err?.message || err));
      }

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

  async findById(id: string) {
    try {
      if (!id) return null;
      return await this.notificationModel.findById(id).lean().exec();
    } catch (error) {
      this.logger.error('findById notification error: ' + error.message, error.stack);
      return null;
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
