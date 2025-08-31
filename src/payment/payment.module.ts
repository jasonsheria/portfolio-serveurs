import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from '../entity/payment/payment.schema';
import { User, UserSchema } from '../entity/users/user.schema';
import { ConfigModule } from '@nestjs/config';
import { Owner, OwnerSchema } from '../entity/owner/owner.schema';
import { SiteModule } from '../site/site.module';
@Module({
  imports: [
    UsersModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Owner', schema: OwnerSchema }
    ]),
    SiteModule,
    ConfigModule
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService]
})
export class PaymentModule {}
