# 🧪 Guide de Test - Refactorisation UploadService

## Avant de committer, valider que le code compile

```bash
cd apiena
npm run build
```

Aucune erreur TypeScript ne devrait apparaître.

---

## Tests manuels par module

### 1️⃣ Agent Upload Test
```bash
# Test: Upload image valide pour agent
curl -X POST http://localhost:3000/api/agent/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-image.jpg"

# Réponse attendue:
# {
#   "url": "/uploads/agents/...",
#   "filename": "...",
#   "size": 12345,
#   "mimetype": "image/jpeg",
#   "uploadedAt": "2025-11-24T..."
# }
```

### 2️⃣ Owner Create Test (FileFieldsInterceptor)
```bash
# Test: Créer owner avec documents
curl -X POST http://localhost:3000/api/owner/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "idFile=@id.pdf" \
  -F "propertyTitle=@title1.png" \
  -F "propertyTitle=@title2.png" \
  -F "profile=@photo.jpg" \
  -F "meta={\"form\":{\"email\":\"test@example.com\",\"address\":\"...\"}, \"types\":[\"Maison\"]}"

# Devrait créer le owner avec les fichiers uploadés
```

### 3️⃣ Mobilier Create Test (3 types de fichiers)
```bash
# Test: Créer mobilier avec images, vidéos et documents
curl -X POST http://localhost:3000/api/mobilier \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.jpg" \
  -F "videos=@video.mp4" \
  -F "documents=@spec.pdf" \
  -F "data={\"name\":\"Mobilier Test\",\"prix\":500}"

# Devrait créer le mobilier avec tous les fichiers
```

### 4️⃣ Posts Create Test
```bash
curl -X POST http://localhost:3000/api/posts/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "media=@image1.jpg" \
  -F "media=@image2.jpg" \
  -F "postData={\"siteId\":\"...\",\"title\":\"Test\"}"

# Devrait créer le post avec les médias
```

### 5️⃣ Site Upload Test
```bash
curl -X POST http://localhost:3000/api/site/save \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "service_image=@service.jpg" \
  -F "body={\"name\":\"Mon Service\"}"

# Devrait créer/mettre à jour le site avec l'image
```

### 6️⃣ Users Profile Update Test
```bash
curl -X PUT http://localhost:3000/api/users/profile/USER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "profileFile=@avatar.jpg" \
  -F "updateData={\"name\":\"Nouveau Nom\"}"

# Devrait mettre à jour le profil avec la nouvelle image
```

### 7️⃣ Portfolio Upload Test
```bash
curl -X POST http://localhost:3000/api/portfolio/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@portfolio-image.jpg"

# Devrait uploader l'image de portfolio
```

