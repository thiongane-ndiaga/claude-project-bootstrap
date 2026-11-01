## ADDED Requirements

### Requirement: Dossier d'état qui s'ignore seul
Le script `state.mjs` SHALL ranger ses fichiers dans `<dépôt>/.bootstrap/local/` (`state.json`, `effects.json`) et créer dans ce dossier un `.gitignore` réduit à `*`. Git MUST NOT suivre ces fichiers, y compris avant la génération des fichiers du projet et dans un dépôt dont le `.gitignore` n'a pas été mis à jour. L'écriture SHALL être atomique, et le script MUST NOT écrire hors de `.bootstrap/local/` ni dans un dossier cible inexistant.

#### Scenario: Dépôt neuf
- **WHEN** `init` est lancé dans un dépôt git sans `.gitignore`
- **THEN** `git status` ne liste rien et `git check-ignore .bootstrap/local/state.json` réussit

#### Scenario: Cible inexistante
- **WHEN** `init`, `step` ou `effect` reçoit un dossier cible inexistant
- **THEN** le script s'arrête avec le code 1 sans créer le dossier

### Requirement: État de reprise
`state.json` SHALL contenir la version du format, la version du plugin, les réponses (les seules clés du schéma de `bootstrap.json`) et, pour chaque étape, un statut (`doing`, `done`, `failed`, `skipped`), une date et une note. Les clés hors schéma, jeton compris, MUST NOT être enregistrées et SHALL être signalées.

#### Scenario: Initialisation
- **WHEN** `init --config <bootstrap.json>` est lancé et que la configuration contient une clé `token`
- **THEN** `state.json` contient la configuration sans `token` et `init` signale la clé ignorée

#### Scenario: Statut enregistré
- **WHEN** `step --id phase2-git --status done --note ok` est lancé
- **THEN** l'étape est consignée avec sa date et sa note

#### Scenario: Second init
- **WHEN** `init` est relancé alors que l'état existe
- **THEN** le script s'arrête avec le code 1 et l'avancement est conservé

#### Scenario: Étape inconnue
- **WHEN** `step` reçoit un statut ou un identifiant d'étape inconnu
- **THEN** le script s'arrête avec le code 1 sans modifier l'état

### Requirement: Garde-fous sur l'état
`init` MUST être refusé quand un état existe, sauf avec `--force` qui repart de zéro. `step` sans état MUST être refusé. Un état illisible ou d'une version de format inconnue MUST être refusé sans être écrasé.

#### Scenario: Sans état
- **WHEN** `step` est lancé avant `init`
- **THEN** le script s'arrête avec le code 1 en renvoyant à `init`

#### Scenario: État illisible
- **WHEN** `state.json` n'est pas du JSON
- **THEN** le script s'arrête avec le code 1 et le fichier n'est pas modifié

### Requirement: Configuration restituée
`config --set <fichier>` SHALL fusionner une configuration dans les réponses enregistrées, et `config --out <fichier>` SHALL écrire les réponses enregistrées dans un fichier utilisable par `scaffold.mjs --config`, car `bootstrap.json` vit dans le scratchpad d'une session qui n'existe plus après un redémarrage.

#### Scenario: Nouvelle session
- **WHEN** `config --out` est lancé après un redémarrage
- **THEN** le fichier écrit contient les réponses de la phase 0 et les versions résolues de la phase 1, identiques à celles enregistrées

### Requirement: Étapes et prochaine étape
Les étapes SHALL être ordonnées de la phase 0 à la phase 4, `phase2-cli` suivant `phase2-generate` quand `cliInstall` vaut `local`. `next` SHALL renvoyer la première étape applicable qui n'est ni `done` ni `skipped`. Une étape propre à un module MUST être ignorée quand ce module n'est pas choisi ; l'acceptation des ADR exige `archgate` et `github`.

#### Scenario: Module absent
- **WHEN** le module `githooks` n'est pas choisi
- **THEN** l'étape des hooks git n'est jamais renvoyée par `next`

#### Scenario: Mode local
- **WHEN** `cliInstall` vaut `local`
- **THEN** l'installation des CLI est proposée après la génération

#### Scenario: Tout est fait
- **WHEN** toutes les étapes applicables sont `done`
- **THEN** `next` renvoie `null`

### Requirement: Reprise après redémarrage
`resume` SHALL être en lecture seule et renvoyer la prochaine étape, les réponses et les incohérences entre l'état et les preuves vérifiables : `.git`, manifeste, `openspec/config.yaml` et `core.hooksPath`. Une étape `done` dont la preuve manque MUST être signalée et redevenir la prochaine ; une étape `doing` ou `failed` MUST être proposée de nouveau avec sa note. Sur un dossier inexistant ou sans `.bootstrap/local/`, `resume` SHALL réussir et renvoyer `phase0-scope`.

#### Scenario: Arrêt après chaque étape
- **WHEN** l'avancement s'arrête après n'importe quelle étape applicable
- **THEN** `resume` renvoie l'étape suivante

