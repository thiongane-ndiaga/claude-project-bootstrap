Issue: #143
ADR: ARCH-011 (amendé : matcher `mcp__.*`, outils MCP), ARCH-012 (amendé : skills à contexte isolé pour tous les profils), ARCH-013 (amendé : limites levées)

## Why

Le hook de bornage ne se déclenche pas sur les outils MCP : `project-lead`, seul profil sans liste `tools`, reçoit ceux de la session et peut écrire à l'extérieur du dépôt (issues, PR, commentaires) sans passer par la table. Un skill `context: fork` exécute ses outils sous `agent_type: "general-purpose"`, absent de la table, donc non borné (constats de #143, Claude Code 2.1.322).

## What Changes

- `settings.json` (généré avec `agent-profiles`) reçoit une seconde entrée `PreToolUse` au matcher `mcp__.*`, la première restant identique.
- Un outil MCP est permis à un profil de la table seulement si son nom (partie après le dernier `__`) est un nom de lecture sans mot d'écriture, ou s'il figure dans `mcpAllow` de l'entrée (vide par défaut) ; sinon refus avec orientation.
- Pour tout profil de la table, le hook refuse un nom de skill invalide et un skill dont l'en-tête de `SKILL.md` ou de la commande déclare `context: fork`, cherché dans le projet, la configuration de l'utilisateur et les plugins installés ; un skill introuvable est permis.
- Pas de migration : `scaffold.mjs --update` fusionne `settings.json` (réunion des tableaux) et met à jour le hook.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `agent-profiles` : déclaration du hook, bornage des outils MCP, bornage des skills, skills à contexte isolé, refus par défaut, bornage et garde-fous de `project-lead`.

## Impact

- `scaffold.mjs` (entrée de hook), `profile-guard.mjs` français et anglais et son test (configuration utilisateur factice), `tests/scaffold.test.mjs`, instantanés, `project-lead.md`, `workflow.md` et `SKILL.md`, `pitfalls.md`, `agent-profiles-prototype.md`, ARCH-011, ARCH-012, ARCH-013, arc42 (sections 8 et 11).
- Hors périmètre : une liste de serveurs MCP par projet ou une question de phase 0 ; `permissionDecision: "ask"` à la place du refus (non vérifié en `-p` et en équipe) ; borner `general-purpose` dans la table (toucherait les sessions sans `mainAgent`) ; les agents lancés par un skill isolé ; les chemins de skills personnalisés (`plugin.json`, `--plugin-dir`, `--add-dir`).
