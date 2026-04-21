# Notes de Securite

## Authentification

L'application utilise deux mecanismes distincts :

- JWT admin pour l'interface React d'administration
- API keys pour les services externes d'ingestion ou d'automatisation

## JWT admin

Le login renvoie :

- un `access_token` dans la reponse JSON
- un `refresh_token` dans un cookie `HttpOnly`

Caracteristiques :

- `access_token` court, utilise dans `Authorization: Bearer ...`
- `refresh_token` non expose au JavaScript frontend
- cookie `HttpOnly`, `SameSite=Lax`
- cookie `Secure` en production

Ce changement corrige l'ancien risque lie au stockage du refresh token dans le frontend.

## API keys

Les API keys sont stockees en base sous forme de hash, pas en clair.

La base conserve :

- `name`
- `key_hash`
- `key_prefix`
- `is_active`
- `last_used_at`
- `created_at`

La valeur complete :

- n'est visible qu'au moment de la creation
- ne peut pas etre relue ensuite depuis la base ou l'admin

## Routes proteges

Les routes d'ecriture principales acceptent :

- un JWT admin valide
- ou une API key valide dans `x-api-key`

Cela permet a un service externe d'ajouter :

- des GPU
- des modeles LLM
- des resultats de benchmark

## Durcissement backend

Le backend applique deja :

- `helmet` avec CSP
- `cors` avec `credentials: true`
- rate limiting global
- rate limiting specifique sur l'auth
- refresh token en cookie `HttpOnly`
- service statique limite au build `dist/`

La racine complete du depot n'est plus exposee en statique.

## Recommandations de production

- changer immediatement le mot de passe admin par defaut
- definir un `JWT_SECRET` long et aleatoire
- servir l'application derriere HTTPS
- garder `NODE_ENV=production`
- restreindre la liste `origin` CORS a vos domaines reels
- faire tourner les API keys par environnement
- revoquer les cles inutilisees
- surveiller `last_used_at` pour detecter un usage anormal

## Limites actuelles

Le systeme gere des API keys globales, sans permissions fines.

Ameliorations possibles :

- scopes par cle API
- date d'expiration
- rotation automatique
- audit trail plus detaille
- limitation par IP pour certaines cles

## Tests de securite deja en place

Les tests backend valident deja :

- login admin
- presence du cookie `HttpOnly`
- absence de `refresh_token` dans la reponse JSON
- refresh de session par cookie
- refus d'acces sans token
- ecriture autorisee via API key valide
- rejet d'une API key invalide
