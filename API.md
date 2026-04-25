# API Documentation

## Base URL

```text
http://localhost:3000/api/v1
```

## Authentification

Les routes protegees acceptent selon le cas :

- `Authorization: Bearer <access_token>`
- ou `x-api-key: <api_key>`

Pour l'admin web :

- le `refresh_token` n'est jamais renvoye dans le JSON
- il est pose uniquement en cookie `HttpOnly`
- il est stocke sous forme hashée en base

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

Caracteristiques du cookie de refresh :

- `HttpOnly`
- `SameSite=Strict`
- `Secure` en production
- `path=/`

### Refresh

```http
POST /auth/refresh
```

Le backend lit uniquement le cookie `refresh_token`. Un token transmis dans le body est refuse.

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

Le backend supprime le hash du `refresh_token` stocke et efface le cookie.

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
  "inference_backend": "vLLM",
  "measurement_type": "decode",
  "vram_used_gb": 23.4,
  "ram_used_gb": 19.8,
  "kv_cache_precision": "FP8",
  "batch_size": 4,
  "concurrency": 2,
  "gpu_power_limit_watts": 420,
  "gpu_core_clock_mhz": 2520,
  "gpu_memory_clock_mhz": 1312,
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

### Dataset public dedie a la table catalogue

```http
GET /gpu/public-catalog-table
```

Cette route publique est dediee a la grande table du catalogue frontend. Elle renvoie :

- la liste des GPU
- la liste des modeles
- pour chaque GPU, sa liste `benchmark_results`
- `coverage_count` calcule cote backend

Elle est utile quand le frontend doit :

- filtrer les benchmarks par modele selectionne
- compter seulement les benchmarks du modele selectionne
- afficher plusieurs benchmarks pour un meme couple `GPU x modele`

Exemple de reponse :

```json
{
  "gpus": [
    {
      "id": 1,
      "name": "RTX 4090",
      "vendor": "NVIDIA",
      "architecture": "Ada Lovelace",
      "vram": 24,
      "bandwidth": 1008,
      "price_value": 1800,
      "price_new_value": 1800,
      "price_used_value": 1200,
      "tier": "prosumer",
      "score": 82,
      "coverage_count": 3,
      "benchmark_results": [
        {
          "id": 12,
          "gpu_id": 1,
          "gpu_count": 1,
          "llm_model_id": 2,
          "model_name": "DeepSeek R1 32B",
          "tokens_per_second": 142.5,
          "context_size": 8192,
          "precision": "INT4",
          "notes": "Mesure A"
        },
        {
          "id": 13,
          "gpu_id": 1,
          "gpu_count": 2,
          "llm_model_id": 2,
          "model_name": "DeepSeek R1 32B",
          "tokens_per_second": 260,
          "context_size": 16384,
          "precision": "INT4",
          "notes": "Mesure B"
        }
      ]
    }
  ],
  "models": [
    {
      "id": 2,
      "name": "DeepSeek R1 32B"
    }
  ],
  "totals": {
    "gpus": 1,
    "models": 1,
    "benchmark_results": 3
  }
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
      "inference_backend": "vLLM",
      "measurement_type": "decode",
      "vram_used_gb": 23.4,
      "ram_used_gb": 19.8,
      "kv_cache_precision": "FP8",
      "batch_size": 4,
      "concurrency": 2,
      "gpu_power_limit_watts": 420,
      "gpu_core_clock_mhz": 2520,
      "gpu_memory_clock_mhz": 1312,
      "notes": "Test sur 4x GPU identiques"
    }
  ]
}
```

### Historique de prix d'un GPU

```http
GET /gpu/:id/price-history
```

Cette route publique expose les points de suivi de prix utilises par le panneau de courbes du catalogue.

Exemple de reponse :

```json
{
  "gpu": {
    "id": 1,
    "name": "RTX 4090",
    "price_new_value": 1800,
    "price_used_value": 1200
  },
  "history": [
    {
      "id": 41,
      "gpu_id": 1,
      "price_new_value": 1850,
      "price_used_value": 1180,
      "recorded_at": "2026-04-20T12:00:00.000Z"
    },
    {
      "id": 42,
      "gpu_id": 1,
      "price_new_value": 1820,
      "price_used_value": 1160,
      "recorded_at": "2026-04-21T12:00:00.000Z"
    }
  ]
}
```

### Ajouter un point d'historique de prix

Accepte JWT admin ou API key.

```http
POST /gpu/:id/price-history
Authorization: Bearer <access_token>
Content-Type: application/json
```

ou :

```http
POST /gpu/:id/price-history
x-api-key: <api_key>
Content-Type: application/json
```

```json
{
  "price_new_value": 1820,
  "price_used_value": 1160,
  "recorded_at": "2026-04-21T12:00:00.000Z"
}
```

`recorded_at` est optionnel. Si omis, le backend utilise l'horodatage courant.

### Modifier un point d'historique de prix

Accepte JWT admin ou API key.

```http
PUT /gpu/:id/price-history/:history_id
```

Le body accepte les memes champs que la creation.

### Supprimer un point d'historique de prix

Accepte JWT admin ou API key.

