# API Documentation

## Base URL

```text
http://localhost:3000/api/v1
```

## Authentification

Les routes protegees acceptent selon le cas :

- `Authorization: Bearer <access_token>`
- ou `x-api-key: <api_key>`

## Routes auth

### Verifier si un admin existe

```http
GET /auth/admin-exists
```

Reponse :

```json
{
  "exists": true
}
```

### Creer le premier admin

```http
POST /auth/register
Content-Type: application/json
```

```json
{
  "username": "admin",
  "password": "SecurePassword123!",
  "confirmPassword": "SecurePassword123!"
}
```

### Login admin

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "username": "admin",
  "password": "SecurePassword123!"
}
```

Reponse :

```json
{
  "access_token": "jwt-access-token",
  "expires_in": 900,
  "user": {
    "id": 1,
    "username": "admin",
    "last_login": "2026-04-21 05:00:00"
  }
}
```

Le `refresh_token` est pose dans un cookie `HttpOnly`. Il n'est pas renvoye dans le JSON.

### Refresh

```http
POST /auth/refresh
```

Le backend lit d'abord le cookie `refresh_token`. Un `refresh_token` dans le body reste accepte pour compatibilite.

Reponse :

```json
{
  "access_token": "new-jwt-access-token",
  "expires_in": 900
}
```

### Logout

```http
POST /auth/logout
```

Le backend supprime le `refresh_token` stocke et efface le cookie.

### Gestion des API keys

Ces routes demandent un JWT admin valide.

#### Lister les API keys

```http
GET /auth/api-keys
Authorization: Bearer <access_token>
```

#### Creer une API key

```http
POST /auth/api-keys
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "name": "ingestion-service-prod"
}
```

Reponse :

```json
{
  "message": "API key created successfully",
  "api_key": "plain-text-key-visible-once",
  "key": {
    "id": 1,
    "name": "ingestion-service-prod",
    "key_prefix": "gpubm_1234",
    "is_active": 1,
    "last_used_at": null,
    "created_at": "2026-04-21 05:00:00",
    "created_by_user_id": 1
  }
}
```

#### Revoquer une API key

```http
DELETE /auth/api-keys/:id
Authorization: Bearer <access_token>
```

## GPUs

### Lister les GPU

```http
GET /gpu
```

Filtres disponibles :

- `vendor`
- `tier`
- `sort`
- `order`
- `search`

### Dataset public agrege

```http
GET /gpu/public-dataset
```

Cette route renvoie le dataset public restructure pour le frontend React :

- liste des GPU
- liste des modeles
- resultats detailles `benchmark_results`
- donnees legacy `tokens_8b`, `tokens_32b`, `tokens_70b`

Extrait de `benchmark_results` :

```json
{
  "id": 12,
  "gpu_id": 1,
  "gpu_count": 4,
  "llm_model_id": 2,
  "tokens_per_second": 510,
  "context_size": 32000,
  "precision": "INT4",
  "notes": "Test sur 4x GPU identiques",
  "gpu_name": "RTX 4090",
  "vendor": "NVIDIA",
  "architecture": "Ada Lovelace",
  "tier": "prosumer",
  "vram": 24,
  "price_value": 1800,
  "price_new_value": 1800,
  "price_used_value": 0,
  "model_name": "DeepSeek R1 32B",
  "params_billions": 32,
  "total_params_billions": 32
}
```

### Details d'un GPU

```http
GET /gpu/:id
```

Le GPU inclut ses `benchmark_results`.

Exemple de reponse :

```json
{
  "id": 1,
  "name": "RTX 4090",
  "vendor": "NVIDIA",
  "architecture": "Ada Lovelace",
  "vram": 24,
  "bandwidth": 1008,
  "price_value": 1800,
  "price_new_value": 1800,
  "price_used_value": 0,
  "tier": "prosumer",
  "score": 82,
  "benchmark_results": [
    {
      "id": 12,
      "gpu_id": 1,
      "gpu_count": 4,
      "llm_model_id": 2,
      "model_name": "DeepSeek R1 32B",
      "params_billions": 32,
      "total_params_billions": 32,
      "tokens_per_second": 510,
      "context_size": 32000,
      "precision": "INT4",
      "notes": "Test sur 4x GPU identiques"
    }
  ]
}
```

### Creer un GPU

Accepte JWT admin ou API key.

```http
POST /gpu
Authorization: Bearer <access_token>
Content-Type: application/json
```

ou :

```http
POST /gpu
x-api-key: <api_key>
Content-Type: application/json
```

```json
{
  "name": "RTX 5090",
  "vendor": "NVIDIA",
  "architecture": "Blackwell",
  "vram": 32,
  "bandwidth": 1792,
  "price": "premium",
  "price_value": 2300,
  "price_new_value": 2300,
  "price_used_value": 0,
  "tier": "prosumer",
  "score": 98,
  "tokens_8b": 213,
  "tokens_32b": 0,
  "tokens_70b": 0
}
```

`price_new_value` et `price_used_value` sont les champs recommandes. `price_value` reste conserve pour compatibilite.

La derniere evolution API inclut donc bien :

- `price_new_value` pour le prix neuf
- `price_used_value` pour le prix occasion
- `price_value` uniquement comme champ legacy de compatibilite

### Modifier un GPU

Accepte JWT admin ou API key.

```http
PUT /gpu/:id
```

### Supprimer un GPU

Accepte JWT admin ou API key.

```http
DELETE /gpu/:id
```

## Resultats de benchmark

### Creer un resultat

Accepte JWT admin ou API key.

```http
POST /gpu/:gpu_id/benchmark
Content-Type: application/json
```

```json
{
  "llm_model_id": 1,
  "gpu_count": 1,
  "tokens_per_second": 213,
  "context_size": 4096,
  "precision": "FP16",
  "notes": "Test configuration details"
}
```

`gpu_count` indique combien de cartes identiques ont ete utilisees pour le benchmark. Si le champ est omis, la valeur par defaut est `1`.

Exemple de reponse :

```json
{
  "message": "Benchmark result created successfully",
  "benchmark": {
    "id": 12,
    "gpu_id": 1,
    "gpu_count": 4,
    "llm_model_id": 2,
    "tokens_per_second": 510,
    "context_size": 32000,
    "precision": "INT4",
    "notes": "Test sur 4x GPU identiques",
    "created_at": "2026-04-22 10:00:00"
  }
}
```

### Modifier un resultat

Accepte JWT admin ou API key.

```http
PUT /gpu/:gpu_id/benchmark/:result_id
```

Le body accepte les memes champs que la creation, y compris `gpu_count`.

Exemple de reponse :

```json
{
  "message": "Benchmark result updated successfully",
  "benchmark": {
    "id": 12,
    "gpu_id": 1,
    "gpu_count": 2,
    "llm_model_id": 2,
    "tokens_per_second": 260,
    "context_size": 32000,
    "precision": "INT4",
    "notes": "Valeur corrigee",
    "created_at": "2026-04-22 10:00:00"
  }
}
```

### Supprimer un resultat

Accepte JWT admin ou API key.

```http
DELETE /gpu/:gpu_id/benchmark/:result_id
```

Reponse :

```json
{
  "message": "Benchmark result deleted successfully"
}
```

## Cas d'usage pour un service externe

Les cas ci-dessous supposent qu'un service externe utilise une API key dans le header :

```http
x-api-key: VOTRE_CLE_API
```

### Cas 1: le GPU existe deja et le modele existe deja

Le service doit :

1. retrouver l'`id` du GPU
2. retrouver l'`id` du modele
3. creer le benchmark

Routes typiques :

```http
GET /gpu
GET /models
POST /gpu/:gpu_id/benchmark
```

Exemple :

```bash
curl -X POST http://localhost:3000/api/v1/gpu/1/benchmark ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: VOTRE_CLE_API" ^
  -d "{\"llm_model_id\":2,\"gpu_count\":1,\"tokens_per_second\":142.5,\"context_size\":32000,\"precision\":\"INT4\",\"notes\":\"Ajout service externe\"}"
