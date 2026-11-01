Issue: #35
ADR: ARCH-013

## Why

Les profils `architect` et `qa-engineer` (#33, #113) n'ont pas de chef : rien ne découpe le travail, ne rédige les briefs ni n'arbitre, et un agent principal personnalisé n'a pas de consigne de délégation par défaut (constat H3 de #32). Le plugin Archgate impose `archgate:developer` comme agent principal ; l'essai de #35 montre que le réglage `agent` du projet l'emporte, donc sans collision technique.

## What Changes

- Le module `agent-profiles` génère aussi `.claude/agents/project-lead.md` (français et anglais) : consigne de délégation, brief borné, parcours selon les modules actifs, échelle d'arbitrage à cinq niveaux, rôle dans `/opsx:explore` et `/opsx:update`, avancement relu depuis le disque, accord de l'utilisateur pour les écritures visibles.
- Nouvelle clé de configuration `mainAgent` (`"project-lead"`) : présente, `settings.json` reçoit `"agent": "project-lead"` ; absente (défaut), aucune clé `agent`. Consignée au manifeste seulement quand elle est présente, héritée par `--update`, refusée sans `agent-profiles`.
- Le savoir-faire d'`archgate:developer` est réparti entre les profils (décider et capturer : `architect` ; valider : `qa-engineer` ; lire les ADR avant d'écrire : celui qui écrit, via le brief) au lieu d'être recopié.
- ARCH-013 consigne l'activation, la précédence et la règle de délégation.

## Capabilities

### New Capabilities

(aucune)

### Modified Capabilities

- `agent-profiles` : profil `project-lead`, clé `mainAgent` (désactivation par `null`, avertissement si un agent existe), exigences de génération et de déclaration adaptées.
- `project-audit` : le contrôle de l'agent du projet suit `mainAgent`.

## Impact

- Modèles `project-lead.md` (français et anglais), `module.json`, `scaffold.mjs` (validation, héritage, `settings.agent`), `state.mjs` (`mainAgent` parmi les réponses), `audit.mjs` (agent du projet), `bootstrap-config.md`, ARCH-013, arc42 (5, 8), `pitfalls.md`, `SKILL.md`.
- Instantanés `agent-profiles`, `full`, `full-en`, `full-public` ; les autres restent identiques.
- Hors périmètre : question de phase 0 et valeur par défaut interactive (#42), profils `developer`, `product-owner` et `business-analyst` (#34), module `advisor` (#36), persistance après compaction hors du prompt de l'agent (#39).
