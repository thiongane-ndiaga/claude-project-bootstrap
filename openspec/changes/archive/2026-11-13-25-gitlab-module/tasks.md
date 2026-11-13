## 1. Catalogue

- [x] 1.1 `catalog.mjs` : `requiresAny` (clé, validation, `--list-modules` JSON et tableau), pseudo-module `forge` ; `scaffold.mjs` : vérification de `requiresAny`, `forge` actif avec `github` ou `gitlab`
- [x] 1.2 `jenkins/module.json` en `requiresAny` ; `check-pr-title.mjs` déplacé de `github` à `core` (`when: forge`, français et anglais)

## 2. Module gitlab

- [x] 2.1 `assets/modules/gitlab/module.json` (`conflicts: github`, fichiers)
- [x] 2.2 Gabarit de merge request et gabarits d'issues (français et anglais)
- [x] 2.3 `docs/gitlab.md` français et anglais

## 3. Workflow, ADR, Jenkins

- [x] 3.1 `archgate/module.json` (ARCH-004.md et ARCH-005 en `forge`, règles ARCH-004 en `github`), ARCH-004 généré : variante GitLab et `rules:` conditionnel (français et anglais)
- [x] 3.2 `core` : `CLAUDE.md` et `docs/workflow.md`, blocs `forge`, variante `gitlab` (français et anglais)
- [x] 3.3 `docs/jenkins.md` : variante GitLab (français et anglais) ; commentaires du `Jenkinsfile`, de `jenkins-setup.sh` et description du module

## 4. Audit, skill, reprise

- [x] 4.1 `audit.mjs` : aucun appel à `gh` avec `gitlab`, versions du `Jenkinsfile` sans `ci.yml`
- [x] 4.2 `state.mjs` (`phase2-gitlab`, `phase4-adr` avec la forge) ; `SKILL.md` ; `profile-guard.mjs` : `.gitlab/` protégé comme `.github/`

## 5. Tests et documentation

- [x] 5.1 `assets/modules/gitlab/tests/gitlab.test.mjs`, tests du catalogue (`requiresAny`, `forge`) et de l'audit dans `tests/scaffold.test.mjs`, `tests/state.test.mjs`
- [x] 5.2 `tests/matrix.test.mjs` : fermeture de `requiresAny`, `gitlab` hors des combinaisons `full*`, combinaisons `gitlab` et `gitlab-jenkins`, instantanés relus (ceux de `github` ne changent pas)
- [x] 5.3 `bootstrap-config.md`, `pitfalls.md`, arc42 sections 5, 8 et 11 (via `arc42-keeper`)
- [x] 5.4 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `archgate check` et `openspec validate --all --strict` verts
