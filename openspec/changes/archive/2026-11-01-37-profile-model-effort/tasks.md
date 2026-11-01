## 1. Modèles

- [x] 1.1 `effort` et `maxTurns` dans les quatre agents existants, français et anglais
- [x] 1.2 `effort` et `maxTurns` dans les cinq profils à outils, français et anglais

## 2. Tests

- [x] 2.1 `scaffold.test.mjs` : validation du frontmatter de tous les agents (champs, `effort`, `maxTurns`, nom de fichier, `name`), français et anglais, avec cas négatifs sur texte et nom fournis (`effrot`, `Developer.md`, `qa_engineer.md`) et clés imbriquées de `hooks` acceptées
- [x] 2.2 Clés `effort`, `model`, `maxTurns` sans effet (agents identiques octet pour octet) ; règle `model:` de l'advisor inchangée
- [x] 2.3 Instantanés de la matrice régénérés

## 3. Documentation

- [x] 3.1 `pitfalls.md` et `bootstrap-config.md` : table, surcharges (`CLAUDE_CODE_EFFORT_LEVEL`, `CLAUDE_CODE_SUBAGENT_MODEL` sans affectation dans les fichiers générés, paramètre d'appel, plafonds d'organisation qui bornent `model` et `effort`), coût, compte sans Opus, teammates et `maxTurns` non constaté, effort sur un modèle surchargé, note sur #37 actualisée
- [x] 3.2 ARCH-015 : coût des valeurs par défaut (complète la conséquence déjà annoncée, dit dans la PR) ; arc42 (8, 11) via `arc42-keeper`

## 4. Validation

- [x] 4.1 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `openspec validate --all --strict`
