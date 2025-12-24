import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { Reservation, ReservationSchema } from './reservation.schema';
import { Mobilier, MobilierSchema } from '../mobilier/mobilier.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { Vehicule, VehiculeSchema } from '../vehicule/vehicule.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reservation.name, schema: ReservationSchema },
      { name: Mobilier.name, schema: MobilierSchema },
      { name: Vehicule.name, schema: VehiculeSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
