    import { 
    Controller, 
    Get, 
    Post, 
    Body, 
    Param, 
    Patch, 
    Delete, 
    Query, 
    UseInterceptors, 
    UploadedFile, 
    BadRequestException,
    UseGuards,
    Request,
    HttpException,
    InternalServerErrorException
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { botDTO } from '../bot/dto/bot.dto';
import { BotService } from '../bot/bot.service';
import { messageFileUploadInterceptor } from './utils/upload.config';
import { FileTypeValidators } from './utils/file.config';
import { UploadService } from '../upload/upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/types/request.interface';
import * as fs from 'fs';

/**
 * Controller pour la gestion des messages / notifications utilisés par le front.
 * Endpoints ajoutés:
 * - GET  /messages                -> liste des messages (option: ?userId=...)
 * - GET  /messages/test-fake      -> retourne un tableau fake pour tests
 * - PATCH /messages/:id/read      -> marquer comme lu
 * - PATCH /messages/:id/unread    -> marquer comme non lu
 * - DELETE /messages/:id          -> supprimer message
 * - POST   /messages/:id/reply    -> envoyer une réponse (stockage/bot/email selon usage)
 */

@Controller('messages')
export class MessagesController {
    constructor(
        private readonly messagesService: MessagesService, // Remplacez 'any' par le type approprié
        private readonly botService: BotService, // Assurez-vous que le service Bot est injecté si nécessaire
        private readonly uploadService: UploadService,
    ) {}

    @Post('send')
    async sendMessage(@Body() messageDto: botDTO): Promise<{ response: string }> {
        // Récupérer le message utilisateur
        const message = messageDto.message;
        // Appeler le service bot pour obtenir la réponse prédictive
        const response = await this.botService.predilect(message);
        // (Optionnel) Vous pouvez enregistrer la question/réponse en base ici via messagesService
        // await this.messagesService.create({ text: message, response });
        // Retourner la réponse au frontend
        return { response };
    }

        // --- Management API used by frontend MessageContext ---

        @Get()
        async listMessages(@Query('userId') userId?: string) {
            // If userId provided, filter messages for that user, otherwise return recent messages
            const messages = await this.messagesService.findAll(userId);
            return { messages };
        }

        @Get('test-fake')
        async getFakeMessages() {
            // Return a small fake dataset for frontend testing without DB
            const fake = [
                { id: 'f1', sender: 'System', email: 'system@example.com', subject: 'Bienvenue', body: 'Bienvenue sur la plateforme', date: new Date().toISOString(), isRead: false },
                { id: 'f2', sender: 'Admin', email: 'admin@example.com', subject: 'Mise à jour', body: 'La plateforme a été mise à jour', date: new Date().toISOString(), isRead: false },
                { id: 'f3', sender: 'Utilisateur X', email: 'x@example.com', subject: 'Question', body: 'Pouvez-vous m\'aider ?', date: new Date().toISOString(), isRead: true },
            ];
            return { suggestions: fake, notifications: fake };
        }

        @Patch(':id/read')
        async markRead(@Param('id') id: string) {
            const updated = await this.messagesService.markAsRead(id);
            return { message: 'Marked as read', updated };
        }

        @Patch(':id/unread')
        async markUnread(@Param('id') id: string) {
            const updated = await this.messagesService.markAsUnread(id);
            return { message: 'Marked as unread', updated };
        }

        @Delete(':id')
        async remove(@Param('id') id: string) {
            await this.messagesService.remove(id);
            return { message: 'Deleted' };
        }

        @Post(':id/reply')
        async reply(@Param('id') id: string, @Body('reply') reply: string) {
            // Depending on the app, you may persist the reply, send an email, or call the bot service
            await this.messagesService.replyToMessage(id, reply);
            return { message: 'Reply sent' };
        }

        @Post('upload')
        @UseGuards(JwtAuthGuard)
        @UseInterceptors(messageFileUploadInterceptor)
        async uploadFile(
            @UploadedFile() file: Express.Multer.File,
            @Request() req: RequestWithUser
        ) {
            try {
                // Validate file presence
                if (!file) {
                    throw new BadRequestException('No file uploaded');
                }

                // Get and validate file type
                let fileType = 'unknown';
                if (FileTypeValidators.isImage(file.originalname)) {
                    fileType = 'image';
                } else if (FileTypeValidators.isVideo(file.originalname)) {
                    fileType = 'video';  
                } else if (FileTypeValidators.isAudio(file.originalname)) {
                    fileType = 'audio';
                } else if (FileTypeValidators.isDocument(file.originalname)) {
                    fileType = 'document';
                } else {
                    throw new BadRequestException('Invalid file type');
                }

                // Use UploadService to upload to provider (Cloudinary) or return local path when provider not configured
                const uploadFolder = `messages/${fileType}`;
                const resp = await this.uploadService.createUploadResponse(file as any, uploadFolder);

                // Persist metadata using the provider URL (or local path fallback returned by UploadService)
                const fileMetadata = await this.messagesService.saveFileMetadata({
                    userId: req.user.id, // Using id instead of _id as Document provides id getter
                    originalName: file.originalname,
                    filename: resp.filename || file.filename,
                    type: fileType,
                    path: resp.url || file.path,
                    size: resp.size || file.size
                });

                // Return file info including provider URL
                return {
                    id: fileMetadata._id,
                    originalName: file.originalname,
                    filename: resp.filename || file.filename,
                    type: fileType,
                    path: resp.url || file.path,
                    size: resp.size || file.size
                };
            } catch (error) {
                // Clean up the file if something goes wrong
                if (file && file.path) {
                    try {
                        fs.unlinkSync(file.path);
                    } catch (err) {
                        // Log cleanup error but don't expose to client
                        console.error('Failed to clean up file:', err);
                    }
                }
                throw error instanceof HttpException 
                    ? error 
                    : new InternalServerErrorException('Failed to process file upload');
            }
        }
}
