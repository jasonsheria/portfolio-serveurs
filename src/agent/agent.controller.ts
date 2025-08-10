import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { AgentService } from './agent.service';

@Controller('agents')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post()
  create(@Body() body: any) {
    return this.agentService.create(body);
  }

  @Get()
  findAll() {
    return this.agentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agentService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.agentService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.agentService.remove(id);
  }
}
