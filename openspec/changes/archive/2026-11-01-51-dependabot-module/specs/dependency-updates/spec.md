## ADDED Requirements

### Requirement: Module optionnel de mise à jour des actions
Le catalogue SHALL déclarer un module `dependabot`, non sélectionné par défaut, qui requiert `github`. Le module SHALL générer `.github/dependabot.yml` et MUST NOT générer d'autre fichier.

#### Scenario: Module absent
- **WHEN** un projet est généré sans le module `dependabot`
- **THEN** `.github/dependabot.yml` n'existe pas

#### Scenario: Module choisi
- **WHEN** un projet est généré avec les modules `github` et `dependabot`
- **THEN** `.github/dependabot.yml` existe et figure dans le manifeste

#### Scenario: Dépendance non satisfaite
- **WHEN** le module `dependabot` est demandé sans `github`
- **THEN** `scaffold.mjs` refuse la configuration (code de sortie 1), comme pour tout module dont une dépendance manque

#### Scenario: Ajout à un projet existant
- **WHEN** un projet déjà généré complète `modules` avec `dependabot`
- **THEN** la mise à jour crée `.github/dependabot.yml` sans modifier les autres fichiers du projet

### Requirement: Configuration des mises à jour
`.github/dependabot.yml` SHALL déclarer l'écosystème `github-actions` pour les workflows (`/`) et les actions composites locales (`/.github/actions/*`), regrouper toutes les mises à jour en une seule PR, appliquer un `cooldown` de 14 jours, préfixer les messages de commit par `ci` avec le scope `deps`, et poser le label `chore` du dépôt au lieu des labels par défaut de Dependabot.

#### Scenario: Fichier généré
- **WHEN** `.github/dependabot.yml` est généré
- **THEN** il contient `package-ecosystem: "github-actions"`, les répertoires `/` et `/.github/actions/*`, un groupe couvrant `*`, `default-days: 14`, `prefix: "ci"`, `include: "scope"` et le label `chore`

#### Scenario: Aucun paramètre résiduel
- **WHEN** le fichier est généré
- **THEN** il ne contient ni `{{…}}` ni marqueur `@@`

### Requirement: Titres de PR acceptés par le contrôle
Le titre produit par la configuration (`ci(deps): …`) SHALL être accepté par `scripts/check-pr-title.mjs`, afin que les PR de mise à jour passent le job `pr-title` sans intervention.

#### Scenario: Titre de PR de Dependabot
- **WHEN** `check-pr-title.mjs` reçoit le titre `ci(deps): bump the actions group with 2 updates`
- **THEN** le contrôle réussit

### Requirement: Exception de traçabilité des PR de Dependabot
Quand le module `dependabot` est choisi, `docs/workflow.md`, l'ADR de conventions (ARCH-005) et l'agent `traceability-checker` générés SHALL indiquer que les PR de Dependabot (branche `dependabot/…`, titre `ci(deps): …`) n'ont ni branche `<type>/<issue>-<slug>` ni `Closes #N`.

#### Scenario: Module choisi
- **WHEN** un projet est généré avec les modules `github`, `claude`, `archgate` et `dependabot`
- **THEN** ces trois fichiers mentionnent l'exception

#### Scenario: Module absent
- **WHEN** le module `dependabot` n'est pas choisi
- **THEN** aucun de ces fichiers ne mentionne Dependabot

### Requirement: Règle de choix des versions documentée
La documentation du plugin SHALL expliquer que `resolve-versions.mjs` choisit les actions par numéro de version avec un délai d'ancienneté de 14 jours par défaut, que le `cooldown` de Dependabot reproduit ce délai, et que les SHA épinglés portent un commentaire `# <tag>` que Dependabot met à jour.

#### Scenario: Référence de versionnement
- **WHEN** une personne cherche comment les actions épinglées sont mises à jour
- **THEN** `references/versioning.md` décrit la règle et le rôle du module `dependabot`
