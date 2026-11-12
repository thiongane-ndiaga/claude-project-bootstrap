## 1. Audit

- [x] 1.1 `forge-protection` : contexte `continuous-integration/jenkins/` reconnu avec le module `jenkins`, écart sans le module
- [x] 1.2 `checkVersions` : version du `Jenkinsfile` lue hors mode `local`, correction avec alignement du `Jenkinsfile`

## 2. Tests et documentation

- [x] 2.1 `tests/scaffold.test.mjs` : contexte Jenkins (sans application, application tierce, sans module, avec un autre check inexistant), version identique, divergente, mode local
- [x] 2.2 `docs/jenkins.md` (français et anglais) et `pitfalls.md` : limites reformulées
- [x] 2.3 arc42 sections 8 et 11 (via `arc42-keeper`)
- [x] 2.4 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `archgate check` et `openspec validate --all --strict` verts
