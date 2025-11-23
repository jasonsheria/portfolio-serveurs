# 🔴 Modules Restants à Refactoriser

## Synthèse: 3 modules oubliés trouvés!

### ✅ Déjà Refactorisés (8 modules)
1. ✅ agent (controller seulement - PARTIELLEMENT)
2. ✅ owner
3. ✅ mobilier
4. ✅ posts
5. ✅ site
6. ✅ users
7. ✅ portfolio
8. ✅ auth

### ❌ À REFACTORISER (3 modules)
1. **upload/upload.controller.ts** - FileInterceptor avec fileFilter custom
2. **template/template.controller.ts** - FilesInterceptor sans validation
3. **agent/agent.controller.ts** - FileInterceptor avec fileFilter (RECOMPLÈTEMENT)

---

## Détail par module

### 1. upload/upload.controller.ts
**Type**: FileInterceptor (2 endpoints)

**Endpoints**:
- `@Post('image')` - Upload image
- `@Post('document')` - Upload document

**Problèmes actuels**:
- Validation inline avec fileFilter au lieu d'utiliser UploadService
- diskStorage implicite (undefined, sera dynamique)
- Pas d'UploadModule

**À faire**:
1. Importer FileInterceptor simple (sans options)
2. Injecter UploadService
3. Utiliser validateImageFile() pour image
4. Utiliser validateDocumentFile() pour document
5. Utiliser createUploadResponse()

**Impact**: -30 lignes

---

### 2. template/template.controller.ts
**Type**: FilesInterceptor (1 endpoint)

**Endpoints**:
- `@Post('create')` - Créer template avec 3 images max

**Problèmes actuels**:
- Pas de validation des fichiers
- Pas d'UploadService
- FilesInterceptor('images', 3) sans config

**À faire**:
1. Importer UploadService
2. Ajouter validation des images (validateImageFiles)
3. Créer réponse standardisée (createBulkUploadResponse)
4. Passer fichiers au service avec infos structurées

**Impact**: +10 lignes de validation

---

### 3. agent/agent.controller.ts (RECOMPLÈTEMENT)
**Type**: FileInterceptor

**Endpoints**:
- `@Post('upload')` - Upload agent image

**Problèmes actuels**:
- Validation inline avec fileFilter
- FileFilter définit du diskStorage implicite
- Validation redondante (on a déjà validateImageFile)

**À faire**:
1. Supprimer FileInterceptor options
2. Utiliser validateImageFile() du UploadService
3. Simplifier le code

**Impact**: -10 lignes

---

## Ordre de refactorisation

1. **agent** (le plus simple, déjà partiellement refactorisé)
2. **upload** (2 endpoints, pattern simple)
3. **template** (nécessite UploadService import)

---

## Modules non-upload vérifiant avoir UploadService

Vérifier que les modules suivants ont bien UploadService:
- [ ] agent.module.ts
- [ ] upload.module.ts
- [ ] template.module.ts
