## 1. Détection

- [x] 1.1 `scaffold.mjs` : `available.modules` (catalogue hors `core`, absents du manifeste, sans conflit avec lui, champs de `describeModules`) et `available.profiles` (`OPTIONAL_PROFILES` absents de `config.profiles`, avec `agent-profiles` au manifeste) dans `--detect` et dans le rapport de `--update` ; absent si manifeste illisible ou sans liste de modules
- [x] 1.2 `tests/scaffold.test.mjs` : les cinq scénarios de détection, `core` jamais listé, champs de chaque entrée, et la simulation `--config --dry-run` avec `dependabot` et `scout` ajoutés (code 0)

## 2. Skill et documentation

- [x] 2.1 `SKILL.md` phase 5 : questions de modules, de leurs `questions` et des profils (filtres de la décision 5), copie de `config` complétée, `--config`, refus non consignés, renvoi aux migrations ; phase 0 : règle des quatre options pour les profils
- [x] 2.2 arc42 section 6 (déroulé de la mise à jour) et section 8 ou 11 (refus non consignés)

## 3. Contrôles

- [x] 3.1 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `archgate check` et `openspec validate --all --strict` verts ; instantanés de la matrice inchangés
