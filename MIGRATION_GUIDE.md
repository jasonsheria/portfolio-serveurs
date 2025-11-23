# 🚀 Migration Guide - Uploads Persistants

## Avant ❌ vs Après ✅

| Aspect | Avant | Après |
|--------|-------|-------|
| **Stockage** | Éphémère (tmp) | Persistant (/upload) |
| **Redéploiement** | ❌ Fichiers perdus | ✅ Fichiers sauvés |
| **Redémarrage serveur** | ❌ Fichiers perdus | ✅ Fichiers sauvés |
| **Sleep Render** | ❌ Fichiers perdus | ✅ Fichiers sauvés |
| **Scalabilité** | Limité | 10 GB expandable |
| **Réutilisabilité** | Copier-coller | ✅ UploadService |

## 📋 Étapes de migration

### Phase 1: Code Changes (Déjà fait ✅)

```bash
✅ src/main.ts
✅ src/upload/upload.controller.ts
✅ src/upload/upload.service.ts (NOUVEAU)
✅ src/upload/upload.module.ts
✅ render.yaml (NOUVEAU)
```

### Phase 2: Configuration Render

**Durée**: 5 minutes
**Actions sur https://dashboard.render.com**:

1. Aller au service "apiena"
2. Onglet "Storage" → "New Disk"
3. Remplir:
   - **Name**: `upload-storage`
   - **Mount Path**: `/upload` (⚠️ PAS `/uploads`)
   - **Size**: 10 GB
4. Cliquer "Create Disk"

### Phase 3: Déploiement

```bash
# Dans le répertoire apiena
cd apiena

# Commit les changements
git add .
git commit -m "feat: configure persistent uploads with Render disk storage

- Add UploadService for reusable upload logic
- Support both local (/uploads) and production (/upload) paths
- Add render.yaml with disk configuration
- Update main.ts to serve files from /upload in production
- Add comprehensive documentation and examples"

# Push
git push origin main

# Attendre le redéploiement automatique (~2-3 min)
```

### Phase 4: Vérification

```bash
# Via les logs Render (dans dashboard):
# Chercher:
# ✅ "[STATIC] Serving uploads from: /upload"
# ✅ "Server running on port 3000"

# Ou via une requête test:
curl https://apiena.onrender.com/api/upload/image \
  -F "file=@test.jpg"

# Response should show:
# {
#   "url": "/uploads/general/file-TIMESTAMP.jpg",
#   "filename": "file-TIMESTAMP.jpg",
#   ...
# }
```

### Phase 5: Test de persistance

1. **Upload un fichier**
   ```bash
   curl -F "file=@photo.jpg" \
     https://apiena.onrender.com/api/upload/image
   ```

2. **Noter l'URL**: `/uploads/general/file-123456.jpg`

3. **Vérifier l'accès**:
   ```bash
   curl https://apiena.onrender.com/uploads/general/file-123456.jpg
   # Devrait retourner l'image
   ```

4. **Redéployer le code** (git push)

5. **Vérifier que l'URL marche toujours**:
   ```bash
   curl https://apiena.onrender.com/uploads/general/file-123456.jpg
   # ✅ Devrait toujours marcher!
   ```

## 🔄 Migration des anciens fichiers

### Option A: Les laisser (recommandé)
Les anciens fichiers du projet restent dans git. Les nouveaux vont dans `/upload`.

### Option B: Migrer les anciens fichiers
```bash
# Localement, copier uploads/ vers /upload/
# Sur Render, via SSH:

# 1. Connecter en SSH à Render
render login

# 2. Copier les fichiers
cp -r ~/apiena/uploads/* /upload/

# 3. Vérifier
ls -la /upload/
```

## 📦 Utilisation dans les modules existants

### Exemple: Mobilier

**Avant** (copie-collage multer config):
```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file', {
  storage: diskStorage({
    destination: (req, file, cb) => { /* ... */ },
    filename: (req, file, cb) => { /* ... */ },
  }),
  // ... fileFilter, limits
}))
```

**Après** (réutilisable):
```typescript
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule], // ← Ajouter
  // ...
})

@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async upload(@UploadedFile() file) {
  const validation = this.uploadService.validateImageFile(file);
  if (!validation.valid) throw new BadRequestException(validation.error);
  
  return this.uploadService.createUploadResponse(file, 'mobilier');
}
```

## ⚙️ Configuration optionnelle

### 1. Augmenter la taille du disque

```bash
# Sur Render dashboard:
# Storage → Select Disk → Edit Size
# Augmenter à 50 GB ou 100 GB
```

### 2. Ajouter une redirection CDN (optionnel)

```typescript
// Serve images with cache headers
@Get('/:path')
serveFile(@Param('path') path: string, @Res() res) {
  res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 semaine
  res.sendFile(join('/upload', path));
}
```

### 3. Ajouter S3 en fallback (optionnel)

```bash
npm install @aws-sdk/client-s3
```

## 🆘 Dépannage

### Erreur: "EACCES: permission denied"
```
→ Le disque n'est pas attaché correctement
→ Vérifier que Mount Path = /upload (pas /uploads)
→ Redéployer
```

### Erreur: "No space left on device"
```
→ Disque plein (10 GB utilisés)
→ Augmenter la taille via Render dashboard
→ Ou nettoyer les anciens fichiers:
   du -sh /upload/*
```

### Fichiers pas accessibles
```
→ Vérifier app.useStaticAssets() dans main.ts
→ Vérifier que NODE_ENV=production en prod
→ Vérifier les logs Render: "[STATIC] Serving uploads from..."
```

### Après git push, fichiers disparus
```
→ Normal: git ne sauvegarde pas les fichiers persistants
→ Render les garde dans le disque monté
→ La réponse de l'upload retourne l'URL correcte
```

## 📊 Monitoring

```bash
# Vérifier l'utilisation disque (via Render SSH):
df -h /upload
# Utilisé: 2.3 GB / 10 GB

# Voir la taille par dossier:
du -sh /upload/*
# general/: 1.2 GB
# mobilier/: 0.8 GB
# profiles/: 0.3 GB
```

## ✅ Checklist finale

- [ ] Configurer disque Render (Mount Path: `/upload`, Size: 10 GB)
- [ ] Push le code (`git push origin main`)
- [ ] Attendre redéploiement (2-3 min)
- [ ] Vérifier logs Render: `[STATIC] Serving uploads from: /upload`
- [ ] Tester upload: `curl -F "file=@test.jpg" https://apiena.onrender.com/api/upload/image`
- [ ] Vérifier accès au fichier: `curl https://apiena.onrender.com/uploads/general/file-*.jpg`
- [ ] Faire un redéploiement (`git push` un commit vide)
- [ ] Vérifier que le fichier est toujours accessible ✅

---

**Statut**: 🎉 Uploads persistants activés!
**Prochaine étape**: Migrer les autres modules pour utiliser `UploadService`

