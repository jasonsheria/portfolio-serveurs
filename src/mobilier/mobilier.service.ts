import { Injectable, NotFoundException,BadRequestException } from '@nestjs/common';
import { InjectModel} from '@nestjs/mongoose';
import { Mobilier } from './mobilier.schema';
import { Model, Types } from 'mongoose';

@Injectable()
export class MobilierService {
  constructor(@InjectModel(Mobilier.name) private mobilierModel: Model<Mobilier>) {}

  async create(data: Partial<Mobilier>): Promise<Mobilier> {
    return this.mobilierModel.create(data);
  }

  async findAll(siteId: String): Promise<Mobilier[]> {
    if (!siteId) {
      throw new BadRequestException('SiteId requis');
    }
    return this.mobilierModel.find({ site_id: siteId }).populate('agent').exec();
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
