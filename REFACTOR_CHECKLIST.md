# ✅ Checklist Refactorisation - UploadService Integration

## Modules à refactoriser (9 total)

### ✅ TERMINÉ (1/9)
- [x] **agent.module.ts** + agent.controller.ts
  - Lignes supprimées: ~40
  - Status: ✅ Import UploadModule + Refactor controller

### ⏳ PRIORITÉ HAUTE (4 modules)

- [ ] **owner.module.ts** + owner.controller.ts
  - Type: FileFieldsInterceptor (3 champs)
  - Fichiers: idFile, propertyTitle, profile
  - Complexité: Moyenne (validation différente par type)
  - TODO: Ajouter UploadModule à imports

- [ ] **mobilier.module.ts** + mobilier.controller.ts
  - Type: FileFieldsInterceptor (3 champs)
  - Fichiers: images, videos, documents
  - Complexité: Haute (3 types différents à valider)
  - TODO: Ajouter UploadModule à imports

- [ ] **posts.module.ts** + posts.controller.ts
  - Type: FileFieldsInterceptor (2+ champs)
  - Complexité: Moyenne
  - TODO: Ajouter UploadModule à imports

- [ ] **site.module.ts** + site.controller.ts
  - Type: FileInterceptor (1 champ)
  - Complexité: Basse
  - TODO: Ajouter UploadModule à imports

### ⏳ PRIORITÉ MOYENNE (3 modules)

- [ ] **users.module.ts** + users.controller.ts
  - Type: FileInterceptor (1 champ - profileFile)
  - Complexité: Basse
  - Remarque: users.service.ts a aussi du code multer
  - TODO: Ajouter UploadModule à imports

- [ ] **portfolio.module.ts** + portfolio.controller.ts
  - Type: FileInterceptor (1 champ)
  - Complexité: Basse
  - TODO: Ajouter UploadModule à imports

- [ ] **auth.module.ts** + auth.controller.ts
  - Type: FileInterceptor + FileFieldsInterceptor
  - Complexité: Moyenne (registrations avec 7 fichiers optionnels)
  - TODO: Ajouter UploadModule à imports

### ⏳ CONFIGS À NETTOYER (3 fichiers)

- [ ] **auth/utils/upload.config.ts**
  - Status: Remplacer par UploadService
  - TODO: Supprimer après refactor auth.controller

- [ ] **chat/utils/upload.config.ts**
  - Status: Remplacer par UploadService
  - TODO: Supprimer après refactor

- [ ] **messages/utils/file.config.ts**
  - Status: Remplacer par UploadService
  - TODO: Supprimer après refactor

---

## Étapes par module

### Template pour chaque refactorisation

#### Étape 1: Ajouter UploadModule aux imports
```typescript
// src/[module]/[module].module.ts
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([...]),
    UploadModule, // ← AJOUTER
  ],
})
```

#### Étape 2: Injecter UploadService dans controller
```typescript
constructor(
  private readonly [service]Service: [Service],
  private readonly uploadService: UploadService, // ← AJOUTER
) {}
```

#### Étape 3: Refactoriser le endpoint @Post('upload')
**Avant**: diskStorage + fileFilter + limits = 30+ lignes
**Après**: Utiliser UploadService = 5-10 lignes

#### Étape 4: Tester localement
```bash
npm run start:dev
curl -F "file=@test.jpg" http://localhost:5000/api/[module]/upload
```

#### Étape 5: Commit par module
```bash
git add src/[module]/
git commit -m "refactor: migrate [module] to UploadService

- Remove diskStorage configuration from controller
- Centralize validation and response formatting
- Add UploadModule import to module
- Reduce duplicated code by ~40 lines"
```

---

## Dépendances de refactorisation

```
UploadModule ✅ FAIT
    ↓
    ├─ agent ✅ FAIT
    ├─ owner ← Peut être fait
    ├─ mobilier ← Peut être fait
    ├─ posts ← Peut être fait
    ├─ site ← Peut être fait
    ├─ users ← Peut être fait
    ├─ portfolio ← Peut être fait
    ├─ auth ← Peut être fait
    └─ chat/messages ← Utilitaire, pas controller
```

**Note**: Aucune dépendance externe, peut être fait dans n'importe quel ordre!

---

## Gains attendus par module

| Module | Avant | Après | Gain |
|--------|-------|-------|------|
| agent | 40 lignes | 5 lignes | -87% |
| owner | 60 lignes | 15 lignes | -75% |
| mobilier | 70 lignes | 20 lignes | -71% |
| posts | 50 lignes | 15 lignes | -70% |
| site | 40 lignes | 10 lignes | -75% |
| users | 35 lignes | 8 lignes | -77% |
| portfolio | 35 lignes | 8 lignes | -77% |
| auth | 80 lignes | 25 lignes | -69% |
| **TOTAL** | **410 lignes** | **106 lignes** | **-74%** |

**Résultat final**: 300+ lignes de code éliminées! 🎉

---

## Commandes utiles

### Tester all uploads localement
```bash
cd apiena
npm run start:dev

# Dans un autre terminal:
curl -F "file=@photo.jpg" http://localhost:5000/api/upload/image
curl -F "file=@photo.jpg" http://localhost:5000/api/agents/upload
# ... autres
```

### Afficher les fichiers uploadés
```bash
ls -la uploads/general/
ls -la uploads/agents/
ls -la uploads/mobilier/
# ... autres
```

### Cleanup après refactorisation
```bash
# Supprimer les fichiers utils remplacés
rm src/auth/utils/upload.config.ts
rm src/chat/utils/upload.config.ts
rm src/messages/utils/file.config.ts

# Commit
git add .
git commit -m "cleanup: remove obsolete multer configs after UploadService migration"
```

---

## Validation finale

- [ ] Tous les modules importent UploadModule
- [ ] Aucun `diskStorage` direct dans les controllers
- [ ] Toutes les validations utilisent UploadService
- [ ] Réponses standardisées (url, filename, size, mimetype, uploadedAt)
- [ ] Tests locaux passent
- [ ] Render deployment fonctionne avec `/upload`

---

## Notes importantes

⚠️ **FileFieldsInterceptor vs FileInterceptor**:
- FileInterceptor: 1 champ → `@UploadedFile()`
- FileFieldsInterceptor: N champs → `@UploadedFiles()`

⚠️ **Validation custom dans fileFilter**:
- Peut rester pour faire du fast-fail
- Mais also valider dans le handler pour messages clairs

⚠️ **Chemins persistants**:
- S'assurer que `NODE_ENV=production` sur Render
- Sinon utilise le chemin local par défaut

---

**Statut**: 1/9 modules refactorisés ✅
**Priorité suivante**: owner.module.ts
