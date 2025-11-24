import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

// Base uploads directory: prefer UPLOADS_DIR env var (e.g. /uploads or /data/uploads)
const UPLOADS_BASE = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');

export function multerOptions(folder = 'general') {
  return {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = join(UPLOADS_BASE, folder);
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = extname(file.originalname);
        cb(null, `file-${uniqueSuffix}${ext}`);
      },
    }),
  };
}

export default multerOptions;
