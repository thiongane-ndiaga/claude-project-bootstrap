Issue: #23
ADR: ARCH-017 (nouveau : source du besoin, GitHub ou Jira), ARCH-005 (amendé, plugin et modèle généré), ARCH-002 et ARCH-003 (modèle généré, variantes du mode jira), ARCH-006 et ARCH-010 (appliqués)

## Why

Des équipes suivent leur besoin dans Jira et veulent la traçabilité entre clé Jira, branche, commit et PR sans quitter le workflow du plugin. L'issue laisse ouverte la question de la source du besoin ; le mainteneur a décidé : GitHub ou Jira, au choix par projet.

## What Changes

- Nouveau module optionnel `jira` (`requires: github`, `default: false`) avec deux clés de configuration : `jira` (clé de projet, facultative) et `jiraSource` (`github` par défaut, ou `jira`), questions de phase 0 déclarées par le module.
- `scripts/check-jira-key.mjs` appelé par le job `pr-title` de `ci.yml` : la clé Jira figure dans le titre de la PR ou le nom de la branche (en mode `jira`, la branche est `<type>/<CLE-N>-<slug>`) ; branches `dependabot/` et `release-please--` exemptées.
- En mode `jira` : id OpenSpec en minuscules `<cle-n>-<slug>`, en-tête `Ticket: CLE-N`, corps de PR `Refs CLE-N` au lieu de `Closes #N` ; gabarit de PR, `docs/workflow.md`, `CLAUDE.md` et `traceability-checker` en tiennent compte. En mode `github` : champ « Clé Jira » dans les formulaires d'issues et ligne dans le gabarit de PR.
- `docs/jira.md` : étapes manuelles (app Jira Cloud pour GitHub, projet, clés), table de lecture « issue → ticket » pour les textes qui n'ont pas de variante, limites.
- `SKILL.md` : deux questions de phase 0 ; proposition de désactiver le module `projects` (double emploi avec un tableau Jira), sans l'imposer.
- ARCH-017 documente la décision ; ARCH-005 est amendé.

## Capabilities

### New Capabilities

- `jira-module` : module optionnel `jira`, ses deux clés, son contrôle et sa documentation.

### Modified Capabilities

Aucune.

## Impact

`assets/modules/jira/`, blocs `@@module:jira` dans `ci.yml`, gabarit de PR, formulaires, `workflow.md`, `CLAUDE.md`, `traceability-checker`, ARCH-005 (modèle), `scaffold.mjs` (clés, paramètres, pseudo-module `jira-source`), `catalog.mjs`, `SKILL.md`, `bootstrap-config.md`, `pitfalls.md`, arc42, tests et instantanés. Aucun changement pour les projets sans le module.
