# Spec Delta

## ADDED Requirements

### Requirement: Statuts du Project dans le workflow
Avec `projects` et `issue-source`, `docs/workflow.md` SHALL dire que la carte passe en *In Progress* à la création de la branche sur GitHub et en *In Review* à l'ouverture de la PR, « automatiques avec le secret, manuels sans » (« automatic with the secret, manual without » en anglais), et nommer `PROJECT_TOKEN` et `PROJECT_NUMBER`. Avec `projects` et `jira-source`, il SHALL dire que ces statuts se règlent à la main, sans « auto-add ». Sans `projects`, il n'en parle pas.

#### Scenario: Source GitHub
- **WHEN** un projet est généré avec `github` et `projects`, en français puis en anglais
- **THEN** le document contient « automatiques avec le secret, manuels sans » puis « automatic with the secret, manual without », cite `PROJECT_TOKEN` et `PROJECT_NUMBER`, la création de la branche sur GitHub et l'ouverture de la PR

#### Scenario: Source Jira
- **WHEN** un projet est généré avec `github`, `projects`, `jira` et `jiraSource: jira`
- **THEN** le document ne cite ni `PROJECT_TOKEN`, ni `PROJECT_NUMBER`, ni « auto-add » et dit que *In Progress* et *In Review* se règlent à la main

#### Scenario: Sans projects
- **WHEN** un projet est généré avec `github` sans `projects`
- **THEN** le document ne cite ni *In Progress*, ni *In Review*, ni `PROJECT_TOKEN`, ni `PROJECT_NUMBER`

#### Scenario: Marqueurs identiques dans les deux langues
- **WHEN** les modèles français et anglais de `docs/workflow.md` sont comparés
- **THEN** leurs marqueurs `@@module` et `@@end` sont identiques, dans le même ordre d'imbrication
