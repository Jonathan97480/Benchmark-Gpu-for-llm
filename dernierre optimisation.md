# Dernierre optimisation

## 🔴 Problèmes majeurs

- [x] Refactoriser `src/utils/calculator.js` qui agit comme un God File.
- [x] Découper le calculateur en modules dédiés :
  - `src/utils/calculator/memory.js`
  - `src/utils/calculator/calibration.js`
  - `src/utils/calculator/penalties.js`
  - `src/utils/calculator/multiGpu.js`
  - `src/utils/calculator/cpu.js`
  - `src/utils/calculator/index.js`
- [x] Définir des responsabilités claires par module pour éviter les effets domino lors des modifications de formule.
- [x] Ajouter ou réorganiser les tests pour couvrir le calculateur après découpage.

- [ ] Supprimer la duplication de logique métier entre `src/utils/calculator.js` et `backend/src/utils/analyticalProfile.utils.js`.
- [ ] Choisir une source de vérité unique pour les calculs.
- [ ] Prioriser l’option recommandée : backend = calcul, frontend = affichage uniquement.
- [ ] Évaluer en alternative l’extraction d’un module partagé dans `/shared/calculator/`.
- [ ] Aligner les résultats frontend/backend avec une suite de tests de cohérence.

- [x] Sortir la calibration implicite des tests de `src/utils/calculator.test.js`.
- [x] Créer `src/utils/calibrationProfiles.js`.
- [ ] Déclarer les profils métier explicitement, par exemple :

```js
export const CALIBRATION = {
  "RTX 3060": { min: 45, max: 55 },
  "RTX 4090": { min: 140, max: 160 }
}
```

- [x] Faire consommer ces profils par `src/utils/calculator/calibration.js`.
- [x] Réécrire les tests pour vérifier le comportement métier, pas porter la calibration à la place du code.

## 🟠 Problèmes moyens

- [x] Réduire la logique métier dans `src/components/calculator/PurchaseCalculator.jsx`.
- [x] Extraire les appels calculateur et l’orchestration dans `src/hooks/useCalculator.js`.
- [x] Laisser dans le composant uniquement la logique d’affichage et les interactions UI.

- [ ] Revoir `src/utils/data.js`, trop statique et rigide.
- [ ] Normaliser les données GPU.
- [ ] Étudier un stockage externe : JSON dédié, structure partagée ou base de données.
- [ ] Ajouter un typage strict minimal si le fichier reste en JavaScript.

- [ ] Ajouter `backend/src/services/` pour éviter que la logique métier dérive dans les routes ou contrôleurs.
- [ ] Déplacer progressivement les traitements métier backend dans des services dédiés.
- [ ] Clarifier la séparation `routes/`, `controllers/`, `services/`, `utils/`.

- [ ] Renforcer la gestion d’erreurs backend.
- [x] Vérifier que `backend/src/middleware/errorHandler.middleware.js` est bien branché globalement dans l’application.
- [ ] Uniformiser le format des erreurs API et améliorer les logs.

## 🟡 Problèmes mineurs

- [ ] Étudier une migration vers TypeScript, au minimum sur les zones à forte logique métier.
- [ ] Prioriser le typage des calculateurs, données GPU et structures de réponse API.

- [x] Remplacer les magic numbers dans les calculs par des constantes nommées.
- [ ] Exemple : remplacer `0.75` par `MEMORY_PRESSURE_PENALTY`.
- [ ] Centraliser les constantes métier dans un fichier dédié si besoin.

- [ ] Structurer davantage la configuration backend.
- [ ] Compléter ou documenter les variables d’environnement :
  - `CORS_ORIGIN=`
  - `JWT_SECRET=`
  - `NODE_ENV=`
- [ ] Ajouter un exemple de fichier `.env.example` si absent.

## Ordre recommandé

- [x] 1. Refactor `calculator.js`
- [ ] 2. Source de vérité unique pour les calculs
- [x] 3. Extraction des profils de calibration
- [x] 4. Hook `useCalculator`
- [ ] 5. Mise en place des services backend
- [ ] 6. Nettoyage des données et constantes
- [ ] 7. Renforcement erreurs + configuration
- [ ] 8. Étude TypeScript
