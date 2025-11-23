import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Agent, AgentSchema } from './agent.schema';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { UploadModule } from '../upload/upload.module';


@Module({
  imports: [
    MongooseModule.forFeature([{ name: Agent.name, schema: AgentSchema }]),
    UploadModule, // ← Ajouter UploadModule
  ],
  providers: [AgentService],
  controllers: [AgentController],
  exports: [AgentService],
})
export class AgentModule {}
