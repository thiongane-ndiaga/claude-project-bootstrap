# forge-labels Specification

## Purpose
Définir les labels que le module `github` crée et pose dans un projet généré, en réutilisant ceux que la forge fournit déjà, et la migration des dépôts qui ont les anciens labels préfixés.

## Requirements

### Requirement: Formulaires avec les labels natifs
Les formulaires d'issues générés SHALL poser les labels natifs de GitHub pour les types qui en ont un : `bug` pour un bug, `enhancement` pour une fonctionnalité. Le formulaire de décision d'architecture SHALL poser le label `adr`.

#### Scenario: Formulaires générés
- **WHEN** un projet est généré avec le module `github`
- **THEN** `bug.yml` pose `bug`, `feature.yml` pose `enhancement`, et `architecture-decision.yml` (avec le module `archgate`) pose `adr`

#### Scenario: Cohérence avec le fichier des labels
- **WHEN** un projet est généré
- **THEN** chaque label posé par un formulaire figure dans `.github/labels.json`

### Requirement: Labels du plugin sans équivalent natif
`.github/labels.json` SHALL décrire quatre labels aux noms plats : `bug` et `enhancement` (natifs), `adr` et `chore` (propres au plugin). Il MUST NOT contenir de label préfixé `type:` ni `needs-adr`. Les labels `adr` et `chore` sont créés même si le module `archgate` est absent.

#### Scenario: Fichier généré
- **WHEN** `.github/labels.json` est généré
- **THEN** il contient exactement `bug`, `enhancement`, `adr` et `chore`, et les deux premiers sont marqués natifs

### Requirement: Synchronisation non destructive
Le script de synchronisation SHALL lister les labels du dépôt avant d'agir, comparer les noms sans tenir compte de la casse, créer ceux qui manquent, et MUST NOT modifier la couleur ni la description d'un label natif déjà présent. Il SHALL mettre à jour la couleur et la description des seuls labels propres au plugin.

#### Scenario: Label natif existant
- **WHEN** le dépôt a déjà `bug` avec sa description d'origine
- **THEN** la synchronisation ne modifie pas `bug`

#### Scenario: Label natif avec une autre casse
- **WHEN** le dépôt a `Bug` à la place de `bug`
- **THEN** la synchronisation ne crée pas de second label et ne modifie pas `Bug`

#### Scenario: Label natif absent
- **WHEN** le dépôt n'a pas `enhancement`
- **THEN** la synchronisation le crée avec la couleur et la description du fichier

#### Scenario: Label du plugin
- **WHEN** `adr` existe avec une autre couleur que celle du fichier
- **THEN** la synchronisation le met à jour

### Requirement: Échec de lecture des labels
Si la liste des labels du dépôt ne peut pas être lue, la synchronisation SHALL se terminer avec un code non nul et MUST NOT créer ni modifier aucun label.

#### Scenario: Dépôt inaccessible
- **WHEN** la lecture des labels échoue (authentification ou droits)
- **THEN** aucun label n'est créé ni modifié et le code de sortie est non nul

### Requirement: Principe de réutilisation
Le skill SHALL énoncer qu'avant de créer un label, un statut, un type de ticket ou une colonne, le plugin liste ce que l'outil cible fournit déjà, réutilise l'existant quand le sens correspond, et ne crée que ce qui manque.

#### Scenario: Documentation du principe
- **WHEN** le skill `SKILL.md` est lu
- **THEN** il contient le principe « réutiliser avant de créer », applicable aux modules de forge ou de suivi

### Requirement: Migration vers les labels natifs
Une migration `0002-native-labels` SHALL, pour un dépôt du module `github` qui a les anciens labels `type:bug`, `type:feature`, `type:adr` ou `type:chore`, proposer des actions qui créent le label de remplacement s'il manque, le posent sur chaque issue et pull request portant l'ancien label, puis suppriment l'ancien label. La correspondance est `type:bug` → `bug`, `type:feature` → `enhancement`, `type:adr` → `adr`, `type:chore` → `chore`.

