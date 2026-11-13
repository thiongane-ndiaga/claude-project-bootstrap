## MODIFIED Requirements

### Requirement: Module jira
Le module `jira` SHALL être optionnel (`default: false`), exiger `github` ou `jenkins` (`requiresAny`) et générer `scripts/check-jira-key.mjs` et `docs/jira.md`. Sans le module, aucun de ces éléments ni aucun bloc Jira n'apparaît dans les fichiers générés, qui restent identiques.

#### Scenario: Module actif
- **WHEN** un projet est généré avec `jira` et `github`
- **THEN** le script et la documentation existent et le job `pr-title` exécute le script

#### Scenario: Module absent
- **WHEN** un projet est généré sans `jira`
- **THEN** ni ces fichiers ni les blocs Jira n'existent et le gabarit de PR garde `Closes #`

#### Scenario: Sans github
- **WHEN** `jira` est demandé sans `github` ni `jenkins`
- **THEN** la génération est refusée (code 1)

#### Scenario: Avec gitlab et jenkins
- **WHEN** un projet est généré avec `gitlab`, `jenkins` et `jira`
- **THEN** le script et la documentation existent, il n'y a aucun `ci.yml` et le `Jenkinsfile` exécute le script

#### Scenario: Avec gitlab sans jenkins
- **WHEN** `jira` est demandé avec `gitlab` sans `jenkins`
- **THEN** la génération est refusée (code 1)

### Requirement: Conventions du mode jira
En mode `jira`, les modèles listés dans la conception SHALL poser la branche `<type>/<CLE-N>-<slug>`, l'id OpenSpec en minuscules `<cle-n>-<slug>`, l'en-tête `Ticket: CLE-N` de `proposal.md` et `Refs CLE-N` au lieu de `Closes #N` ; `spec-review` et `spec-reviewer` ne lisent pas le ticket par `gh`, y compris avec `gitlab`. En mode `github`, ils gardent `Closes #N` et ajoutent la clé Jira en lien.

#### Scenario: Corps de PR
- **WHEN** un projet est généré avec `jiraSource: jira`
- **THEN** le gabarit de PR contient `Refs` et pas `Closes #`, et `openspec-config.md` annonce `Ticket:`

#### Scenario: Mode github
- **WHEN** un projet est généré avec `jira` sans `jiraSource`
- **THEN** le gabarit garde `Closes #`, ajoute la ligne Jira, et les formulaires ont un champ « Clé Jira »

#### Scenario: Lecture du ticket avec gitlab
- **WHEN** un projet est généré avec `gitlab`, `openspec` et `jiraSource: jira`
- **THEN** `spec-reviewer` demande le texte du ticket à l'utilisateur et la description parle de ticket Jira

### Requirement: Documentation des étapes manuelles
`docs/jira.md` (français et anglais) SHALL lister les étapes manuelles (projet Jira, app Jira Cloud pour GitHub, « Autolink references », fermeture des tickets), les règles de nommage (clé dans la description du titre, branche non renommable), les limites (faux positifs sans clé de projet, aucun essai réel, aucune écriture dans Jira, `Jenkinsfile` sans contrôle avec `github`) et, en mode `jira` seulement, la table de lecture « issue → ticket ».

#### Scenario: Étapes présentes
- **WHEN** un projet est généré avec `jira`, en français puis en anglais
- **THEN** `docs/jira.md` contient ces éléments, la table de lecture seulement en mode `jira`

## ADDED Requirements

### Requirement: Documentation avec GitLab
Avec `gitlab`, `docs/jira.md` SHALL remplacer l'app Jira Cloud pour GitHub et les « Autolink references » par l'intégration Jira du projet GitLab, citer l'étape `Clé Jira` du `Jenkinsfile`, ne pas proposer le module `projects` et ne citer ni `ci.yml` ni les issues GitHub.

#### Scenario: Variante GitLab
- **WHEN** un projet est généré avec `gitlab`, `jenkins` et `jira`, en français puis en anglais
- **THEN** `docs/jira.md` cite l'intégration Jira de GitLab et l'étape du `Jenkinsfile`, et ne cite ni l'app Jira Cloud ni `ci.yml`

### Requirement: Conventions Jira avec GitLab
Avec `gitlab` et `jira`, le gabarit de merge request, les gabarits d'issues, `CLAUDE.md` et `docs/workflow.md` SHALL suivre la source du besoin : en mode `github`, `Closes #`, une ligne Jira et un champ « Clé Jira » ; en mode `jira`, `Refs <CLE-N>`, la branche `<type>/<CLE-N>-<slug>` et le ticket Jira comme besoin. Le tableau des contrôles et la table « Double encodage » citent l'étape `Clé Jira` du `Jenkinsfile`.

#### Scenario: Mode jira avec gitlab
- **WHEN** un projet est généré avec `gitlab`, `jenkins`, `jira` et `jiraSource: jira`
- **THEN** le gabarit de merge request contient `Refs` et pas `Closes #`, et `CLAUDE.md` parle de ticket Jira

#### Scenario: Mode github avec gitlab
- **WHEN** un projet est généré avec `gitlab`, `jenkins` et `jira` sans `jiraSource`
- **THEN** le gabarit de merge request garde `Closes #` et ajoute la ligne Jira, et les gabarits d'issues ont le champ « Clé Jira »
