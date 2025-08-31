import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OwnerService } from './owner.service';
import { OwnerController } from './owner.controller';
import { Owner, OwnerSchema } from '../entity/owner/owner.schema';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Owner.name, schema: OwnerSchema }]),
    AuthModule,
    MulterModule.registerAsync({
      useFactory: () => ({
        storage: diskStorage({
          destination: (req, file, cb) => {
            const uploadPath = join(process.cwd(), 'uploads', 'owners', new Date().toISOString().split('T')[0]);
            
            // Créer le dossier s'il n'existe pas
            if (!existsSync(uploadPath)) {
              mkdirSync(uploadPath, { recursive: true });
            }
            
            cb(null, uploadPath);
          },
          filename: (req, file, cb) => {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
          },
        }),
        fileFilter: (req, file, cb) => {
          // Vérifier le type de fichier
          if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
            return cb(new Error('Seuls les fichiers jpg, jpeg, png et pdf sont autorisés'), false);
          }
          // Vérifier la taille du fichier (5MB max)
          if (parseInt(req.headers['content-length']) > 5 * 1024 * 1024) {
            return cb(new Error('La taille du fichier ne doit pas dépasser 5MB'), false);
          }
          cb(null, true);
        },
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB en bytes
        },
      }),
    }),
  ],
  controllers: [OwnerController],
  providers: [OwnerService],
})
export class OwnerModule {}