```http
DELETE /gpu/:id/price-history/:history_id
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

## Backups

Ces routes demandent un JWT admin valide.

### Lister les backups

```http
GET /backups
Authorization: Bearer <access_token>
```

Exemple de reponse :

```json
{
  "backups": [
    {
      "id": "20260424-120000-manual",
      "file_name": "20260424-120000-manual.tar.gz",
      "file_size": 154232,
      "created_at": "2026-04-24T12:00:00.000Z",
      "reason": "manual",
      "includes_images": true,
      "image_directories": ["dist/assets"],
      "db_file_name": "20260424-120000-manual.db"
    }
  ]
}
```

### Creer un backup

```http
POST /backups
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "reason": "manual",
  "include_images": true
}
```

### Telecharger un backup

```http
GET /backups/:file_name/download
Authorization: Bearer <access_token>
```

## Resultats de benchmark

### Creer un resultat

Accepte JWT admin ou API key.

```http
POST /gpu/:gpu_id/benchmark
x-api-key: <api_key>
Content-Type: application/json
```

```json
{
  "llm_model_id": 1,
  "gpu_count": 1,
  "tokens_per_second": 213,
  "context_size": 4096,
  "precision": "FP16",
  "inference_backend": "vLLM",
  "measurement_type": "decode",
  "vram_used_gb": 23.4,
  "ram_used_gb": 19.8,
  "kv_cache_precision": "FP8",
  "batch_size": 4,
  "concurrency": 2,
  "gpu_power_limit_watts": 420,
  "gpu_core_clock_mhz": 2520,
  "gpu_memory_clock_mhz": 1312,
  "notes": "Test configuration details"
}
```

`gpu_count` indique combien de cartes identiques ont ete utilisees pour le benchmark. Si le champ est omis, la valeur par defaut est `1`.

Champs benchmark supportes :

- `llm_model_id` : entier, requis
- `gpu_count` : entier >= 1
- `tokens_per_second` : nombre >= 0, requis
- `context_size` : entier >= 1 ou `null`
- `precision` : texte libre, typiquement `INT4`, `AWQ INT4`, `GPTQ INT4`, `FP8`, `FP16`
- `inference_backend` : `llama.cpp`, `Ollama`, `vLLM`, `exllamav2`, `tabbyAPI`, `SGLang`, `Autre`
- `measurement_type` : `decode`, `prefill`, `mixed`
- `vram_used_gb` : nombre >= 0 ou `null`
- `ram_used_gb` : nombre >= 0 ou `null`
- `kv_cache_precision` : `FP16`, `FP8`, `INT8`, `INT4`, `Non spécifié`
- `batch_size` : entier >= 1 ou `null`
- `concurrency` : entier >= 1 ou `null`
- `gpu_power_limit_watts` : entier >= 1 ou `null`
- `gpu_core_clock_mhz` : entier >= 1 ou `null`
- `gpu_memory_clock_mhz` : entier >= 1 ou `null`
- `notes` : texte libre

Ces champs peuvent etre envoyes avec :

- `Authorization: Bearer <access_token>`
- ou `x-api-key: <api_key>`

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
    "inference_backend": "vLLM",
    "measurement_type": "decode",
    "vram_used_gb": 23.4,
    "ram_used_gb": 19.8,
    "kv_cache_precision": "FP8",
    "batch_size": 4,
    "concurrency": 2,
    "gpu_power_limit_watts": 420,
    "gpu_core_clock_mhz": 2520,
    "gpu_memory_clock_mhz": 1312,
    "notes": "Test sur 4x GPU identiques",
    "created_at": "2026-04-22 10:00:00"
  }
}
```

### Modifier un resultat

Accepte JWT admin ou API key.

```http
PUT /gpu/:gpu_id/benchmark/:result_id
x-api-key: <api_key>
Content-Type: application/json
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
    "inference_backend": "Ollama",
    "measurement_type": "prefill",
    "vram_used_gb": 21.2,
    "ram_used_gb": 12.4,
    "kv_cache_precision": "FP16",
    "batch_size": 1,
    "concurrency": 1,
    "gpu_power_limit_watts": 350,
    "gpu_core_clock_mhz": 2400,
    "gpu_memory_clock_mhz": 1250,
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
  -d "{\"llm_model_id\":2,\"gpu_count\":1,\"tokens_per_second\":142.5,\"context_size\":32000,\"precision\":\"INT4\",\"inference_backend\":\"vLLM\",\"measurement_type\":\"decode\",\"vram_used_gb\":23.4,\"ram_used_gb\":19.8,\"kv_cache_precision\":\"FP8\",\"batch_size\":4,\"concurrency\":2,\"gpu_power_limit_watts\":420,\"gpu_core_clock_mhz\":2520,\"gpu_memory_clock_mhz\":1312,\"notes\":\"Ajout service externe\"}"
```

Exemple multi-GPU :

```bash
curl -X POST http://localhost:3000/api/v1/gpu/1/benchmark ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: VOTRE_CLE_API" ^
  -d "{\"llm_model_id\":2,\"gpu_count\":4,\"tokens_per_second\":510,\"context_size\":32000,\"precision\":\"INT4\",\"inference_backend\":\"vLLM\",\"measurement_type\":\"decode\",\"notes\":\"Test sur 4x GPU identiques\"}"
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
  -d "{\"llm_model_id\":6,\"gpu_count\":1,\"tokens_per_second\":118,\"context_size\":32000,\"precision\":\"FP8\",\"inference_backend\":\"Ollama\",\"measurement_type\":\"decode\",\"notes\":\"Ajout service externe\"}"
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
  -d "{\"llm_model_id\":2,\"gpu_count\":1,\"tokens_per_second\":149,\"context_size\":32000,\"precision\":\"INT4\",\"inference_backend\":\"Ollama\",\"measurement_type\":\"decode\",\"vram_used_gb\":11.8,\"ram_used_gb\":4.2,\"kv_cache_precision\":\"FP16\",\"batch_size\":1,\"concurrency\":1,\"notes\":\"Valeur corrigee\"}"
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
- renseignez `inference_backend` et `measurement_type` pour distinguer `decode` et `prefill`
- renseignez `vram_used_gb` et `ram_used_gb` quand vous avez la telemetrie reelle
- renseignez `kv_cache_precision` si le backend utilise `FP8` ou une precision speciale pour le cache
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
