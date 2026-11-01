Issue: #126
ADR: ARCH-015

## Why

Le module `advisor` (#36) génère une section dans `project-lead` et une étape de `docs/workflow.md` dès qu'il est choisi, sans autre décision. L'advisor n'aide pas un profil qui tourne déjà sur le modèle le plus capable (il doit être au moins aussi capable que le modèle appelant), alors qu'il profite aux profils sur Sonnet et Haiku. Le propriétaire veut une activation optionnelle explicite, portée par ces profils, et le principe « le plugin n'écrit pas de réglage payant » consigné dans un ADR.

## What Changes

- Clé de configuration `advisor` (`true`) posée par une question de phase 0 du module `advisor` (défaut : non). `null` ou `false` la désactive (ni héritée ni consignée) ; refusée sans le module ; consignée au manifeste et héritée par `--update`.
- Pseudo-module `advisor-on` : sans la clé, le module `advisor` ne génère ni consigne ni étape.
- La consigne de consulter l'advisor passe de `project-lead` aux profils dont le modèle est `sonnet` ou `haiku` (`product-owner`, `developer`, `business-analyst`). `architect`, `qa-engineer` (opus) et `project-lead` n'en portent plus.
- Un test vérifie que le bloc est présent dans tout profil à `model: sonnet|haiku` et absent des autres.
- L'étape du « Nouveau poste » est conditionnée par la clé.
- ARCH-015 : le plugin n'écrit pas de réglage payant ou expérimental de l'utilisateur.

## Capabilities

### New Capabilities

(aucune)

### Modified Capabilities

- `advisor-module` : activation par la clé, consigne portée par les profils sonnet et haiku.

## Impact

- `module.json` d'`advisor`, `catalog.mjs` (pseudo-module), `scaffold.mjs`, `state.mjs`, modèles de `project-lead`, `product-owner`, `developer`, `business-analyst` et `docs/workflow.md` (français et anglais), `SKILL.md`, `bootstrap-config.md`, `pitfalls.md`, ARCH-015, arc42 (5, 8, 11).
- Instantanés `advisor` (sans consigne), `full*` (profils non choisis, donc inchangés sauf `project-lead` et `workflow.md`), nouvelle combinaison `advisor-on`.
- Hors périmètre : modèle configurable par profil (#37), qui devra revoir la règle sur `model:`.
