import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Evenement } from '../entity/evenement/evenement.schema';
import { Owner } from '../entity/owner/owner.schema';
import { NotificationsService } from '../notifications/notifications.service';

interface CreateNotificationBody {
  user: string | null;
  content: string;
  source: string;
}

@Injectable()
export class EvenementService {
  private readonly logger = new Logger(EvenementService.name);

  constructor(
    @InjectModel(Evenement.name) private evenementModel: Model<Evenement>,
    @InjectModel(Owner.name) private ownerModel: Model<Owner>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAllForOwner(ownerId: string) {
    try {
      return await this.evenementModel.find({ ownerId: ownerId }).sort({ createdAt: -1 }).lean().exec();
    } catch (error) {
      this.logger.error('findAllForOwner error: ' + error.message, error.stack);
      return [];
    }
  }

  async findAllForUser(userId: string) {
    try {
      return await this.evenementModel.find({ userId: userId }).sort({ createdAt: -1 }).lean().exec();
    } catch (error) {
      this.logger.error('findAllForUser error: ' + error.message, error.stack);
      return [];
    }
  }

  async create(body: any) {
    try {
      const created = await new this.evenementModel(body).save();

      // Try to notify the owner (resolve owner -> linked user)
      try {
        const owner = await this.ownerModel.findById(created.ownerId).lean().exec();
        if (owner && owner.user) {
          const n1: CreateNotificationBody = { user: owner.user.toString(), content: body.content || 'Nouvel évènement', source: 'evenement' };
          await this.notificationsService.create(n1);
        }
      } catch (err) {
        this.logger.error('notify owner error: ' + err.message, err.stack);
      }

      // Notify the user who triggered the event (if provided)
      try {
        if (created.userId) {
          const n2: CreateNotificationBody = { user: created.userId.toString(), content: body.content || 'Votre évènement a été enregistré', source: 'evenement' };
          await this.notificationsService.create(n2);
        }
      } catch (err) {
        this.logger.error('notify user error: ' + err.message, err.stack);
      }

      return created;
    } catch (error) {
      this.logger.error('create evenement error: ' + error.message, error.stack);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.evenementModel.findByIdAndDelete(id).exec();
      return true;
    } catch (error) {
      this.logger.error('remove evenement error: ' + error.message, error.stack);
      throw error;
    }
  }
}
