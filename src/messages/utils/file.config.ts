import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { Request } from 'express';

// Allowed file types
const allowedFileTypes = {
  image: ['.jpg', '.jpeg', '.png', '.gif'],
  video: ['.mp4', '.mov', '.avi'],
  audio: ['.mp3', '.wav'],
  document: ['.pdf', '.doc', '.docx', '.txt']
};

// Max file size in bytes (25MB)
const maxFileSize = 25 * 1024 * 1024;

export const multerConfig = {
  storage: diskStorage({
    destination: (req: Request, file, cb) => {
      // Ensure user is authenticated
      if (!req.user) {
        return cb(new BadRequestException('User not authenticated'), null);
      }
      
      const fileType = getFileType(file.originalname);
      
      // Create base uploads/messages folder if it doesn't exist
      const baseUploadPath = join('/uploads', 'messages'); 
      if (!fs.existsSync(baseUploadPath)) {
        fs.mkdirSync(baseUploadPath, { recursive: true });
      }

      // Create file type subfolder
      const uploadPath = join(baseUploadPath, fileType);
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },
    filename: (req: Request, file, cb) => {
      // Add user info to filename if authenticated
      const userPrefix = req.user ? `${req.user.id}-` : '';
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = extname(file.originalname).toLowerCase();
      const filename = `${userPrefix}${uniqueSuffix}${ext}`;
      cb(null, filename);
    }
  }),
  fileFilter: (req: Request, file, cb) => {
    // Get file extension
    const ext = extname(file.originalname).toLowerCase();

    // Check if extension is allowed in any type
    const isAllowed = Object.values(allowedFileTypes).some(
      types => types.includes(ext)
    );

    if (!isAllowed) {
      return cb(new BadRequestException('File type not allowed'), false);
    }

    return cb(null, true);
  },
  limits: {
    fileSize: maxFileSize
  }
}

// Helper function to determine file type from extension
function getFileType(filename: string): string {
  const ext = extname(filename).toLowerCase();

  for (const [type, extensions] of Object.entries(allowedFileTypes)) {
    if (extensions.includes(ext)) {
      return type;
    }
  }

  return 'other';
}

// Export file type validation helpers
export const FileTypeValidators = {
  isImage: (filename: string) => allowedFileTypes.image.includes(extname(filename).toLowerCase()),
  isVideo: (filename: string) => allowedFileTypes.video.includes(extname(filename).toLowerCase()),
  isAudio: (filename: string) => allowedFileTypes.audio.includes(extname(filename).toLowerCase()),
  isDocument: (filename: string) => allowedFileTypes.document.includes(extname(filename).toLowerCase())
};