# project-setup-action Specification

## Purpose
Offrir aux projets générés un point d'extension de la CI où installer leur chaîne d'outils sans modifier `ci.yml`, qui reste entièrement géré par le plugin et se met à jour sans conflit.

## Requirements

### Requirement: Action de préparation propre au projet
Le module `github` SHALL générer `.github/actions/project-setup/action.yml`, une action composite locale qui appartient ensuite au projet : le générateur la crée si elle est absente et MUST NOT la remplacer, la fusionner ni la signaler en conflit ensuite. L'action générée contient un nom, une description, `runs.using: composite` et une seule étape, en `shell: bash`, qui n'exécute qu'un `echo`.

#### Scenario: Première génération
- **WHEN** un projet est généré avec le module `github`
- **THEN** `.github/actions/project-setup/action.yml` existe, est consignée au manifeste avec le statut `kept`, et contient exactement une étape `shell: bash` qui n'exécute qu'un `echo`

#### Scenario: Mise à jour après personnalisation
- **WHEN** le projet a rempli l'action puis le modèle du plugin change
- **THEN** l'action du projet est conservée telle quelle et n'apparaît ni dans les conflits ni dans les fichiers remplacés

#### Scenario: Action supprimée par le projet
- **WHEN** le projet a supprimé l'action alors que `ci.yml` l'appelle, puis `--update` s'exécute
- **THEN** l'action est recréée à partir du modèle

#### Scenario: Projet sans le module github
- **WHEN** un projet est généré sans le module `github`
- **THEN** l'action n'existe pas et `docs/workflow.md` ne la cite pas

### Requirement: Appel de l'action par la CI générée
Le `ci.yml` généré SHALL appeler `./.github/actions/project-setup` dans le job `checks`, après le checkout et l'installation de Node, avant l'étape qui lance les commandes de `.bootstrap/checks.json`. Les noms des jobs et des checks MUST rester inchangés.

#### Scenario: Ordre des étapes
- **WHEN** `ci.yml` est généré
- **THEN** l'appel de l'action vient après `actions/checkout` et avant l'étape « Commandes du projet »

#### Scenario: Checks exigés par la protection de la branche
- **WHEN** `ci.yml` est généré
- **THEN** les jobs `plan`, `checks` et `pr-title` gardent leurs noms, de sorte que les checks `checks (<système>)` exigés restent identiques

### Requirement: Mise à jour d'un projet existant
La mise à jour d'un projet généré avant ce changement SHALL ajouter l'action et traiter `ci.yml` selon les règles de mise à jour existantes : remplacé s'il est resté tel que généré, fusionné à partir de sa base si la modification du projet est éloignée de la ligne remplacée, signalé en conflit sinon, sans jamais écrire de marqueurs de conflit. L'action est créée dans tous les cas.

#### Scenario: ci.yml resté tel que généré
- **WHEN** `--update` s'exécute sur un projet dont `ci.yml` est resté tel que généré
- **THEN** `ci.yml` figure dans `updated`, l'action dans `created`, son statut au manifeste est `kept` et le code de sortie est 0

#### Scenario: ci.yml modifié loin de la ligne remplacée
- **WHEN** le projet a modifié `ci.yml` ailleurs qu'à l'emplacement de l'ancien commentaire d'installation et dispose d'une base valide
- **THEN** `ci.yml` figure dans `reconciled` et l'action est créée

#### Scenario: ci.yml modifié à l'emplacement remplacé
- **WHEN** le projet a modifié `ci.yml` à l'emplacement de l'ancien commentaire d'installation, ou n'a pas de base
- **THEN** `ci.yml` figure dans `conflicts`, reste intact, le code de sortie est 3 et l'action est quand même créée

#### Scenario: Deuxième mise à jour
- **WHEN** `--update` s'exécute une seconde fois sans changement
- **THEN** rien n'est créé, remplacé ni signalé

### Requirement: Règle d'épinglage des actions
La règle Archgate d'épinglage des actions du module `archgate` SHALL accepter les actions locales (`uses: ./…`), qui n'ont pas de SHA, exiger un SHA complet pour toute autre action, et couvrir `.github/workflows/` et `.github/actions/`.

#### Scenario: Action locale dans ci.yml
- **WHEN** `ci.yml` appelle `./.github/actions/project-setup`
- **THEN** `archgate check` ne signale aucune violation d'épinglage

#### Scenario: Action externe non épinglée dans une action du projet
- **WHEN** une action composite du projet appelle une action externe sans SHA complet
- **THEN** `archgate check` signale une violation

### Requirement: Compatibilité de l'action avec la CI générée
Le modèle de l'action SHALL ne comporter que les champs requis d'une action composite, un `shell` sur chaque étape `run`, et aucune dépendance externe. Son exécution sur Linux, Windows et macOS se vérifie par la CI du dépôt du plugin, qui exécute l'action sur la matrice de systèmes, et non par les tests du générateur.

#### Scenario: Modèle valide
- **WHEN** le modèle de l'action est contrôlé par les tests
- **THEN** il contient `name`, `description`, `runs.using: composite` et un `shell` sur chaque étape `run`

#### Scenario: Exécution sur la matrice de la CI
- **WHEN** la CI du dépôt s'exécute sur ubuntu, windows et macos avec l'action
- **THEN** l'étape de l'action réussit sur chacun des trois systèmes

### Requirement: Documentation du point d'extension
Le `docs/workflow.md` généré avec le module `github` SHALL indiquer que l'installation de la chaîne d'outils se place dans `.github/actions/project-setup/action.yml` et non dans `ci.yml`.

#### Scenario: Section des commandes du projet
- **WHEN** `docs/workflow.md` est généré avec le module `github`
- **THEN** il cite `project-setup` comme emplacement de l'installation des outils et ne demande plus de modifier `ci.yml`