#### Scenario: Preuve manquante
- **WHEN** `phase2-generate` est `done` mais `.bootstrap/manifest.json` n'existe pas
- **THEN** `resume` signale l'incohérence et renvoie `phase2-generate`

#### Scenario: Interruption en cours d'étape
- **WHEN** une étape est `doing`
- **THEN** `resume` la renvoie avec son statut `doing`

#### Scenario: Lecture seule
- **WHEN** `resume` est lancé sur un dépôt sans état
- **THEN** aucun fichier n'est créé ni modifié

### Requirement: Déduction sans état
Sans `state.json`, `resume` SHALL déduire l'avancement des preuves du dépôt, lire les modules et la configuration dans le manifeste quand il existe, marquer faites les étapes non vérifiables qui précèdent une étape prouvée, et indiquer les étapes déduites.

#### Scenario: Dépôt déjà généré
- **WHEN** le dépôt a un `.git`, un manifeste et `openspec/config.yaml` mais pas d'état
- **THEN** `resume` déduit les phases 0 et 1, git, la génération, l'installation des CLI et `openspec`, et renvoie l'étape suivante

### Requirement: Détection de l'état
`scaffold.mjs --detect` SHALL rapporter `resumable: true` quand `.bootstrap/local/state.json` existe.

#### Scenario: État présent
- **WHEN** `--detect` est lancé sur un dépôt avec un état de reprise
- **THEN** `resumable` vaut `true`, et `false` sans état

### Requirement: Journal des effets globaux
`effect` SHALL consigner dans `effects.json`, avant l'action, une entrée avec un identifiant, le type, la commande (chaîne et tableau d'arguments), la **valeur précédente lue à ce moment**, la commande d'annulation (chaîne et tableau) et le statut `planned`. Les types SHALL être `npm-global`, `git-config-global`, `plugin`, `marketplace` et `custom`. `effect --done <id>` SHALL passer le statut à `applied` (`failed` avec `--failed`). Le script MUST NOT exécuter l'action ni l'annulation.

#### Scenario: Valeur précédente d'une configuration git
- **WHEN** `effect --kind git-config-global --key core.autocrlf --value input` est lancé alors que la valeur actuelle est `true`
- **THEN** l'entrée consigne `true` et une annulation qui la rétablit

#### Scenario: Clé git à plusieurs valeurs
- **WHEN** la clé git a plusieurs valeurs
- **THEN** le script refuse l'entrée, car l'annulation supprimerait toutes les valeurs

#### Scenario: Installation npm globale
- **WHEN** `effect --kind npm-global --package archgate --version 1.2.3` est lancé alors que le paquet est absent
- **THEN** l'annulation est un `npm uninstall -g`, et si une version était installée elle réinstalle cette version

#### Scenario: Aucune exécution
- **WHEN** un effet est consigné
- **THEN** seules des commandes de lecture ont été lancées

### Requirement: Entrées du journal contrôlées
`effect` MUST refuser toute entrée hors de sa liste blanche (nom de paquet npm, version exacte, clé git `section.nom`, portée `user`, `project` ou `local`), et ne pas passer à un shell d'argument hors des caractères sûrs. `--prefix` MUST être refusé sous Windows.

#### Scenario: Entrée hors liste blanche
- **WHEN** un nom de paquet contient un espace, `&`, `|` ou `;`
- **THEN** le script s'arrête avec le code 1 sans modifier le journal

### Requirement: Annulation prudente des plugins et marketplaces
Pour les types `plugin` et `marketplace`, `effect` SHALL lire l'état existant avant l'action. Si l'élément est déjà présent, l'annulation MUST être absente et un avertissement SHALL l'expliquer ; si la lecture est impossible, l'annulation SHALL être accompagnée d'un avertissement.

#### Scenario: Marketplace déjà ajoutée
- **WHEN** la marketplace existait avant l'action
- **THEN** l'entrée n'a pas d'annulation et indique de ne pas la retirer

### Requirement: Liste d'annulation
`effects --undo` SHALL afficher les commandes d'annulation des effets `applied`, de la plus récente à la plus ancienne, sans les exécuter ; une annulation inconnue MUST être signalée comme manuelle. `effects` seul liste les entrées avec leur statut.

#### Scenario: Ordre d'annulation
- **WHEN** deux effets sont `applied`
- **THEN** `effects --undo` liste l'annulation du plus récent en premier

### Requirement: Intégration au skill
`SKILL.md` SHALL demander `resume` au début d'une session de bootstrap, `config --out` pour restituer `bootstrap.json`, `step --status doing` avant chaque étape puis `done`, `effect` avant chaque action globale à la machine (une entrée par paquet npm) puis `effect --done`, et SHALL proposer `effects --undo` en fin de phase 2.

#### Scenario: Documentation du skill
- **WHEN** `SKILL.md` est lu
- **THEN** il cite `state.mjs resume`, `config`, `step`, `effect` et `effects --undo` aux étapes concernées, et nomme chaque étape
