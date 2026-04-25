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
- [x] ajouter une image de partage social propre pour Google, Discord, X et LinkedIn
- [x] mettre `noindex` sur `/admin`
- [x] creer des pages publiques indexables par GPU
- [x] creer des pages publiques indexables par vendor : NVIDIA, AMD, Intel
- [x] creer des pages publiques indexables par modele LLM
- [x] creer des pages editoriales utiles : comparatifs, guides d'achat, explication du calculateur
- [x] ajouter une section FAQ indexable
- [x] mettre en place un prerender HTML cote serveur pour la home et les fiches GPU
- [x] definir des `title` et `meta description` uniques pour la home et les fiches GPU
- [x] creer des URLs lisibles de type `/gpu/rtx-4090`, `/vendor/nvidia`, `/model/llama-3-1-8b`
- [x] gerer des pages publiques introuvables avec reponse `404` et `noindex`

### Checklist complete

- [ ] generer un `sitemap.xml` et le soumettre dans Google Search Console
- [ ] creer un compte Google Search Console et verifier le domaine
- [x] verifier que les routes admin ne sont pas listees dans le sitemap
- [x] ajouter du contenu textuel crawlable autour des tableaux et graphiques
- [x] prevoir des redirections propres si les URLs changent
- [x] creer une page categorie indexable pour le calculateur si elle apporte une vraie intention SEO
- [x] verifier les redirections canoniques entre versions avec et sans slash final
- [x] verifier qu'une seule version du domaine repond en indexable : `https://gpubenchmark.jon-dev.fr/`
- [x] optimiser les polices, images et chargements bloquants
- [x] ajouter des attributs `alt` pertinents sur toutes les images utiles au contenu
- [x] definir une strategie mots-cles en francais
- [x] reecrire les textes pour cibler des requetes concretes : benchmark GPU LLM, carte graphique IA, GPU pour Llama
- [x] preparer un plan de soumission manuelle dans Google Search Console pour la home, les pages vendor, la FAQ et le guide
- [ ] verifier dans Search Console les pages exclues, canonicals choisis par Google et problemes d'indexation
- [ ] suivre les requetes reelles qui generent impressions et clics pour iterer sur les titles/descriptions
- [ ] mesurer l'indexation reelle dans Search Console apres mise en ligne
- [ ] surveiller couverture, clics, impressions et erreurs d'exploration
- [x] prevoir une strategie de backlinks et de partage externe

### Strategie mots-cles FR

- cluster home : `benchmark GPU LLM`, `benchmark carte graphique IA`, `comparatif GPU IA`
- cluster guide : `comment choisir un GPU pour LLM`, `quelle carte graphique pour Llama`, `GPU pour inference locale`
- cluster GPU : `RTX 4090 LLM`, `RTX 5090 benchmark IA`, `carte graphique 24 Go IA`
- cluster vendor : `GPU NVIDIA pour LLM`, `GPU AMD pour IA`, `GPU Intel pour inference locale`
- cluster modeles : `GPU pour Llama`, `GPU pour DeepSeek`, `quelle carte graphique pour [modele]`
- cluster comparatifs : `[gpu A] vs [gpu B] LLM`, `meilleur GPU 24 Go pour LLM`, `comparatif carte graphique IA`
- cluster usages : `GPU local AI`, `GPU budget pour LLM`, `GPU entreprise IA`

Regle editoriale :

- une page cible d'abord une intention principale, puis 2 a 3 variantes proches
- les titles doivent contenir la requete principale ou sa variante la plus naturelle
- les descriptions doivent parler du benefice utilisateur : comparer, choisir, voir le debit mesure, voir les prix
- les textes visibles doivent reprendre le vocabulaire utilisateur : `carte graphique IA`, `GPU pour Llama`, `benchmark GPU LLM`, pas seulement du vocabulaire interne

## Plan de soumission manuelle

Quand le domaine sera verifie dans Search Console, soumettre manuellement en priorite :

1. la home : `https://gpubenchmark.jon-dev.fr/`
2. les pages vendor : `https://gpubenchmark.jon-dev.fr/vendor/nvidia`, `https://gpubenchmark.jon-dev.fr/vendor/amd`, `https://gpubenchmark.jon-dev.fr/vendor/intel`
3. la FAQ : `https://gpubenchmark.jon-dev.fr/faq`
4. le guide : `https://gpubenchmark.jon-dev.fr/guides/choisir-gpu-llm`

Verification avant soumission :

- la page repond en `200`
- la balise `canonical` pointe vers l'URL finale sans slash inutile
- la page apparait dans `sitemap.xml`
- les meta `title` et `description` sont specifiques a la page
- la page contient du texte visible utile, pas seulement un tableau ou un graphique

## Strategie de redirections

Si une URL publique change, conserver une redirection `301` depuis l'ancienne vers la nouvelle.

Regles a suivre :

- ne jamais casser une URL deja indexee sans redirection
- pointer vers l'URL finale canonique, pas vers une URL intermediaire
- conserver les query strings utiles
- mettre a jour en meme temps la `canonical`, le `sitemap.xml` et les liens internes
- tester au minimum les pages fortes : home, vendor, GPU, modele, guide, FAQ, calculateur

Alias deja prevus :

- `/guides` vers `/guides/choisir-gpu-llm`
- `/guide` vers `/guides/choisir-gpu-llm`
- `/calculateur` vers `/calculateur-llm`
- `/calculator` vers `/calculateur-llm`
- `/faqs` vers `/faq`

## Strategie backlinks et partage

Objectif :

- obtenir quelques liens et partages pertinents plutot qu'un grand volume de liens faibles

Canaux prioritaires :

- post de lancement sur X et LinkedIn avec la home, le guide et un comparatif concret
- partage dans des communautes techniques pertinentes : IA open source, homelab, self-hosting, GPU compute, LLM local
- publication d'un article ou billet de blog qui cite explicitement le site et ses pages fortes
- integration du projet dans le portfolio du createur avec lien vers la home
- message de demonstration sur GitHub avec lien vers le guide et les pages comparatives

Pages a pousser en priorite :

- home pour la requete large
- guide pour l'intention informationnelle
- FAQ pour les requetes de comprehension
- pages vendor et comparatifs pour les requetes de comparaison

Regles de qualite :

- toujours partager une page qui contient deja du texte utile et pas seulement un tableau
- varier les ancres autour de `benchmark GPU LLM`, `carte graphique IA`, `GPU pour Llama`
- eviter les annuaires et les backlinks artificiels
- privilegier les liens contextuels dans un contenu qui parle vraiment de GPU, LLM ou inference locale
