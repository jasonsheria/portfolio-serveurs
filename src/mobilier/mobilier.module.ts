import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Mobilier, MobilierSchema } from './mobilier.schema';
import { MobilierService } from './mobilier.service';
import { MobilierController } from './mobilier.controller';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Mobilier.name, schema: MobilierSchema }]),
    UploadModule,
  ],
  providers: [MobilierService],
  controllers: [MobilierController],
  exports: [MobilierService],
})
export class MobilierModule {}
