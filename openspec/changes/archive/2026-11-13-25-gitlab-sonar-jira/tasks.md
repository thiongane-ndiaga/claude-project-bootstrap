## 1. ADR et descripteurs

- [x] 1.1 ARCH-017, ARCH-018 et ARCH-004 (plugin) amendés
- [x] 1.2 `sonar/module.json` et `jira/module.json` : `requiresAny: ["github", "jenkins"]`, descriptions sans `ci.yml` seul

## 2. Jenkinsfile

- [x] 2.1 Étapes `Clé Jira` et `Sonar` avec `gitlab` (français et anglais), jamais avec `github`
- [x] 2.2 `docs/jenkins.md` : mention des étapes avec `gitlab`, délai du pipeline

## 3. Documentation et modèles

- [x] 3.1 `docs/sonar.md` : variante GitLab (français et anglais) ; `.gitlab/**` dans les exclusions de `sonar-project.properties`
- [x] 3.2 `docs/jira.md` : variante GitLab (français et anglais)
- [x] 3.3 Gabarit de merge request, gabarits d'issues, `CLAUDE.md`, `docs/workflow.md` : variantes Jira avec `gitlab`

## 4. Tests et documentation

- [x] 4.1 Tests des modules `sonar`, `jira`, `jenkins` et `gitlab` (dépendances, étapes, ordre, absence avec `github`, docs, variantes)
- [x] 4.2 `tests/matrix.test.mjs` : combinaison `gitlab-sonar-jira`, instantanés relus (ceux de `github` ne changent pas)
- [x] 4.3 `SKILL.md`, `pitfalls.md`, arc42 (sections 5, 8, 11 via `arc42-keeper`)
- [x] 4.4 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `archgate check` et `openspec validate --all --strict` verts
