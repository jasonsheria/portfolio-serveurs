import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OwnerService } from './owner.service';
import { OwnerController } from './owner.controller';
import { Owner, OwnerSchema } from '../entity/owner/owner.schema';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Owner.name, schema: OwnerSchema }]),
    AuthModule,
    UploadModule,
  ],
  controllers: [OwnerController],
  providers: [OwnerService],
})
export class OwnerModule {}
