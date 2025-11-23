# 🚀 Quick Deployment Guide - Uploads Persistants

## Le problème résolu
✅ Les uploads restent maintenant sauvegardés même après:
- Redéploiement du code
- Redémarrage du serveur
- Sleep/Wake du serveur Render
- Changements git

## 📊 Architecture

```
                Frontend (portfolio/ndaku)
                        ↓
                        ↓
        POST /api/upload/image (FormData)
                        ↓
        NestJS UploadController
                        ↓
        Multer + UploadService (détecte NODE_ENV)
                        ↓
        Production: /upload/general/file-*.jpg (PERSISTANT ✅)
        Local: uploads/general/file-*.jpg
                        ↓
        Servir via app.useStaticAssets('/upload' ou 'uploads')
                        ↓
        URL: /uploads/general/file-*.jpg
                        ↓
        Accessible aux clients indéfiniment ✅
```

## 🔧 Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `src/main.ts` | ✅ Ajout support `/upload` pour production |
| `src/upload/upload.controller.ts` | ✅ Utilise UploadService |
| `src/upload/upload.service.ts` | ✅ NOUVEAU - Logique réutilisable |
| `src/upload/upload.module.ts` | ✅ Export UploadService |
| `render.yaml` | ✅ NOUVEAU - Config disque Render |
| `RENDER_SETUP.md` | 📖 Documentation complète |

## 📋 Checklist de déploiement

### 1️⃣ **Sur Render Dashboard**
- [ ] Aller à https://dashboard.render.com
- [ ] Sélectionner le service "apiena"
- [ ] Aller à l'onglet "Storage"
- [ ] Créer un nouveau disque:
  - Name: `upload-storage`
  - Mount Path: `/upload`
  - Size: 10 GB (ou plus)

### 2️⃣ **Push le code**
```bash
cd apiena
git add .
git commit -m "feat: configure persistent uploads with Render disk storage"
git push origin main
```

### 3️⃣ **Attendre le redéploiement**
- Render détectera le push
- Redéploiera automatiquement
- Attachera le disque au service

### 4️⃣ **Vérifier le déploiement**
```bash
# Via terminal Render ou logs
curl https://apiena.onrender.com/api/health
# ou uploads un fichier test
```

## ✨ Nouvelles fonctionnalités

### Upload Image
```bash
curl -F "file=@photo.jpg" \
  https://apiena.onrender.com/api/upload/image

# Response:
{
  "url": "/uploads/general/file-1700000000000-123456789.jpg",
  "filename": "file-1700000000000-123456789.jpg",
  "size": 245678,
  "mimetype": "image/jpeg",
  "uploadedAt": "2024-11-23T10:30:00Z"
}
```

### Upload Document
```bash
curl -F "file=@contract.pdf" \
  https://apiena.onrender.com/api/upload/document

# Response:
{
  "url": "/uploads/documents/file-1700000000000-123456789.pdf",
  "filename": "file-1700000000000-123456789.pdf",
  "size": 512000,
  "mimetype": "application/pdf",
  "uploadedAt": "2024-11-23T10:30:00Z"
}
```

## 🎯 Accès aux fichiers

Une fois le fichier uploadé, il sera accessible via:

```
Local: http://localhost:5000/uploads/general/file-*.jpg
Production: https://apiena.onrender.com/uploads/general/file-*.jpg
```

Exemple React (frontend):
```jsx
const [uploadedUrl, setUploadedUrl] = useState('');

const handleUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post(
    `${process.env.REACT_APP_BACKEND_APP_URL}/api/upload/image`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  
  setUploadedUrl(response.data.url);
  // URL persiste indéfiniment! ✅
};

return <img src={uploadedUrl} />;
```

## 🔒 Sécurité

### Validations
- ✅ Type MIME vérifié (whitelist)
- ✅ Taille maximale appliquée
- ✅ Noms de fichiers uniques (pas d'overwrite)

### À ajouter (optionnel):
```typescript
// Authentification
@UseGuards(JwtAuthGuard)
@Post('image')

// Rate limiting
@UseGuards(RateLimitGuard)
```

## 🆘 Troubleshooting

### Erreur: "No space left on device"
```bash
# Sur Render dashboard, augmenter la taille du disque
# Ou vérifier l'utilisation:
df -h /upload
```

### Fichiers ne persiste pas
```bash
# Vérifier NODE_ENV en production
echo $NODE_ENV  # Doit être 'production'

# Vérifier le Mount Path sur Render = /upload (pas /uploads)
```

### Fichiers accessibles avant upload
```bash
# Vérifier app.useStaticAssets() dans main.ts
# La ligne `prefix: '/uploads'` doit correspondre à l'URL
```

## 📈 Scalabilité future

Si tu dépasses 10 GB, options:

### Option 1: Augmenter le disque Render
- Simple, rapide
- Coûte plus cher

### Option 2: S3 / CloudStorage
```bash
npm install @aws-sdk/client-s3
```

### Option 3: Cloudinary
```bash
npm install cloudinary
```

## 📞 Support

Fichiers de référence:
- 📖 `RENDER_SETUP.md` - Documentation complète
- 🔧 `src/upload/upload.service.ts` - Logique réutilisable
- 🎯 `src/main.ts` - Configuration NestJS

---
**Status**: ✅ Uploads persistants configurés!
**Prochaine étape**: Pusher le code et tester en production
