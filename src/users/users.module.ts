// src/users/users.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserSchema } from '../entity/users/user.schema';
import { Payment, PaymentSchema } from '../entity/payment/payment.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    forwardRef(() => AuthModule),
    UploadModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}