import { diskStorage, FileFilterCallback } from 'multer';
import { Request } from 'express';
import { join, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

export const multerConfig = {
  storage: diskStorage({
    destination: (req: Request & { user?: any }, file: Express.Multer.File, cb: (error: Error | null, destination?: string) => void) => {
      // Déterminer le sous-dossier en fonction du type de fichier
      let uploadType = 'profiles';
      if (file.fieldname === 'cvFile') uploadType = 'cv';
      if (file.fieldname.includes('Logo')) uploadType = 'logos';
      if (file.fieldname === 'postalCardFile') uploadType = 'postalCards';
      
      const uploadPath = join(process.cwd(), 'uploads', 'users', uploadType);
      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req: Request & { user?: any }, file: Express.Multer.File, cb: (error: Error | null, filename?: string) => void) => {
      const userId = req.user?.userId || req.user?.sub || req.user?._id || req.user?.id || 'anonymous';
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const ext = extname(file.originalname);
      cb(null, `${file.fieldname}-${userId}-${uniqueSuffix}${ext}`);
    },
  }),
  fileFilter: (req: Request & { user?: any }, file: Express.Multer.File, cb: (err: Error | null, acceptFile?: boolean) => void) => {
    // Règles de validation selon le type de fichier
    if (file.fieldname.includes('profileImage') || file.fieldname.includes('Logo')) {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Seuls les fichiers jpg, jpeg, png et gif sont autorisés'), false);
      }
    } else if (file.fieldname === 'cvFile' || file.fieldname === 'postalCardFile') {
      if (!file.mimetype.match(/\/(pdf)$/)) {
        return cb(new Error('Seuls les fichiers PDF sont autorisés'), false);
      }
    }

    // Vérifier la taille (5MB) - header peut être undefined ou tableau
    const contentLengthHeader = Array.isArray(req.headers['content-length']) ? req.headers['content-length'][0] : req.headers['content-length'];
    const contentLength = parseInt(String(contentLengthHeader || '0'), 10) || 0;
    if (contentLength > 5 * 1024 * 1024) {
      return cb(new Error('La taille du fichier ne doit pas dépasser 5MB'));
    }

    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
};