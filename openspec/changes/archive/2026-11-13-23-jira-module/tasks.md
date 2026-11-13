## 1. ADR et module

- [x] 1.1 ARCH-017 (source du besoin) ; ARCH-005 amendé dans le plugin et dans le modèle généré ; ARCH-002 et ARCH-003 du modèle généré (variantes `jira-source`), `templates` et `templates.en`
- [x] 1.2 `assets/modules/jira/module.json` (`requires: github`, `default: false`, questions `jira` et `jiraSource`, fichiers)
- [x] 1.3 `scripts/check-jira-key.mjs` et étape du job `pr-title` de `ci.yml` (`templates` et `templates.en`)
- [x] 1.4 Blocs `jira-source` / `issue-source`, `templates` et `templates.en` : gabarit de PR, formulaires (`feature`, `bug`, `architecture-decision`), `workflow.md`, `CLAUDE.md`, `traceability-checker`, `pr-readiness-review`, `spec-review`, `spec-reviewer`, `openspec-config.md`
- [x] 1.5 `docs/jira.md` français et anglais (table de lecture en mode `jira`)
- [x] 1.6 `scaffold.mjs` (clés, validation, héritage, `null`, paramètres, pseudo-modules), `catalog.mjs` (`PSEUDO_MODULES`), `state.mjs` (`ANSWER_KEYS` : `jira`, `jiraSource`, `sonar`)

## 2. Tests

- [x] 2.1 `assets/modules/jira/tests/jira.test.mjs` : génération, absence (fichiers inchangés), refus, valeurs invalides, clés sans module, héritage et retrait, script exécuté (tous les scénarios du contrôle), gabarits, formulaires et modèles selon le mode, documentation par langue
- [x] 2.2 `tests/scaffold.test.mjs` (dix-huit modules, test de traçabilité `dependabot` relu), `tests/state.test.mjs` (clés conservées à la reprise), `tests/matrix.test.mjs` (combinaisons `jira` et `jira-source`), instantanés relus

## 3. Documentation

- [x] 3.1 `SKILL.md` (questions de phase 0, désactivation de `projects`, phase 4 en mode `jira`, « ce qui restera manuel »), `bootstrap-config.md`, `pitfalls.md` (non observés)
- [x] 3.2 arc42 sections 5, 8 et 11 (via `arc42-keeper`)
- [x] 3.3 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `archgate check` et `openspec validate --all --strict` verts
