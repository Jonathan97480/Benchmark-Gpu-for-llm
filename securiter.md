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

## Todo Referencement Google

### Priorite haute

- [x] definir l'URL canonique de production en `https` : `https://gpubenchmark.jon-dev.fr/`
- [x] ajouter `robots.txt`
- [x] generer `sitemap.xml`
- [x] ajouter `canonical`, Open Graph, Twitter Card et JSON-LD
- [x] mettre `noindex` sur `/admin`
- [x] creer des pages publiques indexables par GPU
- [x] mettre en place un prerender HTML cote serveur pour la home et les fiches GPU
- [x] definir des `title` et `meta description` uniques pour la home et les fiches GPU

### Checklist complete

- definir l'URL canonique de production en `https` et la garder stable
- ajouter `robots.txt` a la racine
- generer un `sitemap.xml` et le soumettre dans Google Search Console
- creer un compte Google Search Console et verifier le domaine
- ajouter une balise `rel="canonical"` sur les pages publiques
- ajouter les metas Open Graph : `og:title`, `og:description`, `og:url`, `og:image`, `og:type`
- ajouter les metas Twitter Card
- ajouter une image de partage social propre pour Google, Discord, X et LinkedIn
- ajouter des donnees structurees JSON-LD adaptees : `WebSite`, `Organization`, possiblement `Dataset`
- mettre `noindex, nofollow` sur l'administration `/admin`
- verifier que les routes admin ne sont pas listees dans le sitemap
- creer de vraies pages indexables par GPU au lieu d'un simple panneau modal
- creer des pages indexables par vendor : NVIDIA, AMD, Intel
- creer des pages indexables par modele LLM si c'est pertinent
- creer des pages editoriales utiles : comparatifs, guides d'achat, explication du calculateur
- donner a chaque page publique un `title` unique
- donner a chaque page publique une `meta description` unique
- utiliser un seul `h1` clair par page
- structurer le contenu avec `h2`, `h3` et texte explicatif reel
- ajouter du contenu textuel crawlable autour des tableaux et graphiques
- ajouter du maillage interne entre GPU, vendors, modeles, guides et calculateur
- creer des URLs lisibles de type `/gpu/rtx-4090`
- gerer des slugs propres et stables
- prevoir des pages 404 et redirections propres si les URLs changent
- passer le site en SSR, SSG ou prerender pour ameliorer l'indexation
- verifier que le contenu principal existe dans le HTML initial ou via prerender
- reduire le poids JS initial pour ameliorer les Core Web Vitals
- optimiser les polices, images et chargements bloquants
- ajouter favicon, icones et manifest propres
- verifier l'accessibilite de base : contrastes, titres, labels, structure
- verifier que toutes les pages publiques repondent en `200`
- corriger les eventuels contenus dupliques
- definir une strategie mots-cles en francais
- reecrire les textes pour cibler des requetes concretes : benchmark GPU LLM, carte graphique IA, GPU pour Llama
- ajouter une section FAQ indexable
- ajouter eventuellement des pages par usage : local AI, inference, budget, entreprise
- mesurer l'indexation reelle dans Search Console apres mise en ligne
- surveiller couverture, clics, impressions et erreurs d'exploration
- mettre en place une routine de mise a jour du sitemap quand de nouvelles pages publiques arrivent
- prevoir une strategie de backlinks et de partage externe
