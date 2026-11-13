## ADDED Requirements

### Requirement: Migration du réglage de squash
La migration `0004-squash-title-only` (module `github`, avec forge) SHALL lire le dépôt visé et proposer, si `squash_merge_commit_title` n'est pas `PR_TITLE` ou `squash_merge_commit_message` n'est pas `BLANK`, une action qui règle les deux dans un même appel. Elle MUST ne rien proposer quand le réglage est conforme, et sa commande MUST viser le dépôt reçu, jamais celui du dossier courant.

#### Scenario: Réglage conforme
- **WHEN** le dépôt a `PR_TITLE` et `BLANK`
- **THEN** la migration ne propose aucune action

#### Scenario: Message avec les commits
- **WHEN** le dépôt a `COMMIT_OR_PR_TITLE` ou `COMMIT_MESSAGES`
- **THEN** la migration propose une action qui règle `PR_TITLE` et `BLANK` sur `repos/<repo>`

#### Scenario: Message avec la description
- **WHEN** le dépôt a `PR_TITLE` et `PR_BODY`
- **THEN** la migration propose la même action, car le corps de la PR porte `Closes #N`

### Requirement: Cas particuliers de la migration
Quand le squash est désactivé, la migration SHALL ne proposer aucune action et rendre une note qui le signale. Quand la réponse de l'API n'a pas les champs de squash, elle SHALL lever une erreur, que l'audit rend `non-verifiable`.

#### Scenario: Squash désactivé
- **WHEN** le dépôt n'autorise pas le squash
- **THEN** aucune action n'est proposée et une note dit que le workflow impose le squash merge

#### Scenario: Champs absents
- **WHEN** la réponse n'a ni `squash_merge_commit_title` ni `squash_merge_commit_message`
- **THEN** le contrôle de l'audit est `non-verifiable` et non un écart

### Requirement: Application et échec
`migrate.mjs --apply` SHALL appliquer l'action par un `PATCH` sur `repos/<repo>` et consigner la migration au manifeste ; si le `PATCH` échoue, la migration n'est pas consignée et l'erreur remonte.

#### Scenario: Application
- **WHEN** `migrate.mjs --apply` traite ce dépôt
- **THEN** un appel `PATCH repos/<repo>` règle les deux paramètres et la migration est consignée

#### Scenario: Échec du PATCH
- **WHEN** le `PATCH` est refusé (droits insuffisants)
- **THEN** la migration n'est pas consignée et l'erreur est rapportée

### Requirement: Mise en place et documents
Le skill SHALL régler le squash à la mise en place du dépôt GitHub (avec accord ; en cas de refus d'accès, donner la commande à l'utilisateur). Avec `github`, que `release` soit choisi ou non, `docs/workflow.md` et ARCH-005 générés SHALL dire que le titre de la PR est le commit de squash et que `Closes #N` n'est jamais dans un commit. En mode `jira`, `workflow.md` dit que la clé Jira doit figurer dans le titre de la PR pour que le commit la porte.

#### Scenario: Documents générés
- **WHEN** un projet est généré avec `github` et `archgate`, avec ou sans `release`
- **THEN** `docs/workflow.md` et ARCH-005 citent cette règle, et un projet avec `gitlab` ne reçoit pas ce texte

#### Scenario: Mode jira
- **WHEN** un projet est généré avec `github` et `jiraSource: jira`
- **THEN** `docs/workflow.md` dit que la clé Jira doit figurer dans le titre de la PR

#### Scenario: Étape de mise en place
- **WHEN** le skill met en place GitHub
- **THEN** `references/github-setup.md` contient la commande `PATCH` du réglage
