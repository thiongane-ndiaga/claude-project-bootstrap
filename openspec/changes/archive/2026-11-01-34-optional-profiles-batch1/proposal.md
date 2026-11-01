Issue: #34
ADR: ARCH-014

## Why

`project-lead` (#35) délègue à `developer` et `business-analyst` « s'ils existent », et `product-owner` structure le besoin, mais aucun de ces profils n'est généré : le chef de projet écrit lui-même le code et les specs. #34 prévoit huit profils optionnels, choisis par l'utilisateur ; ils sont livrés en deux lots (décision avec le propriétaire).

## What Changes

- Lot 1 : trois profils optionnels, `product-owner`, `developer` et `business-analyst`, définis en français et en anglais.
- Nouvelle clé de configuration `profiles` : seuls les profils listés sont générés ; absente par défaut ; `[]` ou `null` la désactive ; liste triée sans doublon au manifeste, héritée par `--update`, refusée sans `agent-profiles` ; `business-analyst` exige `openspec`.
- Un pseudo-module `profile-<nom>` par profil, cité dans le `when` du fichier.
- Entrées de la table du hook : `product-owner` sans écriture, `business-analyst` limité à `openspec/changes/`, `developer` borné par une liste d'exclusion des dossiers de gouvernance (shell non borné).
- Question de phase 0 sur `profiles`.
- Lot 2 (suite de #34, qui reste ouverte : la PR de ce lot ne la ferme pas) : `acceptance-tester`, `scout`, `devops-engineer`, `compliance-reviewer` (avec un domaine réglementé déclaré), `second-opinion`.
- Renforcement du hook pour tous les profils : chemin réel (liens, jonctions, noms courts 8.3), refus des flux NTFS.

## Capabilities

### New Capabilities

(aucune)

### Modified Capabilities

- `agent-profiles` : profils optionnels, clé `profiles`, entrées de table.

## Impact

- Modèles des trois profils (français et anglais), `module.json`, `catalog.mjs` (pseudo-modules), `scaffold.mjs` (clé `profiles`), `state.mjs`, `profile-guard.mjs`, `SKILL.md`, `bootstrap-config.md`, `pitfalls.md`, ARCH-014, arc42 (5, 8, 11).
- Instantanés `agent-profiles`, `agent-profiles-main`, `full`, `full-en`, `full-public` (hook modifié) et la nouvelle combinaison `agent-profiles-optional`.
- Hors périmètre : les cinq profils du lot 2 (#34), `model` et `effort` (#37), absorption des agents existants (#110).
