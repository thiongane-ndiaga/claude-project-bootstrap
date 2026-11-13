# gitlab-module Specification

## Purpose
Faire de GitLab l'hébergement du code d'un projet généré, sans GitHub : gabarits de merge request et d'issues, workflow, ADR de forge, audit et reprise de session adaptés, la CI étant le `Jenkinsfile`, avec la documentation des étapes manuelles et des limites.

## Requirements

### Requirement: Module gitlab
Le catalogue SHALL contenir un module `gitlab`, `default: false`, incompatible avec `github`. Sélectionné, il SHALL générer `.gitlab/merge_request_templates/Default.md`, `.gitlab/issue_templates/` (fonctionnalité, anomalie, décision d'architecture) et `docs/gitlab.md`, sans `.gitlab-ci.yml` ni fichier sous `.github/`.

#### Scenario: Module sélectionné
- **WHEN** un projet est généré avec `gitlab`
- **THEN** ces fichiers existent et ni `.github/` ni `.gitlab-ci.yml` n'existent

#### Scenario: Avec github
- **WHEN** `gitlab` et `github` sont sélectionnés ensemble
- **THEN** la génération est refusée avec le code 2

#### Scenario: Modules réservés à GitHub
- **WHEN** `release`, `projects` ou `dependabot` est sélectionné avec `gitlab`
- **THEN** la génération est refusée avec le code 1 (le module requiert `github`)

### Requirement: Titre de PR et ADR de forge
`scripts/check-pr-title.mjs` SHALL appartenir à `core` et être généré avec `github` ou `gitlab`. Les ADR ARCH-004 et ARCH-005 générés SHALL l'être avec `github` ou `gitlab` ; ARCH-004 décrit GitLab et Jenkins avec `gitlab` (sans release-please ni `ci.yml`, `rules: false`), et son fichier de règles n'est généré qu'avec `github`.

#### Scenario: Même script
- **WHEN** un projet est généré avec `github` puis avec `gitlab`, en français et en anglais
- **THEN** `scripts/check-pr-title.mjs` est présent et identique

#### Scenario: ADR avec gitlab
- **WHEN** un projet est généré avec `archgate` et `gitlab`
- **THEN** ARCH-004 nomme GitLab, ne contient ni `release-please` ni `ci.yml`, aucun `.rules.ts` d'ARCH-004 n'existe et `archgate check` ne signale aucune incohérence de règles

### Requirement: Gabarits de merge request et d'issues
Le gabarit de merge request SHALL reprendre les rubriques du gabarit de PR de `github` (`Closes #` ou `Refs` en mode `jira`, changement OpenSpec, ADR, résumé, liste de contrôle, selon les modules actifs), et les gabarits d'issues SHALL reprendre les rubriques des formulaires de `github`.

#### Scenario: Rubriques selon les modules
- **WHEN** un projet est généré avec `gitlab` et `openspec`
- **THEN** le gabarit de merge request contient `Closes #` et la rubrique du changement OpenSpec

#### Scenario: Mode jira
- **WHEN** un projet est généré avec `gitlab` et `jiraSource: jira`
- **THEN** le gabarit de merge request contient `Refs` et pas `Closes #`

### Requirement: Workflow sans GitHub
Avec `gitlab`, `CLAUDE.md` et `docs/workflow.md` SHALL garder les étapes du besoin (issue, ou ticket Jira en mode `jira`), de la PR et de la traçabilité, et poser les équivalents GitLab (gabarits `.gitlab/`, `Jenkinsfile`) à la place des passages propres à GitHub (formulaires, `ci.yml`, protection de branche, runners). Aucun lien vers `.github/` n'y subsiste.

#### Scenario: Étapes conservées
- **WHEN** un projet est généré avec `gitlab`
- **THEN** `CLAUDE.md` et `docs/workflow.md` contiennent l'étape de la PR avec `Closes #N` et le contrôle du titre, et aucun `.github/` ni `ci.yml`

#### Scenario: Mode jira
- **WHEN** un projet est généré avec `gitlab`, `jira` et `jiraSource: jira`
- **THEN** ces fichiers parlent de ticket Jira et de `Refs <CLE-N>`, sans `Closes #N`

### Requirement: Documentation des étapes manuelles
`docs/gitlab.md` (français et anglais) SHALL lister les étapes manuelles (dépôt, protection de `main` avec « les pipelines doivent réussir », méthode de merge en squash avec le titre de la MR, labels, jeton et webhook pour Jenkins), la table de lecture PR → MR et `gh` → `glab`, et les limites (aucune CI sans `jenkins`, aucune release automatique, étapes `gh` absentes des profils d'agents, MR en brouillon refusée par le contrôle du titre, nom d'ARCH-004, aucun essai réel).

#### Scenario: Étapes présentes
- **WHEN** un projet est généré avec `gitlab`, en français puis en anglais
- **THEN** `docs/gitlab.md` contient ces éléments

### Requirement: Audit et reprise sans GitHub
Avec `gitlab`, l'audit SHALL ne jamais appeler `gh`, même avec `--repo`, rendre le contrôle de forge `non-verifiable` avec la raison, et lire les versions épinglées dans le `Jenkinsfile` quand il n'y a pas de `ci.yml`. L'état de reprise SHALL proposer l'acceptation des ADR avec `github` ou `gitlab` et n'imposer l'étape `gh` qu'avec `github`.

#### Scenario: Audit de la forge
- **WHEN** l'audit est lancé avec `--forge` et `--repo` sur un projet `gitlab`
- **THEN** le contrôle de forge est `non-verifiable` et aucun appel à `gh` n'est émis

#### Scenario: Versions du Jenkinsfile
- **WHEN** un projet `gitlab` et `jenkins` a une version d'OpenSpec différente du manifeste dans le `Jenkinsfile`
- **THEN** le contrôle de version est un écart qui cite le `Jenkinsfile`

#### Scenario: Étapes de reprise
- **WHEN** l'état d'un projet `gitlab` avec `archgate` est lu
- **THEN** l'étape d'acceptation des ADR est applicable et l'étape du dépôt GitHub ne l'est pas
