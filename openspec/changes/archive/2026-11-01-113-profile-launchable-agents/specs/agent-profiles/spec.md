## MODIFIED Requirements

### Requirement: Déclaration du hook de bornage
Avec `agent-profiles`, `.claude/settings.json` SHALL déclarer un hook `PreToolUse` de type `command` appelant `profile-guard.mjs` pour les outils `Write`, `Edit`, `MultiEdit`, `NotebookEdit`, `Bash`, `PowerShell`, `Agent`, `Task` (ancien nom de `Agent`) et `Skill`, sans déclarer de réglage `agent`. La fusion avec des réglages existants MUST conserver les hooks du projet.

#### Scenario: Déclaration dans settings.json
- **WHEN** `settings.json` est généré avec `agent-profiles`
- **THEN** il contient un hook `PreToolUse` vers `profile-guard.mjs` pour les neuf outils et pas de clé `agent`

#### Scenario: Réglages existants
- **WHEN** `settings.json` contient déjà un hook `PreToolUse` du projet
- **THEN** il subsiste à côté de celui de `profile-guard.mjs`

### Requirement: Réutilisation d'Archgate et d'OpenSpec
Les profils SHALL citer, selon les modules actifs, ce qu'ils réutilisent : `architecture-explorer`, `arc42-keeper` et le skill `archgate:adr-author` pour `architect`, `archgate review-context --base --run-checks`, `spec-reviewer` et le skill `archgate:reviewer` pour `qa-engineer`. Ils lancent eux-mêmes les agents et skills de leur table et demandent le reste à l'agent principal. Ils MUST NOT citer le skill `onboard`. Une référence à un module absent MUST NOT apparaître dans le profil généré.

#### Scenario: Module Archgate absent
- **WHEN** un projet est généré avec `agent-profiles` mais sans `archgate`, `openspec`, `github` ni `arc42`
- **THEN** les profils ne mentionnent aucun de ces modules ni leurs agents ou skills

## REMOVED Requirements

### Requirement: Outils des profils
**Reason**: les profils reçoivent désormais `Agent` et `Skill`, bornés par le hook ; l'exigence « Outils et frontmatter des profils » la remplace.
**Migration**: voir « Outils et frontmatter des profils ».

## ADDED Requirements

### Requirement: Outils et frontmatter des profils
Chaque profil SHALL déclarer sa liste `tools` dans son frontmatter et MUST NOT déclarer de `hooks`. `architect` SHALL disposer de `Agent` et `Skill`, `qa-engineer` de `Agent` sans `Skill`, et tous deux de `Write` et `Edit`, que le hook borne. Ce qu'un profil ne peut pas lancer lui-même, il SHALL le demander à l'agent principal.

#### Scenario: Outils et frontmatter
- **WHEN** les profils sont générés
- **THEN** aucun frontmatter ne contient `hooks`, `architect` a `Agent` et `Skill`, `qa-engineer` a `Agent` sans `Skill`

### Requirement: Bornage des agents lançables
Pour les outils `Agent` et `Task`, `profile-guard.mjs` SHALL refuser (code 2) un profil de la table dont le `subagent_type` n'est pas dans sa liste `agents`, dont l'appel porte un `name` ou un `team_name`, ou dont la liste est vide ou absente. `architect` peut lancer `architecture-explorer` et `arc42-keeper`, `qa-engineer` seulement `spec-reviewer`. Un `subagent_type` absent, vide ou nul vaut `general-purpose` et MUST être refusé.

#### Scenario: Agent permis
- **WHEN** `architect` lance `arc42-keeper` ou `qa-engineer` lance `spec-reviewer`, y compris par l'outil `Task`
- **THEN** le hook se termine avec le code 0

#### Scenario: Agent non permis
- **WHEN** un profil lance `general-purpose`, un agent d'un plugin, un autre profil, lui-même ou un appel sans `subagent_type`
- **THEN** le hook se termine avec le code 2 et nomme l'agent refusé

#### Scenario: Agent nommé ou d'équipe
- **WHEN** un profil lance `arc42-keeper` avec un `name` ou un `team_name`
- **THEN** le hook se termine avec le code 2

#### Scenario: Liste absente
- **WHEN** un agent de la table sans liste `agents` lance n'importe quel agent
- **THEN** le hook se termine avec le code 2

### Requirement: Bornage des skills
Pour l'outil `Skill`, `profile-guard.mjs` SHALL refuser (code 2) un profil de la table dont le skill n'est pas dans sa liste `skills`, ou dont la liste est vide ou absente. `architect` peut lancer `archgate:adr-author` ; `qa-engineer` n'en a aucun, car `archgate:reviewer` lance des agents `general-purpose` que la table interdit.

#### Scenario: Skill permis
- **WHEN** `architect` lance `archgate:adr-author`
- **THEN** le hook se termine avec le code 0

#### Scenario: Skill non permis
- **WHEN** `qa-engineer` lance `archgate:reviewer` ou `architect` lance `archgate:onboard`
- **THEN** le hook se termine avec le code 2

### Requirement: Bornes propres des agents lançables
La table SHALL contenir les agents que les profils lancent, avec leurs bornes, pour qu'elles ne dépendent pas de leur hook de frontmatter, inactif pour un teammate : `arc42-keeper` n'écrit que dans `docs/architecture/arc42/`, `spec-reviewer` et `architecture-explorer` n'écrivent nulle part, et le shell de `spec-reviewer` est en lecture seule. Ces agents MUST NOT pouvoir lancer d'agent ni de skill.

#### Scenario: Écriture d'un agent lançable
- **WHEN** `arc42-keeper` écrit dans `docs/architecture/arc42/05.md` puis dans `src/x.js`
- **THEN** la première écriture est permise et la seconde refusée

#### Scenario: Agent lançable sans écriture
- **WHEN** `spec-reviewer` écrit un fichier ou lance `rm -rf x`
- **THEN** le hook se termine avec le code 2
