import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Mobilier } from './mobilier.schema';

@Injectable()
export class MobilierService {
  constructor(@InjectModel(Mobilier.name) private mobilierModel: Model<Mobilier>) {}

  async create(data: Partial<Mobilier>): Promise<Mobilier> {
    return this.mobilierModel.create(data);
  }

  async findAll(): Promise<Mobilier[]> {
    return this.mobilierModel.find().populate('agent').exec();
  }

  async findOne(id: string): Promise<Mobilier> {
    const mobilier = await this.mobilierModel.findById(id).populate('agent').exec();
    if (!mobilier) throw new NotFoundException('Mobilier not found');
    return mobilier;
  }

  async update(id: string, data: Partial<Mobilier>): Promise<Mobilier> {
    const mobilier = await this.mobilierModel.findByIdAndUpdate(id, data, { new: true }).populate('agent').exec();
    if (!mobilier) throw new NotFoundException('Mobilier not found');
    return mobilier;
  }

  async remove(id: string): Promise<void> {
    const res = await this.mobilierModel.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException('Mobilier not found');
  }
}
