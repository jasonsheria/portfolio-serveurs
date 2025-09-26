import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EvenementController } from './evenement.controller';
import { EvenementService } from './evenement.service';
import { Evenement, EvenementSchema } from '../entity/evenement/evenement.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { Owner, OwnerSchema } from '../entity/owner/owner.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Evenement.name, schema: EvenementSchema }, { name: Owner.name, schema: OwnerSchema }]), NotificationsModule],
  controllers: [EvenementController],
  providers: [EvenementService],
  exports: [EvenementService],
})
export class EvenementModule {}
