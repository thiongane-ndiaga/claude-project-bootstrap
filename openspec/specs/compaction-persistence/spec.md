# compaction-persistence Specification

## Purpose
Garder les règles critiques des projets générés hors des règles à `paths:` (perdues à la compaction) et offrir un rappel optionnel, lu sur le disque, après une compaction.

## Requirements

### Requirement: Aucune règle conditionnée à un chemin
Les fichiers générés par le plugin MUST NOT contenir de règle à frontmatter `paths:` sous `.claude/rules/` ni de `CLAUDE.md` hors de la racine. Les fichiers créés par les CLI d'outillage (`openspec init`, `archgate init`) ne sont pas couverts.

#### Scenario: Sélection complète
- **WHEN** un projet est généré avec tous les modules et tous les profils
- **THEN** aucun `.claude/rules/*.md` n'a de `paths:` et seul `CLAUDE.md` à la racine existe

### Requirement: Échelle d'arbitrage dans le CLAUDE.md
Avec `agent-profiles`, le `CLAUDE.md` généré SHALL contenir, sous un titre distinct de `## Règles`, l'échelle d'arbitrage à cinq niveaux, ses lignes identiques à celles de `project-lead`, une phrase disant que « toi » désigne l'agent principal, et un renvoi à `.claude/hooks/profile-guard.mjs` pour les droits d'écriture par agent. Sans `agent-profiles`, il MUST NOT la contenir.

#### Scenario: Échelle identique
- **WHEN** un projet est généré avec `agent-profiles`, en français puis en anglais
- **THEN** les cinq lignes de l'échelle de `CLAUDE.md` égalent celles de `project-lead.md` de la même langue

#### Scenario: Sans agent-profiles
- **WHEN** `agent-profiles` n'est pas sélectionné
- **THEN** `CLAUDE.md` ne contient pas d'échelle d'arbitrage

#### Scenario: Écritures visibles
- **WHEN** un projet est généré avec `github`
- **THEN** la puce sur les commandes `gh` d'écriture figure dans `## Règles` de `CLAUDE.md`

### Requirement: Module compact-recall
Le catalogue SHALL contenir un module `compact-recall` qui requiert `claude`, vaut `default: false` et n'a pas de clé de configuration. Sélectionné, il SHALL générer `.claude/hooks/compact-recall.mjs` et déclarer dans `.claude/settings.json` un hook `SessionStart` de matcher `compact` appelant ce fichier, après toute entrée `SessionStart` existante. Non sélectionné, ni le fichier ni la déclaration MUST NOT exister.

#### Scenario: Module sélectionné
- **WHEN** un projet est généré avec `compact-recall`
- **THEN** le hook existe et `settings.json` déclare `SessionStart` avec le matcher `compact`

#### Scenario: Mode local
- **WHEN** `compact-recall` est sélectionné avec `cliInstall: local`
- **THEN** `settings.json` déclare `session-path.mjs` en première entrée `SessionStart` et l'entrée `compact` ensuite

#### Scenario: Module absent
- **WHEN** `compact-recall` n'est pas sélectionné
- **THEN** aucun `compact-recall.mjs` et aucun matcher `compact` n'est généré

### Requirement: Contenu du rappel
Le hook SHALL écrire sur la sortie standard, avec le code de sortie 0, un rappel lu sur le disque à la racine du projet, calculée depuis l'emplacement du script : la branche courante par `git branch --show-current` (échec et délai ignorés) et, pour chaque dossier de `openspec/changes/` hors `archive` ayant un `tasks.md`, son nom et les tâches faites sur le total. Il MUST lister au plus dix changements.

#### Scenario: Changement en cours
- **WHEN** `openspec/changes/12-x/tasks.md` compte 2 tâches cochées sur 5
- **THEN** le rappel contient `12-x` et `2/5`

#### Scenario: Lancé depuis un sous-dossier
- **WHEN** le hook est lancé avec un dossier courant différent de la racine
- **THEN** le rappel porte sur les changements de la racine du projet

### Requirement: Robustesse du rappel
Les cases `- [x]` et `- [X]`, indentées ou non, et les fins de ligne CRLF SHALL être comptées. Le hook MUST NOT appeler de CLI autre que git et MUST NOT échouer si git, un dossier ou un fichier est absent.

#### Scenario: Dépôt sans openspec ni git
- **WHEN** le hook tourne dans un dossier sans `openspec/` ni dépôt git
- **THEN** il se termine avec le code 0

#### Scenario: Fichier de tâches en CRLF
- **WHEN** `tasks.md` utilise CRLF et des cases `[X]` indentées
- **THEN** elles sont comptées

### Requirement: Étapes critiques du skill en tête
Le `SKILL.md` du plugin SHALL placer la règle des arrêts `[STOP]` dans ses 3 000 premiers caractères, la section de reprise dans ses 12 000 premiers et la règle sur les commandes `gh` d'écriture dans ses 15 000 premiers, car la compaction ne conserve que le début d'un skill.

#### Scenario: Position des sections
- **WHEN** le test lit `SKILL.md`
- **THEN** `[STOP]` apparaît avant le caractère 3 000, « Reprise et journal des effets » avant 12 000 et l'accord pour les écritures `gh` avant 15 000
