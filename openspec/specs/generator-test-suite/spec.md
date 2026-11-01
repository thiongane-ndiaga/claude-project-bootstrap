# generator-test-suite Specification

## Purpose
Garantir par des tests automatiques que la sortie du générateur reste correcte pour toutes les combinaisons de modules, qu'aucun changement de modèle n'est involontaire, et que le projet généré est accepté par les outils qu'il utilise.

## Requirements

### Requirement: Matrice des modules
La suite de tests SHALL générer et contrôler, à partir du catalogue : `core` seul, chaque autre module avec ses dépendances, la sélection par défaut (seule, avec une stack, en mode `user`, en mode `local`, en anglais), la sélection complète (modules facultatifs compris), et la sélection complète en dépôt public ou en anglais.

#### Scenario: Module seul avec ses dépendances
- **WHEN** la matrice génère le module `release`
- **THEN** le projet contient aussi les fichiers du module `github`, dont `release` dépend

#### Scenario: Module ajouté au catalogue
- **WHEN** un module est ajouté au catalogue
- **THEN** la matrice génère sa combinaison et le test échoue sur son instantané manquant

#### Scenario: Variante publique
- **WHEN** la sélection complète est générée en dépôt public
- **THEN** ses fichiers dépendant de la visibilité sont contrôlés et figés dans leur propre instantané

#### Scenario: Modes d'installation des CLI
- **WHEN** la matrice génère `default-cli-user` et `default-cli-local`
- **THEN** chacune est contrôlée par les invariants communs et figée dans son instantané, et `default-cli-local` contient `package.json`

#### Scenario: Configuration des variantes anglaises
- **WHEN** la matrice prépare `default-en` et `full-en`
- **THEN** elle retire de la configuration de base les valeurs françaises explicites (`docLanguageName`, `actionsCreditNote`)

#### Scenario: Variantes anglaises
- **WHEN** la matrice génère `default-en` et `full-en`
- **THEN** chacune est contrôlée par les invariants communs, figée dans son instantané, et a les mêmes chemins que sa variante française

### Requirement: Invariants de génération
Pour chaque combinaison, la suite SHALL vérifier : génération terminée avec le code 0; aucun paramètre de la forme `{{NOM_MAJUSCULE}}` ni marqueur `@@module:` ou `@@end` dans les fichiers générés (les expressions `${{ … }}` de GitHub Actions sont légitimes); fichiers JSON valides; fichiers du manifeste présents; clés sans antislash; aucun fin de ligne CRLF; chaque base égale à son fichier, et présente pour tout fichier qui n'est ni fusionné ni propre au projet.

#### Scenario: Paramètre non remplacé
- **WHEN** un modèle contient un paramètre que le générateur ne remplace pas
- **THEN** le test de la combinaison qui le génère échoue en nommant le fichier

#### Scenario: Expression GitHub Actions
- **WHEN** un workflow contient `${{ matrix.os }}`
- **THEN** il n'est pas pris pour un paramètre non remplacé

#### Scenario: Clé de manifeste avec antislash
- **WHEN** une clé du manifeste contient un antislash
- **THEN** le test échoue

### Requirement: Reproductibilité et mise à jour neutre
Pour chaque combinaison, deux générations successives avec la même configuration SHALL produire exactement les mêmes fichiers, et `scaffold.mjs --update --dry-run` exécuté juste après la génération SHALL ne rien créer, remplacer, fusionner, adopter, retirer ni signaler (`created`, `updated`, `merged`, `reconciled`, `adopted`, `retired`, `baseInvalid` et `conflicts` vides, pas de clé `manifest`).

#### Scenario: Deux générations identiques
- **WHEN** une combinaison est générée deux fois avec la même configuration
- **THEN** les listes de fichiers et leurs empreintes sont identiques

#### Scenario: Mise à jour immédiate
- **WHEN** `--update --dry-run` s'exécute juste après la génération
- **THEN** toutes les listes du rapport sont vides

### Requirement: Instantanés de l'arborescence générée
Pour chaque combinaison, la suite SHALL comparer la liste des fichiers générés et leur empreinte SHA-256 à un instantané versionné dans `tests/snapshots/<combinaison>.json`, nommé en anglais. Le manifeste est listé sans empreinte, car il porte la version du plugin, et `.bootstrap/base/` est exclu car dérivé. Les empreintes MUST être identiques sur Linux, Windows et macOS.

