## 1. ADR et module

- [x] 1.1 ARCH-004 amendé : le fichier du plugin et le modèle généré (`archgate`, `templates` et `templates.en`, bloc `@@module:sonar`)
- [x] 1.2 `assets/modules/sonar/module.json` (`requires: github`, `default: false`, question de phase 0 dans `questions`, `sonar-project.properties` en `owned`, `docs/sonar.md`)
- [x] 1.3 Bloc `@@module:sonar` de `ci.yml` français et anglais (job, checkout complet, secret dans l'environnement, étape conditionnée, notice sans jeton, `SONAR_HOST_URL` et `push` seul en mode serveur)
- [x] 1.4 `sonar-project.properties`, `docs/sonar.md` français et anglais
- [x] 1.5 `scaffold.mjs` : `SONAR_SCAN_REF`, pseudo-modules `sonar-cloud` et `sonar-server` (déclarés dans `catalog.mjs`), validation, refus sans module, héritage par `--update` et `sonar: null` ; `resolve-versions.mjs` et `audit.mjs` (action `sonarScan`)

## 2. Tests

- [x] 2.1 `assets/modules/sonar/tests/sonar.test.mjs` : fichiers, job présent et absent, refus sans `github`, cloud par défaut, serveur, valeur invalide, clé sans module, épinglage et pin manquant, étape conditionnée, propriétés, `--update` (héritage, retrait, `sonar: null`, propriétés intactes), fichier existant, documentation par langue et mode
- [x] 2.2 `tests/scaffold.test.mjs` : catalogue de dix-sept modules, `actions.sonarScan` dans la configuration de base ; `catalog.mjs` déclare les pseudo-modules
- [x] 2.3 `tests/matrix.test.mjs` : combinaisons `sonar` et `sonar-server`, `actions.sonarScan` dans la configuration de base, instantanés `full*` relus
- [x] 2.4 Audit : action `sonarScan` épinglée reconnue, SHA divergent signalé

## 3. Documentation

- [x] 3.1 `SKILL.md` (question de phase 0, « ce qui restera manuel »), `bootstrap-config.md` (clé `sonar`, `actions.sonarScan`), `pitfalls.md` (non observés) ; `versioning.md` n'énumère pas les actions
- [x] 3.2 arc42 sections 5, 8 et 11 (via `arc42-keeper`), dont le risque « aucun essai réel »
- [x] 3.3 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `archgate check` et `openspec validate --all --strict` verts
