# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GPU LLM Benchmark — application de benchmark GPU pour LLM. Frontend React/Vite public + admin React sur `/admin`, backend Express/SQLite. Tout le code est en JavaScript (pas de TypeScript).

## Commands

### Install

```bash
npm install              # frontend (racine)
cd backend && npm install  # backend
```

### Database

```bash
cd backend
npm run migrate          # migration non destructive
npm run bootstrap        # donnees par defaut si base vide
```

Scripts destructifs (jamais en prod) : `migrate:reset`, `bootstrap:reset`, `seed:reset`.

### Dev

```bash
npm run dev              # frontend Vite seul (port 5173, proxy /api vers 3000)
cd backend && npm run dev  # backend seul (port 3000)
npm run dev:served       # les deux ensemble, rebuild auto vers dist/
```

### Build & Prod

```bash
npm run build            # build frontend -> dist/
cd backend && npm start  # sert dist/ + API sur port 3000
```

### Tests

```bash
npm test                 # frontend (Vitest)
cd backend && npm test   # backend (node:test + supertest, --test-concurrency=1)
npm run test:price-curves                          # frontend : courbes de prix
cd backend && npm run test:backup                  # backend : backup
```

## Architecture

### Frontend (`src/`)

React SPA avec routage dans `AppRouter.jsx`. Deux entrees :
- **Public** : pages benchmark, comparateur, calculateur analytique, detail GPU
- **Admin** (`admin/AdminApp.jsx`) : CRUD GPU, modeles, benchmarks, API keys, backups

Composants organises par role : `components/pages/`, `components/sections/`, `components/charts/`, `components/tables/`, `components/dashboard/`.

Le calculateur analytique est dans `src/utils/calculator/` (module scinde en `constants`, `memory`, `cpu`, `penalties`, `calibration`, `multiGpu`, `warnings`, `profiles`). Le point d'entree est `src/utils/calculator.js` via `src/utils/calculator/index.js`.

Les hypotheses de calcul et les profils modeles sont dans `src/utils/data/` (`assumptions.js`, `modelProfiles.js`, `normalizers.js`) et `src/utils/data.js`.

Service API unique : `services/dashboardApi.js`.

### Backend (`backend/`)

Express avec SQLite (`better-sqlite3`). Structure MVC :
- `src/controllers/` → logique par domaine (auth, gpu, models, calculator, benchmarks, backups, insights, apiKeys)
- `src/routes/` → definitions de routes API sous `/api/v1`
- `src/services/calculator.service.js` → logique metier du calculateur
- `src/utils/` → helpers (jwt, apiKey, backup, analyticalProfile, httpResponses, password)
- `src/middleware/` → auth, validation (Joi), errorHandler
- `src/db/` → migrations.js, bootstrap.js, seeds.js, baseData.js

Le backend sert le build frontend (`dist/`) en production. L'admin est sur `/admin`.

### API

Versionnee sous `/api/v1`. Auth via JWT access token ou `x-api-key` header. Refresh token uniquement en cookie HttpOnly hashé en base.

Deux endpoints public catalog distincts :
- `GET /gpu/public-dataset` → dashboard et pages publiques
- `GET /gpu/public-catalog-table` → table catalogue avec filtres par modele

Documentation complete dans `API.md`.

### Donnees et configuration

- Source des donnees initiales : `Data.md`
- Environment backend : `backend/.env` (JWT_SECRET, PORT, DATABASE_PATH, CORS_ORIGINS)
- Vite proxy : `/api` → `http://localhost:3000`

## Conventions

- Langue du projet : français (interface, commentaires, commits)
- Pas de TypeScript, JSX/JS uniquement
- Charts : Chart.js
- Validation backend : schemas Joi dans `validation.middleware.js`
- Reponses d'erreur standardisees via `httpResponses.utils.js`
- Tests backend : `node --test --test-concurrency=1` (pas de parallelisme, shared DB)
