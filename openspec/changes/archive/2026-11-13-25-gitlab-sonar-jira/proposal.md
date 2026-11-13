Issue: #25
ADR: ARCH-018 (amendé : Jira et Sonar sur Jenkins avec GitLab), ARCH-017 (amendé : le contrôle de la clé Jira peut vivre dans le `Jenkinsfile`), ARCH-004 (plugin : consentement Sonar par `SONAR_ENABLED` côté Jenkins), ARCH-010 et ARCH-006 (appliqués)

## Why

Le premier lot de #25 (changement `25-gitlab-module`, PR #154) permet un projet hébergé sur GitLab avec Jenkins pour la CI. Le mainteneur veut aussi Sonar pour la qualité et Jira pour les tickets avec cette pile. Or `sonar` et `jira` exigent `github`, dont ils utilisent `ci.yml` : un projet GitLab + Jenkins ne peut pas les choisir. Ce second lot ferme l'issue.

## What Changes

- `sonar` et `jira` passent de `requires: github` à `requiresAny: ["github", "jenkins"]` (une CI au moins). Sans `github`, leurs fichiers (`sonar-project.properties`, `docs/sonar.md`, `scripts/check-jira-key.mjs`, `docs/jira.md`) sont générés comme avant, sans bloc de `ci.yml`.
- Avec `gitlab`, le `Jenkinsfile` gagne une étape `Clé Jira` (module `jira`) et une étape `Sonar` (module `sonar`). Avec `github`, le `Jenkinsfile` ne change pas : `ci.yml` porte déjà ces contrôles, pas de double analyse.
- Variantes GitLab de `docs/sonar.md` (identifiant Jenkins `SONAR_TOKEN`, variable `SONAR_ENABLED`, `sonar-scanner` sur l'agent) et de `docs/jira.md` (intégration Jira de GitLab au lieu de l'app Jira Cloud pour GitHub, contrôle dans le `Jenkinsfile`).
- Variantes GitLab de ce que `jira` ajoute à `core`, au gabarit de merge request et aux gabarits d'issues (clé Jira, `Refs`, ticket Jira).
- `.gitlab/**` ajouté aux exclusions de `sonar-project.properties`.
- La description des modules `sonar` et `jira` ne parle plus que de `ci.yml`.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `jira-module`, `sonar-module` : dépendance alternative, documentation.
- `jenkins-module` : étapes `Clé Jira` et `Sonar` avec `gitlab`.

## Impact

`sonar/module.json`, `jira/module.json`, `Jenkinsfile` et `docs/jenkins.md` du module `jenkins`, `docs/sonar.md`, `docs/jira.md`, `sonar-project.properties`, gabarits de `gitlab`, `core` (`CLAUDE.md`, `docs/workflow.md`), ARCH-017, ARCH-018, ARCH-004 (plugin), `SKILL.md`, `pitfalls.md`, arc42, tests et instantanés. Les fichiers générés d'un projet avec `github` ne changent pas.
