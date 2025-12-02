import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Vehicule, VehiculeSchema } from './vehicule.schema';
import { VehiculeService } from './vehicule.service';
import { VehiculeController } from './vehicule.controller';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Vehicule.name, schema: VehiculeSchema }]), UploadModule],
  providers: [VehiculeService],
  controllers: [VehiculeController],
  exports: [VehiculeService],
})
export class VehiculeModule {}