```

Exemple multi-GPU :

```bash
curl -X POST http://localhost:3000/api/v1/gpu/1/benchmark ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: VOTRE_CLE_API" ^
  -d "{\"llm_model_id\":2,\"gpu_count\":4,\"tokens_per_second\":510,\"context_size\":32000,\"precision\":\"INT4\",\"notes\":\"Test sur 4x GPU identiques\"}"
```

### Cas 2: le GPU existe deja mais le modele n'existe pas encore

Le service doit :

1. retrouver l'`id` du GPU
2. creer le modele
3. recuperer l'`id` du modele cree
4. creer le benchmark

Routes typiques :

```http
GET /gpu
POST /models
POST /gpu/:gpu_id/benchmark
```

Exemple de creation du modele :

```bash
curl -X POST http://localhost:3000/api/v1/models ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: VOTRE_CLE_API" ^
  -d "{\"name\":\"Qwen 3.5 35B\",\"params_billions\":35,\"total_params_billions\":35,\"description\":\"Ajout automatique\"}"
```

Puis creation du benchmark avec l'id du modele :

```bash
curl -X POST http://localhost:3000/api/v1/gpu/1/benchmark ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: VOTRE_CLE_API" ^
  -d "{\"llm_model_id\":6,\"gpu_count\":1,\"tokens_per_second\":118,\"context_size\":32000,\"precision\":\"FP8\",\"notes\":\"Ajout service externe\"}"
