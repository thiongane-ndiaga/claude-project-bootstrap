## MODIFIED Requirements

### Requirement: Module jenkins
Le catalogue SHALL contenir un module `jenkins` qui requiert `github` ou `gitlab` (`requiresAny`), vaut `default: false` et n'a pas de question de phase 0. Sélectionné, il SHALL générer `Jenkinsfile`, `scripts/jenkins-setup.sh` et `docs/jenkins.md`, sans autre fichier ni modification de `.claude/settings.json`. Non sélectionné, aucun de ces fichiers MUST NOT exister.

#### Scenario: Module sélectionné
- **WHEN** un projet est généré avec `github` et `jenkins`
- **THEN** les trois fichiers existent et `settings.json` est identique à celui d'une génération sans `jenkins`

#### Scenario: Module absent
- **WHEN** `jenkins` n'est pas sélectionné
- **THEN** aucun des trois fichiers n'existe

#### Scenario: Sans github
- **WHEN** `jenkins` est sélectionné sans `github` ni `gitlab`
- **THEN** la génération est refusée avec le code 1

#### Scenario: Avec gitlab
- **WHEN** un projet est généré avec `gitlab` et `jenkins`
- **THEN** les trois fichiers existent, il n'y a aucun `ci.yml` et le `Jenkinsfile` garde l'étape `Titre de PR`

## ADDED Requirements

### Requirement: Variante GitLab de la documentation
Avec `gitlab`, `docs/jenkins.md` SHALL décrire GitLab Branch Source, le webhook et le jeton côté GitLab, l'option « les pipelines doivent réussir », la confiance des merge requests de fork, et ne pas citer GitHub, `ci.yml` ni les protections de branche de GitHub Free.

#### Scenario: Documentation GitLab
- **WHEN** un projet est généré avec `gitlab` et `jenkins`, en français puis en anglais
- **THEN** `docs/jenkins.md` cite GitLab Branch Source et la confiance des forks, et ne contient ni `GitHub` ni `ci.yml`
