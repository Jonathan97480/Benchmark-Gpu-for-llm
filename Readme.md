# GPU LLM Benchmark

Application de benchmark GPU pour LLM avec :

- frontend public en React/Vite
- admin React sur `/admin`
- backend Express
- base SQLite
- benchmarks detailles par `GPU x nombre de cartes x modele x precision x contexte`
- simulateur analytique separe pour projeter une estimation de debit
- modeles avec `params_billions` actifs et `total_params_billions` pour le chargement memoire
- support d'API keys pour ingestion externe

## Dossiers principaux

- `src/` : frontend React public et admin
- `backend/` : API, auth, migrations, bootstrap, SQLite
- `Data.md` : source initiale des donnees de base
- `dist/` : build frontend

## Installation rapide

### 1. Dependances

Racine :

```bash
npm install
```

Backend :

```bash
cd backend
npm install
```

### 2. Base de donnees

```bash
cd backend
npm run migrate
npm run bootstrap
```

Comportement actuel :

- `npm run migrate` : migration non destructive, preserve les donnees existantes
- `npm run bootstrap` : injecte les donnees par defaut uniquement si la base est vide
- `npm run seed` : alias de bootstrap avec le meme comportement non destructif

Scripts destructifs explicites :

- `npm run migrate:reset` : supprime puis recree les tables
- `npm run bootstrap:reset` : vide les donnees metier puis reinjecte le dataset par defaut
- `npm run seed:reset` : alias de `bootstrap:reset`
- `npm run dev:seed-fake-prices` : ajoute de faux points d'historique de prix GPU pour la visualisation en dev

Pour une mise a jour de production, utilisez seulement :

```bash
cd backend
npm run migrate
```

Ne lancez pas `bootstrap` en production si votre base contient deja des donnees metier a conserver.

### 3. Lancement

Mode developpement :

```bash
cd backend
npm run dev
```

Dans un second terminal :

```bash
npm run dev
```

Si vous preferez travailler directement sur `http://localhost:3000/` avec rebuild automatique du
frontend public et admin :

```bash
npm run dev:served
```

Mode build servi par Express :

```bash
npm run build
cd backend
npm start
```

## URLs utiles

- frontend public : `http://localhost:3000/`
- admin : `http://localhost:3000/admin`
- healthcheck : `http://localhost:3000/api/v1/health`

En developpement Vite :

- app React : `http://localhost:5173/`
- admin React : `http://localhost:5173/admin`

## Compte admin par defaut

Si aucun admin n'existe lors du bootstrap :

- utilisateur : `admin`
- mot de passe : `Admin1234`

## Tests

Frontend :

```bash
npm test
```

Backend :

```bash
cd backend
npm test
```

Tests cibles en developpement :

```bash
npm run test:price-curves
cd backend && npm run test:backup
```

Les tests frontend couvrent aussi le simulateur analytique du calculateur dans `src/utils/calculator.test.js`.
Les tests backend couvrent maintenant :

- l'authentification admin et API key
- les routes API des modeles
- l'endpoint public `GET /gpu/:id/price-history`
- les routes d'ecriture `POST/PUT/DELETE /gpu/:id/price-history`
- le systeme de backup admin, creation, listing et telechargement
- les nouvelles colonnes analytiques en base SQLite
- la validation des nouveaux champs analytiques
- la preservation des donnees sur `migrate` et `bootstrap` sans reset

Le test unitaire des courbes de prix est dans [GpuTable.test.jsx](/c:/Users/berou/Desktop/Benchmark-Gpu-for-llm-main/src/components/tables/GpuTable.test.jsx).
Le test backend du backup et de l'API prix est dans [backup.api.test.js](/c:/Users/berou/Desktop/Benchmark-Gpu-for-llm-main/backend/test/backup.api.test.js).

## Donnees fake de prix

Pour alimenter le panneau public des courbes en developpement :

```bash
npm run dev:seed-fake-prices
```

Le script appelle [seedFakePriceHistory.js](/c:/Users/berou/Desktop/Benchmark-Gpu-for-llm-main/backend/src/db/seedFakePriceHistory.js), recree un historique faux mais plausible pour chaque GPU et reste bloque en production sauf usage explicite de `--force`.

## Calculateur analytique

Le calculateur frontend est une estimation analytique. Il ne correspond pas a un benchmark mesure.

Variables prises en compte :

- GPU : VRAM, bande passante, score, nombre de cartes
- modele : `params_billions` actifs, `total_params_billions` charges en memoire, `max_context_size`
- quantization : empreinte memoire et facteur de vitesse
- contexte : contexte demande par l'utilisateur et contexte effectif clamp au maximum declare du modele
- machine hote : RAM systeme, coeurs CPU, threads CPU, frequence CPU

Hypotheses principales :

- les poids du modele utilisent `total_params_billions`
- le debit analytique utilise `params_billions` actifs
- pour certains modeles MoE, des hypotheses conservatives sont documentees dans `src/utils/data.js`
- quand une metadonnee GPU est absente dans le seed, une hypothese explicite est injectee dans `src/utils/data.js`

Limites connues :

- pas de prise en compte d'un moteur d'inference precis (`llama.cpp`, `vLLM`, `SGLang`, etc.)
- pas de modelisation separee prefill/decode
- pas de topologie multi-GPU detaillee (PCIe, NVLink, Infinity Fabric, NUMA)
- pas de concurrence multi-utilisateur
- pas de benchmark reel injecte dans le calcul final

## Documentation

## Mise a jour production

Flux recommande :

```bash
cd backend
npm run migrate
```

Cas d'usage :

- base deja en production avec donnees reelles : `npm run migrate`
- premiere initialisation sur base vide : `npm run migrate` puis `npm run bootstrap`
- reinitialisation volontaire complete : `npm run migrate:reset` puis `npm run bootstrap:reset`

Important :

- les commandes `:reset` sont destructives
- elles ne doivent pas etre utilisees dans un deploiement standard
- `bootstrap` ne doit plus servir de mise a jour systematique apres chaque release

Pour une base deja existante, consultez le guide de migration avant toute mise a jour :

- [Update.md](/c:/Users/berou/Desktop/Benchmark-Gpu-for-llm-main/Update.md)

- [SETUP.md](/c:/Users/berou/Desktop/Benchmark-Gpu-for-llm-main/SETUP.md)
- [API.md](/c:/Users/berou/Desktop/Benchmark-Gpu-for-llm-main/API.md)
- [Update.md](/c:/Users/berou/Desktop/Benchmark-Gpu-for-llm-main/Update.md)
- [admi.md](/c:/Users/berou/Desktop/Benchmark-Gpu-for-llm-main/admi.md)
- [securiter.md](/c:/Users/berou/Desktop/Benchmark-Gpu-for-llm-main/securiter.md)
