import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Projet } from '../entity/projet/projet.schema';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Projet.name) private projectModel: Model<Projet>,
  ) {}

  async findAllByUser(userId: string) {
    console.log(userId);
    return this.projectModel.find({ user: userId }).sort({ createdAt: -1 }).exec();
  }

  async create(userId: string, dto: any) {
    const project = new this.projectModel({ ...dto, user: userId });
    return project.save();
  }

  async update(userId: string, projectId: string, dto: any) {
    const project = await this.projectModel.findOne({ _id: projectId, user: userId });
    if (!project) throw new NotFoundException('Projet non trouvé');
    Object.assign(project, dto);
    return project.save();
  }

  async delete(userId: string, projectId: string) {
    const project = await this.projectModel.findOne({ _id: projectId, user: userId });
    if (!project) throw new NotFoundException('Projet non trouvé');
    await project.deleteOne();
    return { deleted: true };
  }
}
