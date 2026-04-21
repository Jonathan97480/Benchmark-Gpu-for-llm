# GPU LLM Benchmark

Application de benchmark GPU pour LLM avec :

- frontend public en React/Vite
- admin React sur `/admin`
- backend Express
- base SQLite
- benchmarks detailles par `GPU x modele x precision x contexte`
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

## Documentation

- [SETUP.md](/c:/Users/berou/Desktop/Benchmark-Gpu-for-llm-main/SETUP.md)
- [API.md](/c:/Users/berou/Desktop/Benchmark-Gpu-for-llm-main/API.md)
- [admi.md](/c:/Users/berou/Desktop/Benchmark-Gpu-for-llm-main/admi.md)
- [securiter.md](/c:/Users/berou/Desktop/Benchmark-Gpu-for-llm-main/securiter.md)
