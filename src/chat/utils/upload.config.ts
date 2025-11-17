import { diskStorage } from 'multer';
import { join, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

export const chatUploadConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      // Déterminer le sous-dossier selon le type de fichier
      const fileType = getFileType(file.mimetype);
      const uploadPath = join('/uploads', 'chat', fileType);
      
      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const ext = extname(file.originalname);
      cb(null, `chat-${uniqueSuffix}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const maxSize = 25 * 1024 * 1024; // 25MB max
    const fileType = getFileType(file.mimetype);

    if (fileType === 'unknown') {
      return cb(new Error('Type de fichier non autorisé'), false);
    }

    if (parseInt(req.headers['content-length']) > maxSize) {
      return cb(new Error('La taille du fichier ne doit pas dépasser 25MB'), false);
    }

    cb(null, true);
  },
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max
  }
};

function getFileType(mimetype: string): string {
  if (mimetype.startsWith('image/')) return 'images';
  if (mimetype.startsWith('video/')) return 'videos';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype === 'application/pdf') return 'documents';
  return 'unknown';
}