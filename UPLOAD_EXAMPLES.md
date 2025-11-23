# 📚 Exemples d'utilisation du UploadService

## 1️⃣ Utiliser dans un autre module

### Ajouter à ton module
```typescript
// profile.module.ts
import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { UploadModule } from '../upload/upload.module'; // ← Importer

@Module({
  imports: [UploadModule], // ← Ajouter ici
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
```

### Injecter le service
```typescript
// profile.controller.ts
import { UploadService } from '../upload/upload.service';

@Controller('profile')
export class ProfileController {
  constructor(private uploadService: UploadService) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: undefined, // ← Sera défini dynamiquement
  }))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    // Valider
    const validation = this.uploadService.validateImageFile(file);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // Retourner réponse standardisée avec sous-dossier
    return this.uploadService.createUploadResponse(file, 'profiles');
  }
}
```

## 2️⃣ Changer le sous-dossier

```typescript
// Chaque type d'upload dans son dossier
const response = this.uploadService.createUploadResponse(file, 'mobilier');
// → /uploads/mobilier/file-*.jpg

const response = this.uploadService.createUploadResponse(file, 'agents');
// → /uploads/agents/file-*.jpg

const response = this.uploadService.createUploadResponse(file, 'messages');
// → /uploads/messages/file-*.jpg
```

## 3️⃣ Cas d'usage réel - Upload de propriété

```typescript
// mobilier.controller.ts
import { UploadService } from '../upload/upload.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('mobilier')
export class MobilierController {
  constructor(
    private uploadService: UploadService,
    private mobilierService: MobilierService,
  ) {}

  @Post(':id/images')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPropertyImage(
    @Param('id') propertyId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Valider
    const validation = this.uploadService.validateImageFile(file);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // Créer la réponse
    const uploadResponse = this.uploadService.createUploadResponse(file, 'mobilier');

    // Sauvegarder en base de données
    const property = await this.mobilierService.findById(propertyId);
    property.images = property.images || [];
    property.images.push(uploadResponse.url);
    await property.save();

    return uploadResponse;
  }
}
```

## 4️⃣ Upload multiple

```typescript
import { FilesInterceptor } from '@nestjs/platform-express';

@Post('bulk-upload')
@UseInterceptors(FilesInterceptor('files', 10)) // Max 10 fichiers
async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
  const results = [];

  for (const file of files) {
    const validation = this.uploadService.validateImageFile(file);
    if (!validation.valid) {
      results.push({
        filename: file.originalname,
        error: validation.error,
      });
      continue;
    }

    const response = this.uploadService.createUploadResponse(file, 'mobilier');
    results.push(response);
  }

  return results;
}
```

## 5️⃣ Avec validation personnalisée

```typescript
async uploadWithValidation(
  @UploadedFile() file: Express.Multer.File,
) {
  if (!file) {
    throw new BadRequestException('Fichier requis');
  }

  // Validation personnalisée
  if (file.size < 100) {
    throw new BadRequestException('Image trop petite');
  }

  if (!file.filename.includes('.jpg') && !file.filename.includes('.png')) {
    throw new BadRequestException('Format non supporté');
  }

  return this.uploadService.createUploadResponse(file, 'custom-folder');
}
```

## 6️⃣ Récupérer le chemin d'upload

```typescript
// Obtenir le chemin sur le disque
const diskPath = this.uploadService.getUploadPath('mobilier');
// Production: /upload/mobilier
// Local: ./uploads/mobilier

// Obtenir l'URL publique
const publicUrl = this.uploadService.getPublicUrl('file-123.jpg', 'mobilier');
// → /uploads/mobilier/file-123.jpg
```

## 7️⃣ Avec métadonnées

```typescript
@Post('upload-with-metadata')
@UseInterceptors(FileInterceptor('file'))
async uploadWithMetadata(
  @UploadedFile() file: Express.Multer.File,
  @Body() metadata: { agentId: string; propertyId: string },
) {
  const validation = this.uploadService.validateImageFile(file);
  if (!validation.valid) {
    throw new BadRequestException(validation.error);
  }

  const uploadResponse = this.uploadService.createUploadResponse(file, 'mobilier');

  // Sauvegarder avec métadonnées
  await this.fileService.save({
    ...uploadResponse,
    agentId: metadata.agentId,
    propertyId: metadata.propertyId,
  });

  return uploadResponse;
}
```

## 🎯 Structure de dossiers résultante

```
/upload/                    (Disque persistant Render)
├── general/
│   ├── file-123.jpg
│   ├── file-124.png
├── mobilier/
│   ├── file-200.jpg
│   ├── file-201.jpg
├── profiles/
│   ├── file-300.jpg
├── documents/
│   ├── file-400.pdf
└── messages/
    ├── file-500.jpg
```

## 🔗 URLs accessibles

```
/uploads/general/file-123.jpg
/uploads/mobilier/file-200.jpg
/uploads/profiles/file-300.jpg
/uploads/documents/file-400.pdf
/uploads/messages/file-500.jpg
```

## 📊 Performance & Optimisation

```typescript
// Cache headers
@Get('/:filename')
async getFile(@Param('filename') filename: string, @Res() res) {
  res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h cache
  return res.sendFile(filename);
}

// Compression d'images (optionnel)
import * as sharp from 'sharp';

async optimizeImage(file: Express.Multer.File) {
  const optimized = await sharp(file.buffer)
    .resize(1920, 1080, { fit: 'inside' })
    .jpeg({ quality: 80 })
    .toBuffer();
  
  // Sauvegarder l'image optimisée...
}
```

---
**Note**: Tous les uploads vont dans le disque persistant Render `/upload` en production! 🚀
