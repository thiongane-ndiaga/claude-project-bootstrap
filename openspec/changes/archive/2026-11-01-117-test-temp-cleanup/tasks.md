## 1. Module et suites

- [x] 1.1 `tests/tmp-root.mjs` : racine propre à l'exécution, nettoyage à la sortie, `KEEP_TMP`
- [x] 1.2 Import en tête de `scaffold.test.mjs`, `matrix.test.mjs`, `state.test.mjs` et `modules.test.mjs`

## 2. Tests

- [x] 2.1 `scaffold.test.mjs` : suppression à la sortie, conservation avec `KEEP_TMP`, racine de l'exécution
- [x] 2.2 Vérifier qu'une exécution complète de `run-checks.mjs` ne laisse aucun dossier `pb-*`

## 3. Documentation

- [x] 3.1 `CONTRIBUTING.md` : `KEEP_TMP`

## 4. Validation

- [x] 4.1 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `openspec validate --all --strict`
