Issue: #163
ADR: aucun (ARCH-010, catalogue de modules, appliqué)

## Why

À la mise à jour (phase 5), la configuration est relue dans le manifeste : l'utilisateur ne voit jamais les modules ni les profils optionnels apparus depuis sa version, alors qu'un nouveau projet les choisit à la phase 0. Rien dans `scaffold.mjs` ne compare le catalogue au manifeste, et le skill ne dit pas comment répartir une liste de sept profils en questions de quatre options au plus.

## What Changes

- `scaffold.mjs --detect` et le rapport de `--update` rapportent, pour un projet avec manifeste lisible, `available` : les modules du catalogue absents du manifeste et compatibles avec lui (champs de `--list-modules`) et, si `agent-profiles` est actif, les profils optionnels absents de `profiles`.
- `SKILL.md`, phase 5 : lire `available`, poser modules, questions des modules et profils (quatre options au plus par question, aucun omis, règle étendue à la phase 0), compléter une copie de la configuration du manifeste, simuler avec `--config`, renvoyer aux migrations.
- Tests de génération : manifeste ancien, module incompatible, rien de nouveau, sans `agent-profiles`, manifeste illisible, simulation avec configuration complétée.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `module-catalog` : modules et profils proposables à la mise à jour.

## Impact

`skills/project-bootstrap/scripts/scaffold.mjs`, `skills/project-bootstrap/SKILL.md`, `tests/scaffold.test.mjs`, arc42 (section 5). Aucun fichier généré ne change : les instantanés de la matrice restent identiques.

## Hors périmètre

- Retrait d'un module.
- Nouvelles questions ou clés d'un module déjà actif (`mainAgent`, `regulatedDomain`, `advisor`, `sonar`, `jiraSource`) : elles ne sont pas reposées.
- Module du manifeste absent du catalogue (renommé ou retiré) : non traité.