```

### Cas 3: le GPU n'existe pas encore mais le modele existe deja

Le service doit :

1. creer le GPU
2. retrouver l'`id` du modele
3. creer le benchmark

Routes typiques :

```http
POST /gpu
GET /models
POST /gpu/:gpu_id/benchmark
```

Exemple de creation du GPU :

```bash
curl -X POST http://localhost:3000/api/v1/gpu ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: VOTRE_CLE_API" ^
  -d "{\"name\":\"RTX 6000 Test\",\"vendor\":\"NVIDIA\",\"architecture\":\"Ada\",\"vram\":48,\"bandwidth\":960,\"price\":\"premium\",\"price_value\":6800,\"tier\":\"enterprise\",\"score\":92,\"tokens_8b\":0,\"tokens_32b\":0,\"tokens_70b\":0}"
```

Puis creation du benchmark avec le nouvel `id` du GPU.

### Cas 4: ni le GPU ni le modele n'existent

Le service doit :

1. creer le modele
2. creer le GPU
3. creer le benchmark

Routes typiques :

```http
POST /models
POST /gpu
POST /gpu/:gpu_id/benchmark
```

### Cas 5: mettre a jour un resultat deja existant

Si le benchmark existe deja et qu'il faut corriger la valeur, la route a utiliser est :

```http
PUT /gpu/:gpu_id/benchmark/:result_id
```

Exemple :

```bash
curl -X PUT http://localhost:3000/api/v1/gpu/1/benchmark/4 ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: VOTRE_CLE_API" ^
  -d "{\"llm_model_id\":2,\"gpu_count\":1,\"tokens_per_second\":149,\"context_size\":32000,\"precision\":\"INT4\",\"notes\":\"Valeur corrigee\"}"
```

### Cas 6: supprimer un resultat errone

Si une ligne a ete ajoutee par erreur :

```http
DELETE /gpu/:gpu_id/benchmark/:result_id
```

### Bonnes pratiques pour l'import externe

- utilisez `GET /gpu` et `GET /models` pour eviter les doublons
- considerez qu'un benchmark est distinct selon `gpu_id`, `gpu_count`, `llm_model_id`, `context_size` et `precision`
- renseignez `precision` pour refleter la quantization reelle
- utilisez `notes` pour garder la trace de la source ou de la configuration
- gardez `tokens_8b`, `tokens_32b`, `tokens_70b` pour les donnees legacy, pas pour les benchmarks detailles

## Modeles LLM

### Lister les modeles

```http
GET /models
```

### Details d'un modele

```http
GET /models/:id
```

### Creer un modele

Accepte JWT admin ou API key.

```http
POST /models
Content-Type: application/json
```

```json
{
  "name": "Gemma 4 9B",
  "params_billions": 9,
  "total_params_billions": 9,
  "description": "Google Gemma 4 9B model"
}
```

`params_billions` represente les parametres actifs. `total_params_billions` represente les parametres totaux charges en memoire, utile pour des variantes comme `Gemma 4 E4B` qui activent moins de parametres qu'elles n'en chargent.

### Modifier un modele

Accepte JWT admin ou API key.

```http
PUT /models/:id
```

### Supprimer un modele

Accepte JWT admin ou API key.

```http
DELETE /models/:id
```

## Systeme

### Healthcheck

```http
GET /health
```

### Statistiques

```http
GET /stats
```

## Codes d'erreur frequents

```json
{ "error": "Invalid input data" }
```

```json
{ "error": "Access token required" }
```

```json
{ "error": "API key required" }
```

```json
{ "error": "Invalid token" }
```

```json
{ "error": "Invalid API key" }
```

```json
{ "error": "Too many requests from this IP, please try again later." }
```
