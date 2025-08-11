import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Agent } from './agent.schema';

@Injectable()
export class AgentService {
  constructor(@InjectModel(Agent.name) private agentModel: Model<Agent>) {}

  async create(data: Partial<Agent>): Promise<Agent> {
    return this.agentModel.create(data);
  }

  async findAll(siteId: string): Promise<Agent[]> {
    return this.agentModel.find({ site_id: siteId }).exec();
  }

  async findOne(id: string): Promise<Agent> {
    const agent = await this.agentModel.findById(id).exec();
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async update(id: string, data: Partial<Agent>): Promise<Agent> {
    const agent = await this.agentModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async remove(id: string): Promise<void> {
    const res = await this.agentModel.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException('Agent not found');
  }
}
