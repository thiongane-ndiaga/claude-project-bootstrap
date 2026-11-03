Issue: #34
ADR: aucun

## Why

Le lot 2b clôt #34 avec les deux profils restants : `devops-engineer` (lecture de la CI, des releases et de la traçabilité) et `compliance-reviewer` (relecture des specs et des ADR face aux exigences d'un domaine réglementé déclaré). Le second n'a de sens que si le projet déclare un domaine : une clé `regulatedDomain` le porte, en texte libre, sans que le plugin suppose quoi que ce soit sur le domaine.

## What Changes

- `OPTIONAL_PROFILES` accepte `devops-engineer` et `compliance-reviewer`.
- Clé `regulatedDomain` (texte libre, 120 caractères au plus, lettres, chiffres, espace et ponctuation simple), posée par une question de phase 0 du module `agent-profiles` (défaut : non) ; `null` la désactive ; consignée au manifeste, héritée par `--update`. Lister `compliance-reviewer` sans elle est refusé ; elle sans le profil n'a aucun effet et le rapport avertit.
- Profils en lecture seule (table du hook), valeurs de départ : `devops-engineer` sonnet, medium, 25 ; `compliance-reviewer` opus, high, 30.
- `devops-engineer` porte la consigne de l'advisor (famille sonnet) ; `compliance-reviewer` (opus) non.
- `project-lead` délègue à ces profils s'ils existent.
- ARCH-014 amendé (clé et dépendance) et allégé sous la limite des briefings.

## Capabilities

### New Capabilities

(aucune)

### Modified Capabilities

- `agent-profiles` : deux profils optionnels, la clé `regulatedDomain`, les dépendances, les valeurs de départ.
- `advisor-module` : liste des profils concernés par l'avertissement.

## Impact

- `catalog.mjs`, `scaffold.mjs`, `state.mjs`, `module.json` d'`agent-profiles`, `profile-guard.mjs`, quatre modèles de profils, `project-lead` (français et anglais), tests, instantanés, `SKILL.md`, `bootstrap-config.md`, `pitfalls.md`, ARCH-014, ARCH-015, arc42 (5, 8, 11).
- Hors périmètre : absorption de `traceability-checker` (#110), encapsulation de la forge par `devops-engineer` (#23 jira, #24 jenkins, #25 gitlab), listes d'exigences par domaine.
