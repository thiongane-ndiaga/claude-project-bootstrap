Issue: #38
ADR: aucun

## Why

`docs/workflow.md` généré dit l'ordre des étapes, mais ni qui agit à chaque étape et avec quels droits, ni comment arbitrer, ni quelles règles tiennent par un garde-fou et lesquelles ne sont qu'une consigne. Il ne mentionne pas non plus les commandes `/opsx:explore`, `/opsx:update`, `/opsx:sync` ni le marqueur `skip_specs`, que le profil `core` d'OpenSpec installe.

## What Changes

- Le modèle `docs/workflow.md` (français et anglais) gagne, avec le module `agent-profiles` : « Qui fait quoi » (un agent par ligne : rôle, droits d'écriture), « Échelle d'arbitrage » (identique à celle de `project-lead`) et « Journal des décisions ».
- Une table « Double encodage » liste chaque règle « ne jamais… » du `CLAUDE.md` généré avec son texte et son garde-fou (hook, permission, CI, règle Archgate) ou la mention « consigne seulement ».
- Avec `openspec`, les étapes documentent `/opsx:explore`, `/opsx:update`, `/opsx:sync` et `skip_specs: true`.
- Tests : chaque ligne de la table a un garde-fou existant dans le projet généré ou la mention ; chaque agent généré a sa ligne de « Qui fait quoi » ; l'échelle de `workflow.md` égale celle de `project-lead`.

## Capabilities

### New Capabilities

- `workflow-document` : contenu du `docs/workflow.md` généré (agents, arbitrage, double encodage, commandes OpenSpec).

### Modified Capabilities

(aucune)

## Impact

- Modèles `core/templates{,.en}/docs/workflow.md`, `tests/scaffold.test.mjs`, instantanés, `pitfalls.md`, arc42 (section 8).
- Hors périmètre : section « Nouveau poste » (#19, fermée), persistance après compaction (#39), nouvelles règles ou nouveaux hooks.
