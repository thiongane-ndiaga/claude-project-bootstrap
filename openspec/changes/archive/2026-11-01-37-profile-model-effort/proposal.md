Issue: #37
ADR: aucun

## Why

Un champ de frontmatter mal orthographié (`effrot`, `maxturns`) est ignoré sans erreur, et seul `model` est posé sur les agents générés. `effort` et `maxTurns`, leviers de coût et de borne documentés, manquent partout. ARCH-015 (point 5) classe ces champs parmi les choix de conception du projet, hors du principe « pas de réglage payant ».

## What Changes

- Chaque profil à liste d'outils (`architect`, `qa-engineer`, `product-owner`, `developer`, `business-analyst`) et les quatre agents existants (`arc42-keeper`, `spec-reviewer`, `architecture-explorer`, `traceability-checker`) déclarent `model`, `effort` et `maxTurns` avec des valeurs fixes (table du design). `project-lead`, agent principal, n'en déclare aucun.
- Test du générateur : tous les fichiers `.claude/agents/*.md` générés (tous modules, français et anglais) n'ont que des champs de la liste documentée, un `effort` valide, un `maxTurns` entier positif, un nom de fichier en minuscules et tirets, et un `name` égal au nom du fichier.
- Documentation des surcharges (`CLAUDE_CODE_EFFORT_LEVEL`, `CLAUDE_CODE_SUBAGENT_MODEL`, paramètre d'appel, plafonds d'organisation) et du coût des valeurs par défaut.

## Capabilities

### New Capabilities

(aucune)

### Modified Capabilities

- `agent-profiles` : champs `model`, `effort`, `maxTurns` sur les agents générés (les quatre agents des modules `arc42`, `openspec`, `archgate` et `github` sont traités avec les profils).
- `generator-test-suite` : validation du frontmatter de tous les agents générés.

## Impact

- Modèles des neuf agents (français et anglais), tests (`scaffold.test.mjs`), instantanés de la matrice, `pitfalls.md`, `bootstrap-config.md`, ARCH-015 (coût), arc42 (8, 11).
- Hors périmètre : clé de configuration par profil (les valeurs sont fixes, éditables dans le frontmatter), profils du lot 2 de #34.
