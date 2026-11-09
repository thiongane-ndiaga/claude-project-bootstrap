Issue: #110
ADR: ARCH-016

## Why

Un projet généré avec `agent-profiles` contient deux familles d'agents : les profils par rôle (`architect`, `qa-engineer`, …) et quatre agents définis par une tâche (`architecture-explorer`, `arc42-keeper`, `spec-reviewer`, `traceability-checker`). Les agents d'un projet doivent être les profils : leurs compétences passent dans les profils, sans doublon.

## What Changes

- Avec `agent-profiles`, les quatre agents et le hook `restrict-path.mjs` (qui ne sert qu'à `arc42-keeper`) ne sont plus générés. Sans `agent-profiles`, rien ne change (pseudo-module `legacy-agents`).
- `architect` absorbe l'exploration d'options et la mise à jour d'arc42 ; `qa-engineer` absorbe la revue de spec et le contrôle de traçabilité (pas `devops-engineer`, optionnel). Ils n'ont plus d'agent lançable ; la table du hook perd les entrées des quatre agents.
- Les textes générés qui nomment ces agents (`workflow.md`, modèles d'ADR 001 et 002, `project-lead`, `devops-engineer`, exception Dependabot) nomment le profil quand `agent-profiles` est actif.
- Migration 0003 : retire les cinq fichiers d'un projet déjà généré avec `agent-profiles` s'ils sont restés tels que générés ; un fichier modifié est conservé et signalé.
- Tests : absence/présence des fichiers, méthodes dans les profils, migration, table du hook, instantanés inchangés sans `agent-profiles`.

## Capabilities

### New Capabilities

- `legacy-agents` : conditionnement des agents historiques, méthodes absorbées, migration.

### Modified Capabilities

- `agent-profiles` : réutilisation d'Archgate et d'OpenSpec, bornage des agents lançables, valeurs de départ, `devops-engineer`, délégation de `project-lead`.
- `workflow-document` : plus de lignes pour les agents fixes avec `agent-profiles`.
- `dependency-updates` : l'exception Dependabot est portée par `qa-engineer` avec `agent-profiles`.

## Impact

- `catalog.mjs` (pseudo-module), `scaffold.mjs`, `module.json` des modules `archgate`, `arc42`, `openspec`, `github`, profils `architect`, `qa-engineer`, `devops-engineer`, `project-lead`, `profile-guard.mjs` (français et anglais), `workflow.md`, ARCH-001 et ARCH-002 (modèles), migration `0003`, tests, instantanés, `SKILL.md`, `verification.md`, `pitfalls.md`, arc42 (sections 5, 8).
- Hors périmètre : l'exploration en équipe d'un explorateur par option (perdue, voir ARCH-016), l'encapsulation de la forge par `devops-engineer` (#23 à #25).