#### Scenario: Changement de modèle
- **WHEN** un modèle change sans que l'instantané soit mis à jour
- **THEN** le test échoue en nommant les fichiers qui diffèrent et la commande de mise à jour

#### Scenario: Instantané manquant
- **WHEN** aucun instantané n'existe pour une combinaison
- **THEN** le test échoue avec la commande qui le crée

#### Scenario: Instantané orphelin
- **WHEN** un instantané ne correspond plus à aucune combinaison (module retiré ou renommé)
- **THEN** le test échoue en le nommant

#### Scenario: Version du plugin
- **WHEN** la version du plugin change
- **THEN** aucun instantané ne change

### Requirement: Mise à jour explicite des instantanés
Avec `UPDATE_SNAPSHOTS=1`, la suite SHALL réécrire les instantanés, supprimer les orphelins et continuer à vérifier les invariants. Elle MUST refuser cette variable quand `CI` est définie.

#### Scenario: Mise à jour locale
- **WHEN** la suite s'exécute avec `UPDATE_SNAPSHOTS=1` hors CI
- **THEN** les instantanés sont réécrits, les orphelins supprimés, et les invariants restent contrôlés

#### Scenario: Mise à jour demandée en CI
- **WHEN** `UPDATE_SNAPSHOTS=1` et `CI` sont définis
- **THEN** la suite échoue sans rien écrire

### Requirement: Validation par les CLI réelles
Pour les sélections par défaut, complète et complète en anglais, générées avec les versions de CLI installées, la suite SHALL exécuter `openspec init` puis vérifier qu'il ne modifie aucun fichier suivi, `openspec validate`, `openspec doctor --json` (racine égale au projet), `archgate check`, et l'audit du plugin sur un dépôt git temporaire indépendant du poste, sans écart.

#### Scenario: Projet généré accepté
- **WHEN** la sélection complète est générée et validée avec les CLI réelles
- **THEN** les commandes réussissent, `openspec init` ne modifie aucun fichier suivi et l'audit ne rapporte aucun écart

#### Scenario: Projet généré en anglais accepté
- **WHEN** la sélection complète en anglais est générée et validée avec les CLI réelles
- **THEN** `openspec init --language en`, `openspec validate`, `openspec doctor`, `archgate check` et l'audit réussissent sans écart

#### Scenario: Dépôt git temporaire
- **WHEN** la suite prépare le dépôt de validation
- **THEN** l'identité est fixée, sans signature ni hooks globaux, `pre-push` est exécutable et `core.hooksPath` est réglé

#### Scenario: Langue d'`openspec init`
- **WHEN** la combinaison est générée en anglais
- **THEN** `openspec init` reçoit `--language en`

#### Scenario: Audit sans contrôle non vérifiable
- **WHEN** `openspec` et `archgate` sont tous deux installés
- **THEN** l'audit du projet généré ne laisse aucun contrôle non vérifiable

#### Scenario: Une CLI absente en local
- **WHEN** `archgate` est introuvable, `openspec` présent, et `CI` non défini
- **THEN** seules les vérifications d'Archgate sont ignorées, avec un message qui le nomme, et celles d'OpenSpec s'exécutent

#### Scenario: CLI absentes en CI
- **WHEN** `openspec` ou `archgate` est introuvable et que `CI` est défini
- **THEN** le test échoue en nommant l'outil

### Requirement: Intégration à la CI et documentation
La suite de matrice SHALL être lancée par `.bootstrap/checks.json` avec les autres tests, donc sur les trois systèmes de la CI. `CONTRIBUTING` SHALL décrire comment la lancer, comment mettre à jour les instantanés et relire leur diff, la durée, et la décision sur l'évaluation du skill; les fichiers du dépôt qui citent le test existant (`CLAUDE.md`, modèle de PR) SHALL citer aussi la matrice.

#### Scenario: Commande déclarée
- **WHEN** `.bootstrap/checks.json` est lu
- **THEN** il déclare la commande de la matrice en plus de celle des tests existants

#### Scenario: Documentation de la mise à jour
- **WHEN** `CONTRIBUTING.md` est lu
- **THEN** il décrit `UPDATE_SNAPSHOTS=1`, la durée de la matrice et la politique d'évaluation du skill
