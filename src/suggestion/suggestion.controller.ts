import { Body, Controller, Post, Query, Get } from '@nestjs/common';
import { Param, Delete } from '@nestjs/common';
import { SuggestionService } from './suggestion.service';
import { Suggestion } from './suggestion.schema';

@Controller('suggest')
export class SuggestionController {
  constructor(private readonly suggestionService: SuggestionService) {
    // console.log('[SUGGESTION] Contrôleur instancié');
  }

  @Post('/messages')
  async createSuggestion(@Body() body: Partial<Suggestion>) {
    // console.log('[SUGGESTION] Requête reçue pour enregistrement :', body);
    const created = await this.suggestionService.create(body);
    // console.log('[SUGGESTION] Suggestion enregistrée :', created);
    return { message: 'Suggestion enregistrée', suggestion: created };
  }

  @Post()
  async getSuggestionsByUserId(@Body('userId') userId: string) {
    if (!userId) {
      return { message: 'userId requis', suggestions: [] };
    }
    const suggestions = await this.suggestionService.findByUserId(userId);
    return { suggestions };
  }

  @Get()
  async getSuggestionsByUserIdQuery(@Query('userId') userId: string) {
    if (!userId) {
      return { message: 'userId requis', suggestions: [] };
    }
    const suggestions = await this.suggestionService.findByUserId(userId);
    return { suggestions };
  }

  @Post('mark-as-read/:id')
  async markAsRead(@Param('id') id: string) {
    const suggestion = await this.suggestionService.markAsRead(id);
    return { message: 'Suggestion marquée comme lue', suggestion };
  }

  @Post('mark-as-unread/:id')
  async markAsUnread(@Param('id') id: string) {
    const suggestion = await this.suggestionService.markAsUnread(id);
    return { message: 'Suggestion marquée comme non lue', suggestion };
  }

  @Delete(':id')
  async deleteSuggestion(@Param('id') id: string) {
    await this.suggestionService.deleteSuggestion(id);
    return { message: 'Suggestion supprimée' };
  }

  @Post('reply/:id')
  async replyToSuggestion(@Param('id') id: string, @Body('reply') reply: string) {
    await this.suggestionService.replyToSuggestion(id, reply);
    return { message: 'Réponse envoyée par email' };
  }
}
