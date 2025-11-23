# Configuration Render pour les uploads persistants

## 📋 Problème
Les fichiers uploadés étaient perdus après chaque redéploiement car ils étaient stockés dans le système de fichiers éphémère de Render.

## ✅ Solution implémentée

### 1. **Disque persistant Render**
- ✅ Créer un disque persistant avec:
  - **Mount Path**: `/upload` (Ne PAS utiliser `/` comme root)
  - **Size**: 10 GB (ou plus selon vos besoins)

### 2. **Configuration render.yaml**
```yaml
services:
  - type: web
    name: apiena
    disk:
      name: upload-storage
      mountPath: /upload          # Chemin de montage
      sizeGB: 10
```

### 3. **Code NestJS adapté**

**upload.controller.ts:**
- Utilise `/upload/general` en production (Render)
- Utilise `uploads/general` en local
- Crée les dossiers automatiquement

**main.ts:**
```typescript
const uploadsPath = process.env.NODE_ENV === 'production' ? '/upload' : path.join(process.cwd(), 'uploads');
app.useStaticAssets(uploadsPath, { prefix: '/uploads' });
```

### 4. **Flow des fichiers**

```
Frontend upload → POST /api/upload/image
                 ↓
            upload.controller.ts
                 ↓
        Multer diskStorage (détecte NODE_ENV)
                 ↓
        Production: /upload/general/file-TIMESTAMP.jpg
        Local: uploads/general/file-TIMESTAMP.jpg
                 ↓
        Response: { url: '/uploads/general/file-TIMESTAMP.jpg' }
                 ↓
        app.useStaticAssets('/upload' ou 'uploads')
                 ↓
        Fichier accessible via: http://domain.com/uploads/general/file-TIMESTAMP.jpg
```

## 🚀 Déploiement Render

### Étape 1: Connecter le disque
1. Aller sur https://dashboard.render.com
2. Sélectionner le service "apiena"
3. Aller à "Storage" → "New Disk"
4. Configurer:
   - **Name**: `upload-storage`
   - **Mount Path**: `/upload`
   - **Size**: 10 GB

### Étape 2: Push le code
```bash
git add .
git commit -m "Configure persistent storage for uploads"
git push origin main
```

### Étape 3: Vérifier le déploiement
- Render redéployera automatiquement
- Les fichiers uploadés avant persisteront
- Après redéploiement, les nouveaux uploads vont dans `/upload`

## 📱 Autres options alternatives

### Option A: Amazon S3
```bash
npm install aws-sdk
```
Avantages:
- Scalabilité illimitée
- Backup automatique
- CDN intégré

### Option B: Cloudinary
```bash
npm install cloudinary
```
Avantages:
- Upload simple
- Optimisation d'images automatique
- Transformation en temps réel

### Option C: Digital Ocean Spaces
```bash
npm install aws-sdk
```
Avantages:
- Moins cher que S3
- Bon pour images/fichiers

## 🔍 Vérifier que ça marche

### En local:
```bash
npm start
# Upload via http://localhost:5000/api/upload/image
# Fichier sauvegardé: uploads/general/file-*.jpg
```

### En production (Render):
```bash
curl -F "file=@image.jpg" https://apiena.onrender.com/api/upload/image
# Response: { "url": "/uploads/general/file-TIMESTAMP.jpg" }
# Accessible via: https://apiena.onrender.com/uploads/general/file-TIMESTAMP.jpg
```

## ⚠️ Problèmes possibles

**Erreur: "No space left on device"**
→ Disque plein, augmenter la taille via Render dashboard

**Fichiers ne persiste pas après redéploiement**
→ Vérifier que le Mount Path est `/upload` (pas `/uploads`)
→ Vérifier que NODE_ENV=production en produit

**Fichiers accessibles avant upload**
→ Les images retournent une URL MAIS il faut que `app.useStaticAssets` soit configuré

## 📊 Monitoring

Vérifier l'espace disque:
```bash
# Connecter en SSH sur Render et lancer:
df -h /upload
du -sh /upload
```

## ✨ Prochaines étapes recommandées

1. ✅ Tester l'upload localement
2. ✅ Push sur git et vérifier Render redéploie
3. ⏳ Uploader un fichier en production
4. ⏳ Vérifier qu'il persiste après redéploiement
5. ⏳ (Optionnel) Passer à S3/Cloudinary si besoin de scalabilité

---
**Configuration terminée!** 🎉
