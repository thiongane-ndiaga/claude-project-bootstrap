## 1. Générateur

- [x] 1.1 `scaffold.mjs` : validation de `mainAgent`, héritage par `--update`, `settings.agent`
- [x] 1.2 `state.mjs` : `mainAgent` parmi les réponses conservées

## 2. Modèles

- [x] 2.1 `project-lead.md` (français et anglais), blocs conditionnels
- [x] 2.2 `module.json` : fichier déclaré, description

## 3. Tests

- [x] 3.1 `scaffold.test.mjs` : contenu, absence de référence aux modules inactifs, `mainAgent` (absent, présent, invalide, sans module, `--update`, avec `archgate-plugin`)
- [x] 3.2 Instantanés `agent-profiles` et `full*`
- [x] 3.3 Essais réels : précédence sur l'agent du plugin Archgate, délégation à `qa-engineer`

## 4. Documentation

- [x] 4.1 `SKILL.md`, `bootstrap-config.md`, `pitfalls.md`, `agent-profiles-prototype.md`
- [x] 4.2 arc42 (5 et 8) via `arc42-keeper`

## 5. Validation

- [x] 5.1 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `openspec validate --all --strict`

## 6. Revue

- [x] 6.1 Désactivation par `mainAgent: null`, avertissement si un agent est déjà déclaré, audit de l'agent du projet, lancements demandés par les profils, `bootstrap-config.md`, combinaison `agent-profiles-main` de la matrice
