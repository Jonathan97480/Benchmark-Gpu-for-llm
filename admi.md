# Guide Admin

## Acces

L'interface d'administration est une application React accessible a :

- `http://localhost:3000/admin` en mode build servi par Express
- `http://localhost:5173/admin` en mode developpement Vite

## Compte par defaut

Le bootstrap backend cree ce compte seulement si aucun admin n'existe :

- utilisateur : `admin`
- mot de passe : `Admin1234`

Il faut modifier ce mot de passe apres la premiere connexion.

## Fonctions disponibles

Depuis l'admin, vous pouvez :

- creer, modifier et supprimer des GPU
- gerer les champs legacy `tokens_8b`, `tokens_32b`, `tokens_70b`
- ajouter, modifier et supprimer des resultats de benchmark detailles
- associer un GPU a plusieurs lignes de benchmark pour un meme modele
- gerer `context_size`, `precision` et `notes`
- creer et supprimer des modeles LLM
- creer et revoquer des API keys pour des services externes

## Benchmarks detailles

Un GPU peut avoir plusieurs resultats pour :

- des modeles differents
- des quantizations ou precisions differentes
- des contextes differents

L'admin React recharge les `benchmark_results` existants quand vous ouvrez un GPU en modification. Les lignes vides ne doivent plus apparaitre si les donnees existent bien en base.

## API keys

Le panneau `API Keys` permet de :

- creer une cle nommee
- voir son prefixe, son statut et sa derniere utilisation
- revoquer une cle

La valeur complete de la cle n'est affichee qu'une seule fois au moment de la creation.

Header a utiliser cote service externe :

```http
x-api-key: VOTRE_CLE_API
```

## Exemple d'integration externe

Creation d'un modele :

```bash
curl -X POST http://localhost:3000/api/v1/models ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: VOTRE_CLE_API" ^
  -d "{\"name\":\"Qwen 3.5 35B\",\"params_billions\":35,\"description\":\"Ajout externe\"}"
```

Creation d'un GPU :

```bash
curl -X POST http://localhost:3000/api/v1/gpu ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: VOTRE_CLE_API" ^
  -d "{\"name\":\"RTX 6000 Test\",\"vendor\":\"NVIDIA\",\"architecture\":\"Ada\",\"vram\":48,\"bandwidth\":960,\"price\":\"premium\",\"price_value\":6800,\"tier\":\"enterprise\",\"score\":92,\"tokens_8b\":0,\"tokens_32b\":0,\"tokens_70b\":0}"
```

Creation d'un resultat de benchmark :

```bash
curl -X POST http://localhost:3000/api/v1/gpu/1/benchmark ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: VOTRE_CLE_API" ^
  -d "{\"llm_model_id\":1,\"tokens_per_second\":142.5,\"context_size\":32000,\"precision\":\"INT4\",\"notes\":\"Import service externe\"}"
```

## Bonnes pratiques admin

- utiliser les benchmarks detailles pour les mesures reelles par modele
- garder les champs `tokens_8b`, `tokens_32b`, `tokens_70b` seulement pour les donnees legacy
- nommer les API keys par service et environnement
- revoquer immediatement une cle compromise
- ne pas partager la valeur complete d'une cle dans un chat ou un repo