### 8️⃣ Auth Register Test
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: multipart/form-data" \
  -F "profileImage=@profile.jpg" \
  -F "registerDto={\"email\":\"newuser@example.com\",\"password\":\"Password123!\"}"

# Devrait créer l'utilisateur avec la photo de profil
```

### 9️⃣ Auth Update Profile Test
```bash
curl -X PATCH http://localhost:3000/api/auth/update-profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "profileImage1=@photo1.jpg" \
  -F "profileImage2=@photo2.jpg" \
  -F "cvFile=@cv.pdf" \
  -F "logoFile=@logo.png" \
  -F "updateUserDto={\"firstName\":\"Jean\"}"

# Devrait mettre à jour le profil avec tous les fichiers
```

---

## Tests de validation (Erreurs attendues)

### ❌ Test: Fichier manquant
```bash
curl -X POST http://localhost:3000/api/agent/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Réponse attendue: BadRequestException "Aucun fichier reçu"
```

### ❌ Test: Mauvais type MIME
```bash
curl -X POST http://localhost:3000/api/agent/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@document.pdf"

# Réponse attendue: BadRequestException "Seules les images sont autorisées"
```

### ❌ Test: Fichier trop volumineux
```bash
# Créer un fichier > 5MB
dd if=/dev/zero of=large-file.jpg bs=1M count=10

curl -X POST http://localhost:3000/api/agent/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@large-file.jpg"

# Réponse attendue: BadRequestException sur taille
```

### ❌ Test: Sans authentification
```bash
curl -X POST http://localhost:3000/api/agent/upload \
  -F "file=@test.jpg"

# Réponse attendue: Unauthorized 401
```

---

## Tests d'intégration (Postman / Thunder Client)

### Créer une collection Postman:

```json
{
  "name": "UploadService Tests",
  "item": [
    {
      "name": "Agent Upload Valid",
      "request": {
        "method": "POST",
        "url": "{{host}}/api/agent/upload",
        "header": [
          {"key": "Authorization", "value": "Bearer {{jwt_token}}"}
        ],
        "body": {
          "mode": "formdata",
          "formdata": [
            {"key": "file", "value": "...", "type": "file"}
          ]
        }
      },
      "tests": [
        "pm.test('Status is 200', () => pm.response.code === 200)",
        "pm.test('Response has url', () => pm.response.json().url !== undefined)",
        "pm.test('URL contains /uploads/agents', () => pm.response.json().url.includes('/uploads/agents'))"
      ]
    },
    // ... autres tests ...
  ]
}
```

---

## Tests d'environnement

### Test Local vs Production

#### Local (npm run start:dev)
```bash
# Fichiers doivent être stockés dans ./uploads/
ls -la uploads/agents/
# Devrait voir les fichiers

# Access via:
curl http://localhost:3000/uploads/agents/filename.jpg
# Devrait retourner l'image
```

#### Production (Render)
```bash
# Fichiers sur disque persistant /upload/
# Access via:
curl https://votre-app.onrender.com/uploads/agents/filename.jpg
# Devrait retourner l'image

# Après redéploiement:
git push origin main
# Attendre le redéploiement Render
curl https://votre-app.onrender.com/uploads/agents/filename.jpg
# Devrait TOUJOURS retourner l'image (pas perdu!)
```

---

## Logs à vérifier

### En développement (npm run start:dev)
```
[STATIC] Serving uploads from: ./uploads
```

### En production
```
[STATIC] Serving uploads from: /upload
```

---

## Scénarios complets de test

### Scénario 1: Création complète Owner
```bash
# 1. Register user
curl -X POST http://localhost:3000/api/auth/register \
  -F "profileImage=@profile.jpg" \
  -F 'registerDto={"email":"owner@test.com","password":"Test123!"}'

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -d '{"email":"owner@test.com","password":"Test123!"}'
# Récupérer le JWT

# 3. Create owner avec documents
curl -X POST http://localhost:3000/api/owner/create \
  -H "Authorization: Bearer JWT_TOKEN" \
  -F "idFile=@id.pdf" \
  -F "propertyTitle=@title.jpg" \
  -F "profile=@owner-photo.jpg" \
  -F 'meta={"form":{"email":"owner@example.com","address":"123 Rue Test"},"types":["Maison"]}'

# Vérifier que l'owner a été créé avec les fichiers
curl -X GET "http://localhost:3000/api/owner/:ownerID" \
  -H "Authorization: Bearer JWT_TOKEN"
```

### Scénario 2: Upload persistance (avant/après redéploiement)
```bash
# 1. Upload fichier
curl -X POST http://localhost:3000/api/mobilier \
  -H "Authorization: Bearer JWT_TOKEN" \
  -F "images=@test.jpg" \
  -F 'data={"name":"Test"}'

# 2. Récupérer l'URL
UPLOAD_URL=$(curl -s http://localhost:3000/api/mobilier/1 | jq '.images[0]')

# 3. Vérifier l'accès
curl $UPLOAD_URL
# Devrait retourner l'image

# 4. (Production) Trigger redéploiement:
git push origin main

# 5. Attendre le redéploiement Render

# 6. Vérifier l'accès APRÈS redéploiement:
curl $UPLOAD_URL
# Devrait TOUJOURS retourner l'image ✅
```

---

## Validation des réponses

Toutes les réponses doivent avoir ce format:
```json
{
  "url": "/uploads/folder/filename",
  "filename": "filename",
  "size": 12345,
  "mimetype": "image/jpeg",
  "uploadedAt": "2025-11-24T10:30:00Z"
}
```

Pour les multi-uploads:
```json
[
  {"url": "...", "filename": "...", "size": 123, "mimetype": "...", "uploadedAt": "..."},
  {"url": "...", "filename": "...", "size": 456, "mimetype": "...", "uploadedAt": "..."}
]
```

---

## Checklist finale avant production

- [ ] `npm run build` sans erreur
- [ ] `npm run test` passe
- [ ] Agent upload fonctionne (valide + invalide)
- [ ] Owner create avec 3 types de fichiers fonctionne
- [ ] Mobilier create avec images/vidéos/documents fonctionne
- [ ] Posts create avec multiples médias fonctionne
- [ ] Site save avec image fonctionne
- [ ] Users profile update avec image fonctionne
- [ ] Portfolio upload fonctionne
- [ ] Auth register avec profil fonctionne
- [ ] Auth update-profile avec 7 fichiers fonctionne
- [ ] Validation de fichiers invalides retourne erreur
- [ ] Réponses au format standard
- [ ] Fichiers accessibles via /uploads/
- [ ] (Production) Fichiers persistent après redéploiement

---

## 🎉 Tous les tests passent?

Alors le refactorisation est **VALIDÉE** et prête pour production! 🚀

Exécuter:
```bash
git push origin main
```

Et vérifier que Render redéploie sans erreur.
