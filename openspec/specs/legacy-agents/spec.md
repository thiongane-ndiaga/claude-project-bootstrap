# legacy-agents Specification

## Purpose
Garder une seule famille d'agents par projet : avec agent-profiles, les agents historiques ne sont plus générés, leurs méthodes sont dans les profils et une migration retire les fichiers des projets existants.

## Requirements

### Requirement: Agents historiques conditionnés
Le catalogue SHALL connaître un pseudo-module `legacy-agents`, actif quand `agent-profiles` n'est pas sélectionné. Les fichiers `architecture-explorer.md`, `arc42-keeper.md`, `spec-reviewer.md`, `traceability-checker.md` et `restrict-path.mjs` SHALL être générés seulement quand il est actif (et que leur module l'est).

#### Scenario: Avec agent-profiles
- **WHEN** un projet est généré avec `agent-profiles`, `archgate`, `arc42`, `openspec` et `github`
- **THEN** aucun de ces cinq fichiers n'est généré

#### Scenario: Sans agent-profiles
- **WHEN** un projet est généré sans `agent-profiles`
- **THEN** les agents de leurs modules et `restrict-path.mjs` sont générés comme avant

### Requirement: Méthodes absorbées par architect
Avec `agent-profiles`, `architect` SHALL porter la méthode de comparaison d'options (critères, tableau critères × options, source par affirmation, « non vérifié » sinon) sous le module `archgate`, et les règles de mise à jour d'arc42 sous le module `arc42`. Il MUST NOT citer `architecture-explorer` ni `arc42-keeper`.

#### Scenario: Profil architect
- **WHEN** `architect` est généré avec `archgate` et `arc42`
- **THEN** il contient la méthode de comparaison et les règles arc42, et aucun des deux anciens noms

#### Scenario: Module arc42 absent
- **WHEN** `architect` est généré sans `arc42`
- **THEN** il ne mentionne pas arc42

### Requirement: Méthodes absorbées par qa-engineer
Avec `agent-profiles`, `qa-engineer` SHALL porter la méthode de revue de spec sous le module `openspec` et le contrôle de traçabilité sous le module `github`, avec les mentions d'ADR, d'arc42 et de Dependabot conditionnées à leurs modules. Il MUST NOT citer `spec-reviewer` ni `traceability-checker`.

#### Scenario: Profil qa-engineer
- **WHEN** `qa-engineer` est généré avec `openspec` et `github`
- **THEN** il contient la revue de spec et le contrôle de traçabilité, et aucun des deux anciens noms

#### Scenario: Exception Dependabot
- **WHEN** `qa-engineer` est généré avec `dependabot`
- **THEN** il indique que les PR de Dependabot n'ont ni branche `<type>/<issue>-<slug>` ni `Closes #N`

### Requirement: Textes générés selon les agents présents
Les fichiers générés qui nomment un agent historique (`docs/workflow.md`, ARCH-001 et ARCH-002 du module `archgate`, `project-lead`, `devops-engineer`) SHALL le nommer quand `legacy-agents` est actif et nommer le profil porteur (`architect`, `qa-engineer`) quand `agent-profiles` est actif.

#### Scenario: Aucun nom orphelin
- **WHEN** un projet est généré avec `agent-profiles` et tous les modules
- **THEN** aucun fichier généré ne contient `architecture-explorer`, `arc42-keeper`, `spec-reviewer` ni `traceability-checker`

### Requirement: Migration des projets existants
Une migration SHALL retirer d'un projet dont le manifeste a le module `agent-profiles` les fichiers des quatre agents et `restrict-path.mjs`, ainsi que leur copie `.bootstrap/base/<chemin>.base` et leur entrée du manifeste, seulement si le fichier existe, si cette copie existe et si le fichier (fins de ligne ramenées à LF) lui est égal. Tout autre fichier MUST être conservé et signalé dans les notes. La migration MUST NOT s'appliquer sans `agent-profiles`.

#### Scenario: Fichier intact
- **WHEN** la migration s'applique à un projet avec `agent-profiles` et des fichiers égaux à leur copie de base
- **THEN** les fichiers, leurs copies et leurs entrées du manifeste sont retirés et la migration est consignée

#### Scenario: Fichier modifié
- **WHEN** `spec-reviewer.md` diffère de sa copie de base
- **THEN** il est conservé et une note le signale

#### Scenario: Fichier sans copie de base
- **WHEN** un fichier à retirer n'a pas de copie de base (fichier conservé par `keep`, adopté ou fusionné)
- **THEN** il est conservé et une note le signale

#### Scenario: Après la mise à jour
- **WHEN** la migration s'applique après `scaffold.mjs --update`, qui a retiré les cinq entrées du manifeste
- **THEN** les fichiers intacts sont retirés d'après leur copie de base

#### Scenario: Fichiers absents ou tous modifiés
- **WHEN** aucun fichier n'est à retirer
- **THEN** seules des notes sont rendues et la migration n'est pas consignée ; un second passage donne le même résultat

#### Scenario: Sans agent-profiles
- **WHEN** le manifeste n'a pas `agent-profiles`
- **THEN** la migration n'est pas proposée

### Requirement: Migrations sans dépôt GitHub
`migrate.mjs` SHALL ne demander le dépôt GitHub qu'aux migrations qui appellent `gh` : sans dépôt, elles sont ignorées avec une note et les migrations de fichiers restent proposées.

#### Scenario: Projet sans remote GitHub
- **WHEN** `migrate.mjs` est lancé sur un projet avec `agent-profiles`, `github` et sans remote GitHub
- **THEN** les migrations de forge sont ignorées avec une note et la migration des agents est proposée, sans erreur

### Requirement: Génération sans référence aux fichiers retirés
Avec `agent-profiles`, aucun fichier généré, `.claude/settings.json` compris, MUST référencer `restrict-path.mjs` ni l'un des quatre agents.

#### Scenario: Références
- **WHEN** un projet est généré avec `agent-profiles` et tous les modules
- **THEN** aucun fichier généré ne contient ces noms

### Requirement: Outils de architect et qa-engineer
`architect` et `qa-engineer` MUST NOT déclarer l'outil `Agent` dans leur frontmatter et MUST NOT contenir de phrase les autorisant à lancer des agents ; `architect` garde `Skill` pour `archgate:adr-author`.

#### Scenario: Frontmatter
- **WHEN** `architect` et `qa-engineer` sont générés, en français et en anglais
- **THEN** leur liste `tools` ne contient pas `Agent`
