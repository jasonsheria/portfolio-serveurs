# 🔍 Guide: Vérifier le Mode Production

## 3 Méthodes Pour Vérifier

### Méthode 1: Vérifier Localement

#### Sur Windows PowerShell
```powershell
# Afficher NODE_ENV
echo $env:NODE_ENV

# Définir production localement (test)
$env:NODE_ENV = "production"
echo $env:NODE_ENV  # Devrait afficher: production

# Ou lancer le serveur en production
$env:NODE_ENV = "production"; npm run start:prod
```

#### Sur Mac/Linux
```bash
# Afficher NODE_ENV
echo $NODE_ENV

# Définir production
export NODE_ENV=production
echo $NODE_ENV  # Devrait afficher: production

# Lancer en production
NODE_ENV=production npm run start:prod
```

---

### Méthode 2: Vérifier sur Render.com

1. **Aller sur le dashboard Render**:
   - https://dashboard.render.com
   - Sélectionner votre service "apiena"

2. **Onglet "Environment"**:
   - Vérifier la variable `NODE_ENV = production`

3. **Onglet "Logs"**:
   - Chercher le message au démarrage:
   ```
   [STATIC] Serving uploads from: /upload
   ```
   - Si vous voyez `/upload` → **Mode Production ✅**
   - Si vous voyez `./uploads` → **Mode Développement ❌**

---

### Méthode 3: Vérifier via les Logs du Serveur

#### En Développement Local
```bash
npm run start:dev

# Les logs afficheront:
# [STATIC] Serving uploads from: ./uploads
# Server running on port 3000
```

#### En Production (Render)
```
# Logs Render montreront:
# [STATIC] Serving uploads from: /upload
# Server running on port 3000
```

---

### Méthode 4: Endpoint de Diagnostic (À AJOUTER)

Créer un endpoint pour vérifier l'environnement:

```typescript
// Dans src/app.controller.ts

@Get('health')
getHealth() {
  return {
    status: 'ok',
    environment: process.env.NODE_ENV,
    uploadsPath: process.env.NODE_ENV === 'production' ? '/upload' : './uploads',
    timestamp: new Date().toISOString(),
  };
}
```

**Utilisation**:
```bash
# Localement
curl http://localhost:3000/api/health
# {"status":"ok","environment":"development","uploadsPath":"./uploads"}

# En production
curl https://votre-app.onrender.com/api/health
# {"status":"ok","environment":"production","uploadsPath":"/upload"}
```

---

## ✅ Checklist: Production Ready

### Avant de Déployer

- [ ] `NODE_ENV` défini dans render.yaml
- [ ] Disque persistant configuré (`/upload` mountPath)
- [ ] main.ts utilise chemin correct (`/upload` en production)
- [ ] Logs affichent "[STATIC] Serving uploads from: /upload"
- [ ] UploadService stocke fichiers dans `/upload/...`

### Après Redéploiement

- [ ] Accéder à Render dashboard
- [ ] Vérifier les logs
- [ ] Chercher "[STATIC] Serving uploads from: /upload"
- [ ] Upload un fichier de test
- [ ] Vérifier que l'URL `/uploads/general/...` est accessible
- [ ] Redéployer à nouveau (git push)
- [ ] Vérifier que le fichier test est TOUJOURS accessible

---

## 📊 Vérification Rapide

### Script de Test Complet

```bash
#!/bin/bash

# 1. Vérifier localement
echo "=== LOCAL CHECK ==="
NODE_ENV=production npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Build production OK"
else
  echo "❌ Build production FAILED"
  exit 1
fi

# 2. Afficher la configuration
echo ""
echo "=== CONFIGURATION ==="
echo "Node version: $(node -v)"
echo "npm version: $(npm -v)"

# 3. Vérifier render.yaml
echo ""
echo "=== RENDER CONFIG ==="
grep -A 3 "disk:" render.yaml

# 4. Vérifier main.ts
echo ""
echo "=== MAIN.TS CHECK ==="
grep "NODE_ENV === 'production'" src/main.ts

# 5. Upload de test (une fois déployé)
echo ""
echo "=== TEST ENDPOINT (après déploiement) ==="
echo "curl https://votre-app.onrender.com/api/health"
```

---

## 🚨 Signes que Vous êtes en Production

✅ **En Production**:
- Logs affichent: `[STATIC] Serving uploads from: /upload`
- Variable `NODE_ENV = production`
- URL est `https://votre-app.onrender.com` (pas localhost)
- Fichiers stockés dans `/upload/agents/`, `/upload/posts/`, etc.
- Fichiers persistent après redéploiement

❌ **En Développement**:
- Logs affichent: `[STATIC] Serving uploads from: ./uploads`
- URL est `http://localhost:3000`
- Variable `NODE_ENV = development` (ou vide)
- Fichiers stockés dans `./uploads/`

---

## 🔐 Vérification Finale Avant Git Push

```powershell
# 1. Build local
npm run build

# 2. Vérifier les logs de compilation
# Chercher: "Successfully compiled X files"

# 3. Vérifier render.yaml
type render.yaml | Select-String "disk:" -A 3

# 4. Vérifier main.ts pour production check
type src/main.ts | Select-String "NODE_ENV === 'production'"

# 5. Git check
git status

# 6. Commit et push
git add .
git commit -m "refactor: UploadService production ready"
git push origin main

# 7. Attendre redéploiement (2-3 minutes)
# Vérifier les logs Render pour: "[STATIC] Serving uploads from: /upload"
```

---

## 📝 Render.yaml - Configuration Actuelle

```yaml
services:
  - type: web
    name: apiena
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm run start:prod
    plan: standard
    envVars:
      - key: NODE_ENV
        value: production        # ← CLÉS
      - key: PORT
        value: 3000
    disk:
      name: upload-storage
      mountPath: /upload        # ← CLÉS
      sizeGB: 10
```

✅ **Vérifiez**:
- `NODE_ENV: production` → ✅ Configuré
- `mountPath: /upload` → ✅ Configuré
- `startCommand: npm run start:prod` → ✅ Production mode

---

## 🎯 Résumé

**Pour vérifier que vous êtes en production**:

1. **Localement**: `echo $env:NODE_ENV` → doit voir "production" après déploiement
2. **Render dashboard**: Onglet "Environment" → `NODE_ENV = production`
3. **Logs Render**: Chercher `[STATIC] Serving uploads from: /upload`
4. **Test endpoint**: `curl https://votre-app.onrender.com/api/health` → `"environment":"production"`

**Si tout est ✅, vos fichiers seront permanents!** 🔐

---

**Generated**: 24/11/2025
