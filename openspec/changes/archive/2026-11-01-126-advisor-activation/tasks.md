## 1. Générateur et catalogue

- [x] 1.1 `catalog.mjs` : pseudo-module `advisor-on`
- [x] 1.2 `scaffold.mjs` : clé `advisor` (validation, `null` et `false`, héritage, modules actifs) ; `state.mjs`
- [x] 1.3 `module.json` d'`advisor` : description et question de phase 0

## 2. Modèles

- [x] 2.1 `project-lead` : section Advisor retirée
- [x] 2.2 `product-owner`, `developer`, `business-analyst` : bloc de consigne `advisor-on` (français et anglais)
- [x] 2.3 `docs/workflow.md` : étape conditionnée par `advisor-on` (français et anglais)

## 3. Tests

- [x] 3.1 `scaffold.test.mjs` : consigne sur les trois profils, absence ailleurs, clé (valeurs, refus, héritage, désactivation), aucun réglage écrit avec tous les modules, règle de cohérence sur `model:`, anglais, catalogue
- [x] 3.2 Matrice : combinaison `advisor-on`, instantanés
- [x] 3.3 Avertissement si `advisor: true` sans profil optionnel ; essai réel : un sous-agent à liste `tools:` fermée dispose de l'outil advisor (2.1.316)
- [x] 3.4 Mise à jour du Purpose de la spec `advisor-module` après archivage

## 4. Documentation

- [x] 4.1 ARCH-015, `SKILL.md` (dont l'accord de l'étape agent-teams), `bootstrap-config.md`, `pitfalls.md`, `CONTRIBUTING.md`
- [x] 4.2 arc42 (5, 8, 11) via `arc42-keeper`, nom des blocs `advisor-on` relu

## 5. Validation

- [x] 5.1 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `openspec validate --all --strict`
