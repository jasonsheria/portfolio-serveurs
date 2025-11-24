import { Injectable, Inject, Logger } from '@nestjs/common';
import { diskStorage } from 'multer';
import { join, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { CloudinaryService } from './cloudinary.service';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  constructor(private readonly cloudinaryService?: CloudinaryService) {}

  /**
   * Retourne la configuration Multer pour diskStorage
   * @param folder Sous-dossier (ex: 'general', 'profiles', 'mobilier')
   * @returns Configuration diskStorage Multer
   */
  getMulterConfig(folder: string = 'general') {
    return diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = this.getUploadPath(folder);
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = extname(file.originalname);
        cb(null, `file-${uniqueSuffix}${ext}`);
      },
    });
  }

  /**
   * Retourne la configuration Multer pour FileFieldsInterceptor (multiple fields)
   * Chaque field peut avoir son propre sous-dossier
   */
  getMulterFieldsConfig(fieldsWithFolders: { name: string; folder: string; maxCount: number }[]) {
    return diskStorage({
      destination: (req, file, cb) => {
        // Trouver le dossier correspondant au field name
        const fieldConfig = fieldsWithFolders.find(f => f.name === file.fieldname);
        const folder = fieldConfig ? fieldConfig.folder : 'general';
        const uploadPath = this.getUploadPath(folder);

        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = extname(file.originalname);
        cb(null, `file-${uniqueSuffix}${ext}`);
      },
    });
  }

  /**
   * Retourne le chemin d'upload approprié selon l'environnement
   * Production (Render): /upload/[folder]
   * Local: uploads/[folder]
   */
  getUploadPath(folder: string = 'general'): string {
    // Allow configuring the uploads base directory via env var (UPLOADS_DIR).
    // Useful on Render where you attach a persistent disk (e.g. mount at /data/uploads).
    const base = process.env.UPLOADS_DIR
      ? process.env.UPLOADS_DIR
      : (process.env.NODE_ENV === 'production' ? '/upload' : join(process.cwd(), 'uploads'));
    return join(base, folder);
  }

  /**
   * Génère l'URL publique pour un fichier uploadé
   * @param filename Nom du fichier
   * @param folder Sous-dossier (ex: 'general')
   * @returns URL publique
   */
  getPublicUrl(filename: string, folder: string = 'general'): string {
    // If using Cloudinary, construct public URL from cloud folder config
    if ((process.env.STORAGE_PROVIDER || '').toLowerCase() === 'cloudinary') {
      const cloudFolder = (process.env.CLOUDINARY_UPLOAD_FOLDER || 'app_uploads') + '/' + folder;
      // Cloudinary public id typically is the filename without extension; but we store secure_url in response.
      // For consistency, return the Cloudinary URL base if provided via env, otherwise fallback to /uploads path.
      return process.env.CLOUDINARY_BASE_URL
        ? `${process.env.CLOUDINARY_BASE_URL}/${cloudFolder}/${filename}`
        : `/uploads/${folder}/${filename}`;
    }
    return `/uploads/${folder}/${filename}`;
  }

  /**
   * Crée une réponse standardisée pour un upload
   */
  async createUploadResponse(file: Express.Multer.File, folder: string = 'general') {
    // If Cloudinary provider is configured, upload the local file to Cloudinary and return cloud info.
    if ((process.env.STORAGE_PROVIDER || '').toLowerCase() === 'cloudinary' && this.cloudinaryService) {
      try {
        const localPath = (file as any).path || file.path || null;
        if (!localPath) {
          this.logger.warn('File has no local path, cannot upload to Cloudinary');
          return {
            url: this.getPublicUrl(file.filename, folder),
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype,
            uploadedAt: new Date().toISOString(),
          };
        }
        const result = await this.cloudinaryService.uploadAndRemove(localPath, folder);
        return {
          url: result.secure_url,
          filename: result.public_id ? `${result.public_id}.${result.format}` : result.public_id || file.filename,
          size: result.bytes || file.size,
          mimetype: result.format || file.mimetype,
          uploadedAt: result.created_at || new Date().toISOString(),
          provider: 'cloudinary',
          raw: result,
        };
      } catch (e) {
        this.logger.error('Cloudinary upload failed', e as any);
        // fallback to local url
        return {
          url: this.getPublicUrl(file.filename, folder),
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype,
          uploadedAt: new Date().toISOString(),
        };
      }
    }

    return {
      url: this.getPublicUrl(file.filename, folder),
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date().toISOString(),
    };
  }

  /**
   * Crée une réponse standardisée pour plusieurs fichiers
   */
  async createBulkUploadResponse(files: Express.Multer.File[], folder: string = 'general') {
    const results = [] as any[];
    for (const file of files) {
      // eslint-disable-next-line no-await-in-loop
      const r = await this.createUploadResponse(file, folder);
      results.push(r);
    }
    return results;
  }

  /**
   * Valide les fichiers image
   */
  validateImageFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
      return {
        valid: false,
        error: 'Seuls les fichiers jpg, jpeg, png, gif et webp sont autorisés',
      };
    }

    if (file.size > 5 * 1024 * 1024) {
      return {
        valid: false,
        error: 'La taille du fichier ne doit pas dépasser 5MB',
      };
    }

    return { valid: true };
  }

  /**
   * Valide les fichiers généraux (documents, fichiers, etc)
   */
  validateGenericFile(file: Express.Multer.File, maxSizeMB: number = 10): { valid: boolean; error?: string } {
    if (file.size > maxSizeMB * 1024 * 1024) {
      return {
        valid: false,
        error: `La taille du fichier ne doit pas dépasser ${maxSizeMB}MB`,
      };
    }

    return { valid: true };
  }

  /**
   * Valide plusieurs fichiers en même temps
   */
  validateImageFiles(files: Express.Multer.File[]): { valid: boolean; error?: string } {
    if (!files || files.length === 0) {
      return { valid: false, error: 'Aucun fichier fourni' };
    }

    for (const file of files) {
      const validation = this.validateImageFile(file);
      if (!validation.valid) {
        return validation;
      }
    }

    return { valid: true };
  }

  /**
   * Valide les documents (PDF, Word, Excel, etc)
   */
  validateDocumentFile(file: Express.Multer.File, maxSizeMB: number = 10): { valid: boolean; error?: string } {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedMimes.includes(file.mimetype)) {
      return {
        valid: false,
        error: 'Seuls les fichiers PDF, Word et Excel sont autorisés',
      };
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      return {
        valid: false,
        error: `La taille du fichier ne doit pas dépasser ${maxSizeMB}MB`,
      };
    }

    return { valid: true };
  }
}
