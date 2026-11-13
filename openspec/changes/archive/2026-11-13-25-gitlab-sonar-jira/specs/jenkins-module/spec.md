## MODIFIED Requirements

### Requirement: Étapes du Jenkinsfile
Le `Jenkinsfile` SHALL être un pipeline déclaratif dont les étapes se suivent dans l'ordre de `ci.yml` : `Node`, `Titre de PR`, `CLI d'outillage` (avec `openspec` ou `archgate`), `OpenSpec validate` (avec `openspec`), `Archgate check` (avec `archgate`), `Chaîne d'outils du projet`, `Commandes du projet`. En anglais : `PR title`, `Tooling CLIs`, `Project toolchain`, `Project commands`. Avec `gitlab`, `jira` et `sonar` y ajoutent `Clé Jira` / `Jira key` et `Sonar`.

#### Scenario: Sélection complète
- **WHEN** un projet est généré avec `github`, `openspec`, `archgate` et `jenkins`
- **THEN** les sept étapes figurent dans cet ordre

#### Scenario: Sans openspec ni archgate
- **WHEN** ni `openspec` ni `archgate` n'est sélectionné
- **THEN** le `Jenkinsfile` ne contient ni `openspec`, ni `archgate`, ni l'étape `CLI d'outillage`

#### Scenario: Avec gitlab, jira et sonar
- **WHEN** un projet est généré avec `gitlab`, `jenkins`, `jira` et `sonar`, en français puis en anglais
- **THEN** `Clé Jira` (`Jira key`) suit `Titre de PR` (`PR title`) et `Sonar` suit `Commandes du projet` (`Project commands`)

### Requirement: Variante GitLab de la documentation
Avec `gitlab`, `docs/jenkins.md` SHALL décrire GitLab Branch Source, le webhook et le jeton côté GitLab, l'option « les pipelines doivent réussir », la confiance des merge requests de fork, les étapes `Clé Jira` et `Sonar` quand leurs modules sont actifs et le délai de dix minutes du pipeline qui couvre l'analyse, et ne pas citer GitHub, `ci.yml` ni les protections de branche de GitHub Free.

#### Scenario: Documentation GitLab
- **WHEN** un projet est généré avec `gitlab` et `jenkins`, en français puis en anglais
- **THEN** `docs/jenkins.md` cite GitLab Branch Source et la confiance des forks, et ne contient ni `GitHub` ni `ci.yml`

#### Scenario: Étapes Jira et Sonar dans la documentation
- **WHEN** un projet est généré avec `gitlab`, `jenkins`, `jira` et `sonar`
- **THEN** `docs/jenkins.md` cite les étapes `Clé Jira` et `Sonar` et le délai du pipeline

## ADDED Requirements

### Requirement: Étape Clé Jira avec GitLab
Avec `gitlab` et `jira`, le `Jenkinsfile` SHALL contenir l'étape `Clé Jira`, exécutée sur les changements de PR seulement, avec le titre et la branche passés par `withEnv` (branche vide si absente) et `sh` entre guillemets simples.

#### Scenario: Étape Clé Jira
- **WHEN** un projet est généré avec `gitlab`, `jenkins` et `jira`
- **THEN** le `Jenkinsfile` a l'étape `Clé Jira` avec `CHANGE_TITLE` et `CHANGE_BRANCH` seulement dans `withEnv`

### Requirement: Étape Sonar avec GitLab
Avec `gitlab` et `sonar`, l'étape `Sonar` SHALL être conditionnée par `SONAR_ENABLED`, exclure les merge requests de fork (`CHANGE_FORK`) et lire le jeton par `withCredentials` sans interpolation Groovy. En mode `server`, elle SHALL n'analyser que `main` et refuser de lancer `sonar-scanner` sans `SONAR_HOST_URL`.

#### Scenario: Étape Sonar inactive par défaut
- **WHEN** un projet est généré avec `gitlab`, `jenkins` et `sonar`
- **THEN** l'étape `Sonar` est conditionnée par `SONAR_ENABLED`, lit le jeton par `withCredentials` et ne contient ni `-Dsonar.token` ni `${SONAR_TOKEN}`

#### Scenario: MR de fork
- **WHEN** un projet est généré avec `gitlab`, `jenkins` et `sonar`, en mode `cloud` ou `server`
- **THEN** l'étape `Sonar` exclut les merge requests de fork par `env.CHANGE_FORK == null`

#### Scenario: Mode cloud
- **WHEN** `sonar` vaut `cloud`
- **THEN** l'étape pose `SONAR_HOST_URL=https://sonarcloud.io` dans la commande et n'est pas limitée à `main`

#### Scenario: Mode serveur
- **WHEN** `sonar` vaut `server`
- **THEN** l'étape ne s'exécute que sur `main`, ne pose pas l'URL SonarCloud et vérifie `SONAR_HOST_URL` avant `sonar-scanner`

### Requirement: Jenkinsfile GitHub inchangé
Avec `github`, le `Jenkinsfile` SHALL rester identique que les modules `jira` et `sonar` soient actifs ou non : `ci.yml` porte déjà ces contrôles.

#### Scenario: Avec github
- **WHEN** un projet est généré avec `github`, `jenkins`, `jira` et `sonar`
- **THEN** le `Jenkinsfile` est identique à celui d'un projet sans `jira` ni `sonar`
