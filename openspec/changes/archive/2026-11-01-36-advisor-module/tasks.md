## 1. Module et contenu

- [x] 1.1 `assets/modules/advisor/module.json` : description, `requires` (pas de question de phase 0)
- [x] 1.2 `project-lead.md` (français et anglais) : section Advisor sous `@@module:advisor`
- [x] 1.3 `docs/workflow.md` (français et anglais) : étape optionnelle du « Nouveau poste » et liste des étapes optionnelles

## 2. Tests

- [x] 2.1 `scaffold.test.mjs` : consigne, étape, avertissement `DISABLE_TELEMETRY` et variables voisines, aucune version inventée, absence sans le module (français et anglais), aucun réglage écrit avec tous les modules, dépendance à `agent-profiles`, anglais, description sans question
- [x] 2.2 Comptes de modules (14), combinaison `advisor` de la matrice, instantanés `full*`

## 3. Documentation

- [x] 3.1 `pitfalls.md` et `agent-profiles-prototype.md` : constats de la documentation du 2026-11-01
- [x] 3.2 arc42 (5 et 11) via `arc42-keeper`

## 4. Validation

- [x] 4.1 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `openspec validate --all --strict`
