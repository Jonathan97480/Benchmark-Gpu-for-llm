# Setup Guide

## Vue d'ensemble

Le projet est compose de deux parties :

- un frontend React/Vite a la racine du projet
- un backend Express + SQLite dans `backend/`

Le backend sert aussi le build frontend en production sur `http://localhost:3000/`, y compris l'admin React sur `http://localhost:3000/admin`.

## Prerequis

- Node.js `>= 18`
- npm

## Installation complete

### 1. Installer le frontend

Depuis la racine :

```bash
npm install
```

### 2. Installer le backend

```bash
cd backend
npm install
```

### 3. Configurer l'environnement backend

Dans `backend/`, copier `.env.example` vers `.env`, puis verifier au minimum :

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=change-this-secret-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
DATABASE_PATH=./data/gpu_benchmarks.db
```

Point important :

- changez `JWT_SECRET` en production
- `DATABASE_PATH` peut etre relatif ou absolu

### 4. Initialiser la base

Toujours dans `backend/` :

```bash
npm run migrate
npm run bootstrap
```

Le bootstrap charge les donnees de base depuis `Data.md` et cree le compte admin par defaut seulement si aucun admin n'existe deja.

Identifiants par defaut :

- utilisateur : `admin`
- mot de passe : `Admin1234`

Changez ce mot de passe apres la premiere connexion.

## Lancer le projet

### Mode developpement

Terminal 1, backend :

```bash
cd backend
npm run dev
```

Terminal 2, frontend React/Vite :

```bash
npm run dev
```

Acces en developpement :

- frontend public : `http://localhost:5173/`
- admin React : `http://localhost:5173/admin`
- API backend : `http://localhost:3000/api/v1`

### Mode build auto sur le port 3000

Si vous voulez travailler directement sur l'application servie par Express sur `http://localhost:3000/`
avec reconstruction automatique du frontend public et de l'admin React :

```bash
npm run dev:served
```

Ce mode :

- surveille `src/` et rebuilde `dist/` automatiquement
- redemarre le backend si ses fichiers changent
- permet de tester la version servie sur `3000` sans rebuild manuel

### Mode application complete

Construire le frontend :

```bash
npm run build
```

Puis lancer le backend :

```bash
cd backend
npm start
```

Acces :

- frontend public : `http://localhost:3000/`
- admin React : `http://localhost:3000/admin`
- healthcheck : `http://localhost:3000/api/v1/health`

## Scripts disponibles

### Racine du projet

```bash
npm run dev
npm run dev:served
npm run build
npm run build:watch
npm run preview
npm test
npm run bootstrap:data
```

### Backend

```bash
npm start
npm run dev
npm run migrate
npm run bootstrap
npm run seed
npm test
```

## Structure

```text
Benchmark-Gpu-for-llm-main/
|- src/                 Frontend React public + admin
|- dist/                Build Vite
|- backend/             API Express, auth, SQLite, migrations, bootstrap
|- Data.md              Source de donnees initiales
|- API.md               Documentation API
|- SETUP.md             Installation et lancement
|- admi.md              Guide admin
|- securiter.md         Notes de securite
|- Readme.md            Vue d'ensemble rapide
```

## Authentification admin

Le backend utilise :

- un `access_token` JWT court
- un `refresh_token` stocke dans un cookie `HttpOnly`

Le frontend admin ne stocke plus le refresh token en JavaScript.

Routes utiles :

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

## API keys pour services externes

L'admin React permet de creer et revoquer des API keys.

Usage cote service externe :

```http
x-api-key: VOTRE_CLE_API
```

Les routes d'ecriture suivantes acceptent :

- soit `Authorization: Bearer <access_token>`
- soit `x-api-key: <api_key>`

Routes concernees :

- `POST/PUT/DELETE /api/v1/gpu`
- `POST/PUT/DELETE /api/v1/gpu/:gpu_id/benchmark`
- `POST/PUT/DELETE /api/v1/models`

## Tests

### Frontend

Depuis la racine :

```bash
npm test
```

Technos :

- Vitest
- Testing Library

### Backend

Depuis `backend/` :

```bash
npm test
```

Technos :

- `node:test`
- `supertest`

Les tests couvrent deja :

- login admin
- refresh par cookie `HttpOnly`
- acces refuse sans token
- ecriture via API key
- rejet d'une API key invalide

## Depannage

### Port 3000 deja utilise

PowerShell :

```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Regenerer la base

```bash
cd backend
npm run migrate
npm run bootstrap
```

### Le frontend ne s'affiche pas sur le port 3000

Verifiez que :

- `npm run build` a bien ete execute a la racine
- `dist/` existe
- le backend est relance apres le build

Si vous voulez eviter ce point en developpement, utilisez :

```bash
npm run dev:served
```

## Documentation associee

- [Readme.md](/c:/Users/berou/Desktop/Benchmark-Gpu-for-llm-main/Readme.md)
- [API.md](/c:/Users/berou/Desktop/Benchmark-Gpu-for-llm-main/API.md)
- [admi.md](/c:/Users/berou/Desktop/Benchmark-Gpu-for-llm-main/admi.md)
- [securiter.md](/c:/Users/berou/Desktop/Benchmark-Gpu-for-llm-main/securiter.md)
