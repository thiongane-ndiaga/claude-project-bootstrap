## MODIFIED Requirements

### Requirement: Workflow sans GitHub
Avec `gitlab`, `CLAUDE.md` et `docs/workflow.md` SHALL garder les étapes du besoin (issue, ou ticket Jira en mode `jira`), de la PR et de la traçabilité, et poser les équivalents GitLab (gabarits `.gitlab/`, `Jenkinsfile`) à la place des passages propres à GitHub (formulaires, `ci.yml`, protection de branche, runners). Aucun lien vers `.github/` n'y subsiste.

#### Scenario: Étapes conservées
- **WHEN** un projet est généré avec `gitlab`
- **THEN** `CLAUDE.md` et `docs/workflow.md` contiennent l'étape de la PR avec `Closes #N` et le contrôle du titre, et aucun `.github/` ni `ci.yml`

#### Scenario: Mode jira
- **WHEN** un projet est généré avec `gitlab`, `jira` et `jiraSource: jira`
- **THEN** ces fichiers parlent de ticket Jira et de `Refs <CLE-N>`, sans `Closes #N`

### Requirement: Gabarits de merge request et d'issues
Le gabarit de merge request SHALL reprendre les rubriques du gabarit de PR de `github` (`Closes #` ou `Refs` en mode `jira`, changement OpenSpec, ADR, résumé, liste de contrôle, selon les modules actifs), et les gabarits d'issues SHALL reprendre les rubriques des formulaires de `github`.

#### Scenario: Rubriques selon les modules
- **WHEN** un projet est généré avec `gitlab` et `openspec`
- **THEN** le gabarit de merge request contient `Closes #` et la rubrique du changement OpenSpec

#### Scenario: Mode jira
- **WHEN** un projet est généré avec `gitlab` et `jiraSource: jira`
- **THEN** le gabarit de merge request contient `Refs` et pas `Closes #`
