## 1. ADR et module

- [x] 1.1 ARCH-007 amendé (préfixe de l'espace de travail pour l'installation des CLI sur un agent auto-hébergé)
- [x] 1.2 `assets/modules/jenkins/module.json` (`requires: github`, `default: false`, `Jenkinsfile`, `scripts/jenkins-setup.sh` en `owned`, `docs/jenkins.md`)
- [x] 1.3 `Jenkinsfile` français et anglais : sept étapes nommées, blocs `@@module` de `ci.yml`, `PATH` au niveau du pipeline, `withEnv` pour le titre
- [x] 1.4 `scripts/jenkins-setup.sh` et `docs/jenkins.md` français et anglais (étapes manuelles, limites, blocs `visibility-private` et `cli-local`)
- [x] 1.5 Ligne `@@module:jenkins` dans le tableau des contrôles de `docs/workflow.md` (français et anglais)

## 2. Tests

- [x] 2.1 `tests/scaffold.test.mjs` : trois fichiers générés, absence, refus sans `github`, `settings.json` inchangé, `Jenkinsfile` existant (code 3, intact), ajout par `--update`, `jenkins-setup.sh` intact après `--update`
- [x] 2.2 Étapes et ordre selon les modules (`openspec`, `archgate`, aucun), marqueurs et paramètres résolus, `CHANGE_TITLE` seulement dans `withEnv`
- [x] 2.3 `assets/modules/jenkins/tests/jenkins.test.mjs` : script de Node extrait et exécuté (20.18.0 refusé avec la version dans le message, 20.19.0 accepté, `node` absent), parité avec `ci.yml` (versions, `openspec validate --all --strict --no-interactive`, `node .bootstrap/run-checks.mjs`, `node scripts/check-pr-title.mjs`, `OPENSPEC_TELEMETRY`), écarts admis
- [x] 2.4 Modes `global`, `user` et `local` (dont `archgate` seul), blocs de `docs/jenkins.md` selon visibilité et mode, renvoi de `workflow.md`
- [x] 2.5 `tests/matrix.test.mjs` : combinaison `jenkins` et `jenkins-cli-local` ; instantanés `full`, `full-en`, `full-public`, `full-legacy` relus

## 3. Documentation

- [x] 3.1 `SKILL.md` (étape « ce qui restera manuel »), `pitfalls.md`, arc42 sections 5 (briques des modules et de `cliInstall`) et 8
- [x] 3.2 Issue de suivi #147 : contextes Jenkins dans l'audit `forge-protection` et versions du `Jenkinsfile` dans `checkVersions`
- [x] 3.3 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `archgate check` et `openspec validate --all --strict` verts
