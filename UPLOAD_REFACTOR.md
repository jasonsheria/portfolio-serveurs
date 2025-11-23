# ⚡ Refactorisation rapide - FileFieldsInterceptor

## Exemple 1: agent.controller.ts ✅ DÉJÀ FAIT

**Avant**:
```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file', {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join('/uploads', 'agents');
      // ... créer dossier
    },
    filename: (req, file, cb) => {
      // ... générer nom unique
    },
  }),
}))
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  return { url: `/uploads/agents/${file.filename}` };
}
```

**Après**:
```typescript
constructor(
  private readonly agentService: AgentService,
  private readonly uploadService: UploadService, // ← NEW
) {}

@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  const validation = this.uploadService.validateImageFile(file);
  if (!validation.valid) throw new BadRequestException(validation.error);
  return this.uploadService.createUploadResponse(file, 'agents');
}
```

**Gain**:
- 30+ lignes de code supprimées
- Validation centralisée
- Chemin persistant automatique
- Réponse standardisée

---

## Exemple 2: owner.controller.ts - FileFieldsInterceptor

**Avant** (problème):
```typescript
@UseInterceptors(FileFieldsInterceptor([
  { name: 'idFile', maxCount: 1 },
  { name: 'propertyTitle', maxCount: 10 },
  { name: 'profile', maxCount: 3 }
], {
  storage: diskStorage({
    destination: (req, file, cb) => {
      // 30 lignes de gestion de dossiers
    },
    filename: (req, file, cb) => {
      // génération de noms
    }
  }),
  fileFilter: (req, file, cb) => {
    // validation complexe
  },
}))
async create(
  @UploadedFiles() files: UploadedOwnerFiles,
  @Body('meta') metaString: string,
  @Req() req: RequestWithUser
) {
  // ... traitement
}
```

**Après** (avec UploadService):
```typescript
constructor(
  private readonly ownerService: OwnerService,
  private readonly uploadService: UploadService, // ← NEW
) {}

@UseInterceptors(FileFieldsInterceptor([
  { name: 'idFile', maxCount: 1 },
  { name: 'propertyTitle', maxCount: 10 },
  { name: 'profile', maxCount: 3 }
], {
  storage: this.uploadService.getMulterFieldsConfig([
    { name: 'idFile', folder: 'owners/documents', maxCount: 1 },
    { name: 'propertyTitle', folder: 'owners/documents', maxCount: 10 },
    { name: 'profile', folder: 'owners/profiles', maxCount: 3 },
  ]),
  fileFilter: (req, file, cb) => {
    const validation = this.uploadService.validateDocumentFile(file, 10);
    if (!validation.valid) {
      return cb(new Error(validation.error), false);
    }
    cb(null, true);
  },
}))
async create(
  @UploadedFiles() files: UploadedOwnerFiles,
  @Body('meta') metaString: string,
  @Req() req: RequestWithUser
) {
  // Valider tous les fichiers
  if (files.idFile) {
    const validation = this.uploadService.validateDocumentFile(files.idFile[0]);
    if (!validation.valid) throw new BadRequestException(validation.error);
  }

  // Créer des réponses pour chaque field
  const uploadedFiles = {
    idFile: files.idFile ? this.uploadService.createUploadResponse(files.idFile[0], 'owners/documents') : null,
    propertyTitle: files.propertyTitle ? this.uploadService.createBulkUploadResponse(files.propertyTitle, 'owners/documents') : null,
    profile: files.profile ? this.uploadService.createBulkUploadResponse(files.profile, 'owners/profiles') : null,
  };

  // ... rest du code
}
```

---

## Exemple 3: mobilier.controller.ts - Multiple fields et types

**Pattern**:
```typescript
@UseInterceptors(FileFieldsInterceptor([
  { name: 'images', maxCount: 10 },
  { name: 'videos', maxCount: 5 },
  { name: 'documents', maxCount: 3 }
], {
  storage: this.uploadService.getMulterFieldsConfig([
    { name: 'images', folder: 'mobilier/images', maxCount: 10 },
    { name: 'videos', folder: 'mobilier/videos', maxCount: 5 },
    { name: 'documents', folder: 'mobilier/docs', maxCount: 3 },
  ]),
  fileFilter: (req, file, cb) => {
    // Valider par type de champ
    if (file.fieldname === 'images') {
      const validation = this.uploadService.validateImageFile(file);
      if (!validation.valid) return cb(new Error(validation.error), false);
    } else if (file.fieldname === 'documents') {
      const validation = this.uploadService.validateDocumentFile(file);
      if (!validation.valid) return cb(new Error(validation.error), false);
    }
    cb(null, true);
  },
}))
async addMedias(
  @UploadedFiles() files: any,
  @Param('id') id: string,
) {
  // Traiter les fichiers
  if (files.images) {
    const images = this.uploadService.createBulkUploadResponse(files.images, 'mobilier/images');
    // ... sauvegarder en DB
  }

  if (files.videos) {
    const videos = this.uploadService.createBulkUploadResponse(files.videos, 'mobilier/videos');
    // ... sauvegarder en DB
  }

  if (files.documents) {
    const docs = this.uploadService.createBulkUploadResponse(files.documents, 'mobilier/docs');
    // ... sauvegarder en DB
  }

  return { success: true };
}
```

---

## Intégration rapide - 5 modules prioritaires

### 1️⃣ agent.module.ts - ✅ DÉJÀ FAIT

```typescript
imports: [
  MongooseModule.forFeature([...]),
  UploadModule,
],
```

### 2️⃣ owner.module.ts

```typescript
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([...]),
    UploadModule, // ← Ajouter
  ],
})
```

### 3️⃣ mobilier.module.ts

```typescript
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([...]),
    UploadModule, // ← Ajouter
  ],
})
```

### 4️⃣ posts.module.ts

```typescript
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([...]),
    UploadModule, // ← Ajouter
  ],
})
```

### 5️⃣ site.module.ts

```typescript
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([...]),
    UploadModule, // ← Ajouter
  ],
})
```

---

## Avantages de la refactorisation

| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| **Lignes de config Multer** | 50+ par module | 0-2 par module | -48 lignes |
| **Code dupliqué** | 8+ fois (copy-paste) | 1 fois (UploadService) | 100% réduction |
| **Erreurs possibles** | Validations différentes par module | Uniforme | Stabilité ✅ |
| **Maintenance** | Changer 8+ fichiers | Changer 1 fichier (UploadService) | 8x plus rapide |
| **Tests** | Tester chaque module | Tester UploadService | 1 seul point test |

---

## Prochaines étapes

1. ✅ agent.module + agent.controller (DÉJÀ FAIT)
2. ⏳ owner.module + owner.controller
3. ⏳ mobilier.module + mobilier.controller
4. ⏳ posts.module + posts.controller
5. ⏳ site.module + site.controller

Voir `REFACTOR_CHECKLIST.md` pour la liste complète!
