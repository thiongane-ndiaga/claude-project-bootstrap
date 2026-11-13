# jira-module Specification

## Purpose
Relier en option le workflow généré à Jira : clé Jira contrôlée dans le titre ou la branche de chaque PR, et source du besoin au choix par projet (issues GitHub ou tickets Jira), avec la documentation des étapes manuelles et des limites.

## Requirements

### Requirement: Module jira
Le module `jira` SHALL être optionnel (`default: false`), exiger `github` et générer `scripts/check-jira-key.mjs` et `docs/jira.md`. Sans le module, aucun de ces éléments ni aucun bloc Jira n'apparaît dans les fichiers générés, qui restent identiques.

#### Scenario: Module actif
- **WHEN** un projet est généré avec `jira`
- **THEN** le script et la documentation existent et le job `pr-title` exécute le script

#### Scenario: Module absent
- **WHEN** un projet est généré sans `jira`
- **THEN** ni ces fichiers ni les blocs Jira n'existent et le gabarit de PR garde `Closes #`

#### Scenario: Sans github
- **WHEN** `jira` est demandé sans `github`
- **THEN** la génération est refusée (code 1)

### Requirement: Clés jira et jiraSource
La clé `jira` SHALL être une clé de projet `[A-Z][A-Z0-9]{1,9}`, facultative ; `jiraSource` SHALL valoir `github` ou `jira` (absente = `github`, une valeur donnée est consignée). Les deux sont refusées sans le module, héritées par `--update` et par la reprise de session, retirées par `null` ; retirer le module alors que l'une est héritée échoue.

#### Scenario: Valeur invalide
- **WHEN** `jira` ne respecte pas le motif ou `jiraSource` vaut une autre valeur
- **THEN** la génération est refusée (code 1)

#### Scenario: Sans le module
- **WHEN** `jira` ou `jiraSource` est donnée sans le module `jira`
- **THEN** la génération est refusée (code 1)

#### Scenario: Héritage et retrait
- **WHEN** un projet `jiraSource: jira` est mis à jour sans la clé, puis avec `jiraSource: null`
- **THEN** le mode `jira` est conservé, puis retiré sans être consigné

#### Scenario: Retrait du module
- **WHEN** `--update` retire le module alors qu'une des clés est héritée
- **THEN** la commande échoue (code 1), sauf avec `null` pour les deux

### Requirement: Contrôle de la clé Jira
`scripts/check-jira-key.mjs` SHALL lire `PR_TITLE` et `HEAD_REF` dans l'environnement et réussir seulement si la clé Jira figure, comme mot entier, dans le titre ou la branche. En mode `jira`, la branche SHALL commencer par `<type>/<CLE-N>-`. `dependabot/` et `release-please--` sont exemptées. Sans clé `jira`, toute clé `[A-Z][A-Z0-9]+-N` est acceptée.

#### Scenario: Clé dans la branche
- **WHEN** la branche est `feat/ABC-12-import` et le titre n'a pas de clé, en mode `github`
- **THEN** le contrôle réussit

#### Scenario: Clé absente
- **WHEN** ni le titre ni la branche n'ont de clé
- **THEN** le contrôle échoue et donne un exemple avec la clé en description du titre

#### Scenario: Autre projet ou mot plus long
- **WHEN** la clé du projet est `ABC` et seule `XYZ-1` ou `XABC-12` figure
- **THEN** le contrôle échoue

#### Scenario: Mode jira
- **WHEN** `jiraSource` vaut `jira` et la branche est `feat/import` (clé dans le titre) ou `feat/abc-12-x`
- **THEN** le contrôle échoue : la branche doit être `<type>/<CLE-N>-<slug>`

#### Scenario: Exemptions
- **WHEN** la branche commence par `dependabot/` ou `release-please--`
- **THEN** le contrôle réussit

### Requirement: Conventions du mode jira
En mode `jira`, les modèles listés dans la conception SHALL poser la branche `<type>/<CLE-N>-<slug>`, l'id OpenSpec en minuscules `<cle-n>-<slug>`, l'en-tête `Ticket: CLE-N` de `proposal.md` et `Refs CLE-N` au lieu de `Closes #N` ; `spec-review` et `spec-reviewer` ne lisent pas le ticket par `gh`. En mode `github`, ils gardent `Closes #N` et ajoutent la clé Jira en lien.

#### Scenario: Corps de PR
- **WHEN** un projet est généré avec `jiraSource: jira`
- **THEN** le gabarit de PR contient `Refs` et pas `Closes #`, et `openspec-config.md` annonce `Ticket:`

#### Scenario: Mode github
- **WHEN** un projet est généré avec `jira` sans `jiraSource`
- **THEN** le gabarit garde `Closes #`, ajoute la ligne Jira, et les formulaires ont un champ « Clé Jira »

### Requirement: Documentation des étapes manuelles
`docs/jira.md` (français et anglais) SHALL lister les étapes manuelles (projet Jira, app Jira Cloud pour GitHub, « Autolink references », fermeture des tickets), les règles de nommage (clé dans la description du titre, branche non renommable), la proposition de désactiver `projects`, les limites (faux positifs sans clé de projet, aucun essai réel, aucune écriture dans Jira) et, en mode `jira` seulement, la table de lecture « issue → ticket ».

#### Scenario: Étapes présentes
- **WHEN** un projet est généré avec `jira`, en français puis en anglais
- **THEN** `docs/jira.md` contient ces éléments, la table de lecture seulement en mode `jira`