#### Scenario: Simulation
- **WHEN** la migration s'exécute sans `--apply`
- **THEN** elle liste les actions, le nombre d'éléments touchés par ancien label figure dans leur description, et rien n'est modifié

#### Scenario: Application
- **WHEN** la migration s'exécute avec `--apply`
- **THEN** chaque issue et pull request portant un ancien label reçoit le nouveau, puis l'ancien label est supprimé, et la migration est consignée dans le manifeste

#### Scenario: Dépôt sans ancien label
- **WHEN** le dépôt n'a aucun des anciens labels
- **THEN** la migration ne propose aucune action

### Requirement: Dépôt visé par la migration
Toutes les commandes de la migration SHALL viser explicitement le dépôt reçu en paramètre, quel que soit le dossier d'exécution.

#### Scenario: Dépôt visé
- **WHEN** la migration s'exécute depuis un dossier quelconque
- **THEN** chaque commande vise le dépôt reçu en paramètre et aucun autre

### Requirement: Liste complète des éléments avant suppression
La migration SHALL lister tous les éléments portant un ancien label sans plafond, issues et pull requests, ouvertes et fermées. Elle MUST NOT proposer la suppression d'un ancien label dont la liste n'a pas pu être lue en entier.

#### Scenario: Plus de mille éléments
- **WHEN** un ancien label est posé sur plus de mille éléments
- **THEN** tous reçoivent le nouveau label avant la suppression de l'ancien

#### Scenario: Liste incomplète
- **WHEN** la lecture des éléments d'un ancien label échoue
- **THEN** la migration échoue sans supprimer ce label

### Requirement: Ordre des actions et reprise
Pour chaque ancien label, la migration SHALL créer le remplaçant, puis poser le nouveau label sur tous les éléments, puis seulement supprimer l'ancien. Un échec en cours d'application MUST laisser tous les éléments étiquetés, et une nouvelle exécution SHALL ne proposer que les actions restantes.

#### Scenario: Échec pendant l'application
- **WHEN** une pose de label échoue au milieu de l'application, puis la migration est relancée
- **THEN** l'ancien label existe encore, aucun élément n'a perdu d'étiquette, et la relance ne propose que les actions restantes

### Requirement: Label needs-adr
La migration SHALL supprimer `needs-adr` seulement s'il n'est posé sur aucune issue ni pull request; sinon elle le conserve et indique dans une note combien d'éléments le portent.

#### Scenario: needs-adr inutilisé
- **WHEN** `needs-adr` n'est posé nulle part
- **THEN** la migration le supprime

#### Scenario: needs-adr utilisé
- **WHEN** `needs-adr` est posé sur au moins une issue ou pull request
- **THEN** la migration le conserve et indique dans ses notes combien d'éléments le portent

#### Scenario: needs-adr seul ancien label restant et utilisé
- **WHEN** `needs-adr` est utilisé et que c'est le seul ancien label présent
- **THEN** la migration ne propose aucune action, n'est pas consignée comme appliquée, et la note est donnée à chaque exécution

### Requirement: Idempotence de la migration
Le calcul des actions de la migration SHALL dépendre de l'état réel du dépôt : une fois les anciens labels supprimés, il ne propose plus aucune action.

#### Scenario: État après application
- **WHEN** les actions sont calculées sur un dépôt où les anciens labels ont disparu et les nouveaux sont posés
- **THEN** aucune action n'est proposée

### Requirement: Notes d'une migration
Le moteur de migration SHALL accepter qu'une migration renvoie, en plus de ses actions, des notes d'information, les reprendre dans son résultat sans les exécuter, et rester compatible avec les migrations qui ne renvoient qu'une liste d'actions. Le skill SHALL demander de présenter ces notes à l'utilisateur.

#### Scenario: Migration avec notes
- **WHEN** une migration renvoie des actions et des notes
- **THEN** le résultat contient les deux et seules les actions sont exécutées avec `--apply`

#### Scenario: Migration sans notes
- **WHEN** une migration renvoie seulement un tableau d'actions
- **THEN** son résultat contient une liste de notes vide
