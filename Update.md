# Mise a jour vers la version avec `gpu_count` et `total_params_billions`

Ce document explique comment migrer une base SQLite de production existante vers la version qui supporte :

- les benchmarks multi-GPU via le champ `gpu_count`
- les modeles avec parametres actifs et parametres totaux via le champ `total_params_billions`

## Resume

La nouvelle version ajoute deux colonnes :

- table `benchmark_results`
- colonne `gpu_count INTEGER NOT NULL DEFAULT 1`
- table `llm_models`
- colonne `total_params_billions INTEGER`

Point a ne pas oublier :

- la base de donnees doit bien contenir ce nouveau champ `gpu_count`
- la base de donnees doit bien contenir aussi `total_params_billions` dans `llm_models`
- sans ce champ, l'API et le frontend public ne pourront pas exploiter correctement le nombre de cartes utilisees par benchmark
- sans `total_params_billions`, le calculateur ne pourra pas distinguer correctement les parametres actifs des parametres totaux

Cette migration est additive :

- les lignes existantes conservent leurs benchmarks
- tous les benchmarks historiques prennent `gpu_count = 1`

## Attention

Ne pas utiliser ces commandes en production pour cette mise a jour :

- `npm run migrate`
- `npm run bootstrap`
- `npm run seed`
- `npm run bootstrap:data`

Pourquoi :

- `npm run migrate` appelle `runMigration()` qui supprime puis recree les tables
- `bootstrap` et `seed` reinitialisent aussi les donnees

## Strategie recommandee

La bonne approche pour une base existante est :

1. sauvegarder le fichier SQLite
2. arreter temporairement le backend
3. executer uniquement `createTables()`
4. redemarrer l'application
5. verifier que les colonnes `gpu_count` et `total_params_billions` existent bien

`createTables()` est safe pour cette mise a jour, car il utilise :

- `CREATE TABLE IF NOT EXISTS`
- `ALTER TABLE ... ADD COLUMN` seulement si la colonne est absente

## Localiser la base de production

Le backend lit la variable :

- `DATABASE_PATH`

Si elle n'est pas definie, la valeur par defaut est :

- `./data/gpu_benchmarks.db`

Le chemin est resolu depuis le dossier `backend/`.

Exemple :

- si `DATABASE_PATH` n'est pas defini, le fichier sera en general `backend/data/gpu_benchmarks.db`

## Procedure de migration

### 1. Sauvegarder la base

Exemple PowerShell :

```powershell
Copy-Item .\backend\data\gpu_benchmarks.db .\backend\data\gpu_benchmarks.db.bak-2026-04-22
```

Si `DATABASE_PATH` pointe ailleurs, adapte le chemin.

### 2. Arreter le backend

Arrete le process Node.js ou le service qui sert l'application avant la migration.

### 3. Lancer la migration additive

Depuis le dossier `backend/`, execute :

```powershell
node -e "require('./src/db/migrations').createTables()"
```

Si tu utilises une base personnalisee, assure-toi que `DATABASE_PATH` est bien defini avant la commande.

Exemple PowerShell :

```powershell
$env:DATABASE_PATH = "C:\chemin\vers\gpu_benchmarks.db"
node -e "require('./src/db/migrations').createTables()"
```

Cette commande :

- ne supprime pas les donnees
- ajoute `gpu_count` si la colonne n'existe pas
- ajoute `total_params_billions` si la colonne n'existe pas
- laisse les anciennes lignes avec la valeur par defaut `1`

Ne pas oublier :

- apres la mise a jour, verifie explicitement que la colonne `gpu_count` a bien ete ajoutee dans `benchmark_results`
- c'est ce champ qui stocke le nombre de cartes utilisees pour chaque test
- verifie aussi que la colonne `total_params_billions` existe bien dans `llm_models`
- c'est ce champ qui permet de stocker les parametres totaux d'un modele quand ils sont differents des parametres actifs

### 4. Redemarrer le backend

Redemarre ensuite le service ou le process Node.js habituel.

## Verification SQL

Tu peux verifier la structure avec SQLite.

Exemple :

```sql
PRAGMA table_info(benchmark_results);
PRAGMA table_info(llm_models);
```

Tu dois voir une ligne proche de :

```text
gpu_count | INTEGER | notnull=1 | dflt_value=1
total_params_billions | INTEGER
```

Pour verifier les donnees existantes :

```sql
SELECT id, gpu_id, gpu_count, llm_model_id, tokens_per_second
FROM benchmark_results
LIMIT 20;
```

Les anciennes lignes doivent maintenant retourner `gpu_count = 1`.

Pour verifier les modeles :

```sql
SELECT id, name, params_billions, total_params_billions
FROM llm_models
LIMIT 20;
```

Quand `total_params_billions` est vide sur une base existante, il faut le renseigner pour les modeles concernes via l'admin ou l'API.

## Verification API

Apres redemarrage, verifie au minimum :

### Lire un GPU existant

```http
GET /api/v1/gpu/:id
```

Chaque objet dans `benchmark_results` doit maintenant inclure `gpu_count`.

### Lire les modeles

```http
GET /api/v1/models
```

Chaque modele doit maintenant pouvoir inclure `total_params_billions`.

### Creer un benchmark multi-GPU

```http
POST /api/v1/gpu/:gpu_id/benchmark
Content-Type: application/json
```

```json
{
  "llm_model_id": 2,
  "gpu_count": 4,
  "tokens_per_second": 510,
  "context_size": 32000,
  "precision": "INT4",
  "notes": "Test sur 4x GPU identiques"
}
```

## Rollback

Si la mise a jour doit etre annulee :

1. arreter le backend
2. restaurer la sauvegarde du fichier `.db`
3. redemarrer le backend avec l'ancienne version du code

Exemple PowerShell :

```powershell
Copy-Item .\backend\data\gpu_benchmarks.db.bak-2026-04-22 .\backend\data\gpu_benchmarks.db -Force
```

## Notes importantes

- cette version supporte le cas `N x meme GPU`
- cette version supporte aussi un calcul plus fiable pour les modeles ou les parametres actifs et totaux different
- elle ne modelise pas encore les configurations heterogenes du type `2x RTX 3090 + 1x RTX 4090`
- si tu as plusieurs instances backend sur la meme base, fais la migration pendant une fenetre de maintenance
