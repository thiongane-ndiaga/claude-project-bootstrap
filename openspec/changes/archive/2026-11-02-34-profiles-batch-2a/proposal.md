Issue: #34
ADR: aucun

## Why

Le lot 1 de #34 a livré `product-owner`, `developer` et `business-analyst`. Le lot 2a ajoute trois profils optionnels en lecture seule, sans conception nouvelle : `acceptance-tester` (recette face aux critères), `scout` (exploration résumée) et `second-opinion` (contre-avis indépendant). ARCH-011 à ARCH-014 couvrent le mécanisme.

## What Changes

- `OPTIONAL_PROFILES` accepte `acceptance-tester`, `scout` et `second-opinion` ; la clé `profiles` les génère sur choix, modèles français et anglais.
- Table du hook : trois entrées sans écriture, sans shell supplémentaire, sans lancement d'agent ni de skill.
- Valeurs de départ (#37) : `acceptance-tester` sonnet, medium, 25 ; `scout` haiku, medium, 20 ; `second-opinion` opus, high, 30.
- `acceptance-tester` et `scout` portent la consigne de l'advisor (famille sonnet et haiku) ; `second-opinion` (opus) non.
- `project-lead` délègue à ces profils s'ils existent dans `.claude/agents/`.
- Question de phase 0 du module : liste des profils élargie.
- Tests, instantanés et documentation.

## Capabilities

### New Capabilities

(aucune)

### Modified Capabilities

- `agent-profiles` : trois profils optionnels et leur table de droits.

## Impact

- `catalog.mjs`, `module.json` d'`agent-profiles`, `profile-guard.mjs`, six modèles de profils, `project-lead` (français et anglais), tests (`scaffold.test.mjs`, module `profile-guard.test.mjs`), instantanés, `SKILL.md`, `bootstrap-config.md`, `pitfalls.md`, arc42 (5).
- Hors périmètre : `devops-engineer` et `compliance-reviewer` (lot 2b), absorption des agents existants (#110).
