import { join, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Configuration pour le stockage et la validation des fichiers dans le chat
export const chatFileConfig = {
  maxSize: 25 * 1024 * 1024, // 25MB comme défini dans WebSocketGateway
  allowedTypes: {
    image: ['.jpg', '.jpeg', '.png', '.gif'],
    video: ['.mp4', '.mpeg', '.mov'],
    audio: ['.mp3', '.wav', '.ogg'],
    document: ['.pdf', '.doc', '.docx', '.txt']
  },
  uploadPath: join(process.cwd(), 'uploads', 'chat'),
  getUploadPath: (type: string) => {
    const basePath = join(process.cwd(), 'uploads', 'chat', type);
    if (!existsSync(basePath)) {
      mkdirSync(basePath, { recursive: true });
    }
    return basePath;
  },
  validateFile: (file: { size: number, originalname: string, mimetype: string }) => {
    // Vérifier la taille
    if (file.size > 25 * 1024 * 1024) {
      throw new Error('La taille du fichier ne doit pas dépasser 25MB');
    }

    // Vérifier le type
    const ext = extname(file.originalname).toLowerCase();
    const type = file.mimetype.split('/')[0];
    
    if (!['image', 'video', 'audio'].includes(type) && !file.mimetype.match(/\/(pdf|msword|vnd.openxmlformats-officedocument.wordprocessingml.document|plain)$/)) {
      throw new Error('Type de fichier non autorisé');
    }

    return true;
  },
  generateFilename: (originalname: string) => {
    const ext = extname(originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    return `chat-${uniqueSuffix}${ext}`;
  }
};