# projects-module Specification

## Purpose
Faire avancer automatiquement la carte d'une issue dans le Project GitHub (In Progress, In Review) par un workflow optionnel du module `projects`, inactif sans secret, sans jeton écrit dans un fichier et sans rien changer pour les autres statuts, que les workflows intégrés de GitHub gèrent.

## Requirements

### Requirement: Workflow project-status
Le module `projects` SHALL générer `.github/workflows/project-status.yml`, en français et en anglais, quand `issue-source` est actif. En mode `jiraSource: jira` ou sans le module, le fichier MUST NOT exister. `scaffold.mjs --update` le crée dans un projet existant qui a `projects`.

#### Scenario: Workflow présent avec le module
- **WHEN** un projet est généré avec `github` et `projects`, en français puis en anglais
- **THEN** `.github/workflows/project-status.yml` existe et `module.json` le déclare avec `when: ["issue-source"]`

#### Scenario: Workflow absent en mode jira
- **WHEN** un projet est généré avec `github`, `projects`, `jira` et `jiraSource: jira`
- **THEN** aucun fichier `project-status.yml` n'existe et la génération réussit

#### Scenario: Workflow absent sans le module
- **WHEN** un projet est généré sans `projects`
- **THEN** aucun fichier `project-status.yml` n'existe

#### Scenario: Workflow refusé avec gitlab
- **WHEN** `projects` est demandé avec `gitlab`
- **THEN** la génération est refusée (code 1) et aucun fichier `project-status.yml` n'est écrit

#### Scenario: Ajout par mise à jour
- **WHEN** `scaffold.mjs --update` est lancé sur un projet généré avec `projects` avant ce changement, dont le fichier et l'entrée du manifeste sont absents
- **THEN** `project-status.yml` figure parmi les fichiers créés, et un second `--update` ne change rien

### Requirement: Déclencheurs
Le workflow SHALL se déclencher exactement sur `create` et sur `pull_request` avec les types `opened`, `reopened`, `ready_for_review`, `converted_to_draft` et `closed`. Il MUST NOT déclarer `push`, `synchronize`, `pull_request_target` ni `workflow_dispatch`.

#### Scenario: Déclencheurs exacts
- **WHEN** le bloc `on:` du workflow généré est lu
- **THEN** il contient `create` et `pull_request` avec exactement ces cinq types, et aucun autre événement

#### Scenario: Événements exclus
- **WHEN** le fichier généré est lu
- **THEN** il ne contient ni `push`, ni `synchronize`, ni `pull_request_target`, ni `workflow_dispatch`

### Requirement: Événements traités
Le job SHALL ignorer, par une condition de job qui ne cite aucun secret, un `create` qui ne crée pas une branche et un `pull_request` `closed` dont la PR est fusionnée. Le passage à *Done* d'une PR fusionnée revient au workflow intégré.

#### Scenario: Création d'une étiquette
- **WHEN** l'événement `create` porte un type de référence autre que `branch`
- **THEN** le job n'est pas exécuté, d'après sa condition

#### Scenario: PR fusionnée
- **WHEN** une PR est fermée avec merge
- **THEN** le job n'est pas exécuté, d'après sa condition

### Requirement: Droits et concurrence
Le workflow SHALL déclarer `permissions: {}` au niveau du workflow et un groupe de concurrence `project-status-${{ github.head_ref || github.ref_name }}` sans annulation des exécutions en cours.

#### Scenario: Permissions vides
- **WHEN** le workflow généré est lu
- **THEN** il contient `permissions: {}` au niveau du workflow et aucune permission accordée à un job

#### Scenario: Groupe par branche
- **WHEN** le workflow généré est lu
- **THEN** son groupe de concurrence est `project-status-${{ github.head_ref || github.ref_name }}` et `cancel-in-progress` vaut `false`

### Requirement: Valeurs lues à l'exécution
Le workflow SHALL lire à l'exécution le secret `PROJECT_TOKEN`, la variable `PROJECT_NUMBER` et la variable `PROJECT_OWNER`, dont l'absence donne `github.repository_owner`. Toute affectation de ces trois valeurs dans le YAML MUST être une expression `secrets.…` ou `vars.…`, jamais une valeur littérale.

#### Scenario: Lecture par l'environnement
- **WHEN** le workflow généré est lu
- **THEN** `secrets.PROJECT_TOKEN`, `vars.PROJECT_NUMBER` et `vars.PROJECT_OWNER` sont lus dans l'environnement du job, avec `github.repository_owner` en valeur de repli du propriétaire

#### Scenario: Aucune valeur littérale affectée
- **WHEN** les lignes YAML de la forme `CLÉ: valeur` dont la clé est `PROJECT_TOKEN`, `PROJECT_NUMBER` ou `PROJECT_OWNER` sont lues
- **THEN** chaque valeur est une expression `${{ secrets.… }}` ou `${{ vars.… }}` ; les lignes de script qui testent ou transmettent `"$PROJECT_NUMBER"` ne sont pas concernées

### Requirement: Portée du jeton
`PROJECT_TOKEN`, `PROJECT_NUMBER`, `PROJECT_OWNER` et `BRANCH` SHALL être posés dans l'environnement du job. `GH_TOKEN` MUST être posé seulement sur l'étape de mise à jour, à partir de `secrets.PROJECT_TOKEN`.

#### Scenario: Environnement du job
- **WHEN** le workflow généré est lu
- **THEN** l'environnement du job contient `PROJECT_TOKEN`, `PROJECT_NUMBER`, `PROJECT_OWNER` et `BRANCH`, et pas `GH_TOKEN`

#### Scenario: Jeton transmis à gh
- **WHEN** l'étape de notice et l'étape de mise à jour sont lues
- **THEN** `GH_TOKEN` n'est posé que sur l'étape de mise à jour

### Requirement: Inactif sans configuration
Quand `PROJECT_TOKEN` ou `PROJECT_NUMBER` est vide, le workflow SHALL émettre une notice qui nomme la valeur absente et réussir sans rien écrire. La présence se teste par une condition d'étape sur `env`, jamais par une condition de job.

#### Scenario: Étapes conditionnées
- **WHEN** le workflow généré est lu
- **THEN** une étape de notice porte une condition sur `env.PROJECT_TOKEN` ou `env.PROJECT_NUMBER` vide, l'étape de mise à jour la condition inverse, et aucune condition de job ne cite `secrets`

#### Scenario: Secret absent
- **WHEN** le workflow s'exécute sans le secret, y compris pour une PR de fork ou de Dependabot
- **THEN** il réussit avec la notice et le Project est inchangé

### Requirement: Issue cible
La cible SHALL être la seule issue dont le numéro suit le type dans le nom de branche, selon `^[a-z]+/([0-9]+)-`. Les branches `dependabot/…` et `release-please--…` et celles sans numéro MUST NOT modifier de carte, et `Closes #N` n'est pas lu.

#### Scenario: Branche conforme
- **WHEN** la branche est `feat/175-project-status-action`
- **THEN** l'issue ciblée est la 175

#### Scenario: Branche sans numéro
- **WHEN** la branche est `dependabot/npm_and_yarn/x-1`, `release-please--branches--main` ou `fix/sans-numero`
- **THEN** le workflow réussit sans modifier aucune carte

#### Scenario: PR qui ferme plusieurs issues
- **WHEN** une PR dont la branche nomme l'issue 12 contient `Closes #12` et `Closes #13`
- **THEN** seule la carte de l'issue 12 peut changer

### Requirement: Statut dérivé de l'état
Le statut posé SHALL dépendre de l'état et non de l'événement : issue fermée ou carte en *Done*, aucune écriture ; PR ouverte hors brouillon, du dépôt courant, qui a cette branche pour tête, *In Review* ; sinon *In Progress*. Aucune écriture si la carte a déjà ce statut.

#### Scenario: Création de branche
- **WHEN** une branche `feat/12-x` est créée sans PR ouverte et la carte de l'issue 12 est en *Todo*
- **THEN** la carte passe en *In Progress*

#### Scenario: PR prête pour la revue
- **WHEN** une PR hors brouillon de `feat/12-x` est ouverte ou passe de brouillon à prête
- **THEN** la carte passe en *In Review*

#### Scenario: Brouillon ou fermeture sans merge
- **WHEN** la PR de `feat/12-x` repasse en brouillon, ou est fermée sans merge
- **THEN** la carte passe en *In Progress*

#### Scenario: PR de fork
- **WHEN** la seule PR ouverte qui a `feat/12-x` pour tête vient d'un fork
- **THEN** elle n'est pas comptée et le statut visé est *In Progress*

#### Scenario: Issue fermée ou carte en Done
- **WHEN** l'issue est fermée ou la carte est en *Done*, quel que soit l'événement
- **THEN** aucune écriture n'est faite

#### Scenario: Statut déjà posé
- **WHEN** la carte a déjà le statut calculé
- **THEN** aucune écriture n'est faite

#### Scenario: Ordre des événements
- **WHEN** deux exécutions de la même branche se suivent dans l'ordre inverse de leurs événements
- **THEN** le statut final est celui de l'état de la branche à la dernière exécution

#### Scenario: Deux branches pour la même issue
- **WHEN** la carte de l'issue 12 est en *In Review* par la PR de `feat/12-x` et qu'une branche `fix/12-y` est créée sans PR
- **THEN** la carte repasse en *In Progress*, limite consignée dans `pitfalls.md`

### Requirement: Noms des champs et des options
Le workflow SHALL désigner le champ `Status` et les options `In Progress`, `In Review` et `Done` par ces noms exacts, identiques dans les modèles français et anglais.

#### Scenario: Noms exacts
- **WHEN** les modèles français et anglais du workflow sont lus
- **THEN** chacun contient les littéraux `Status`, `In Progress`, `In Review` et `Done`

### Requirement: Cas sans effet
Le workflow SHALL réussir en émettant une notice, sans modifier de carte, quand l'issue est introuvable (numéro inexistant ou numéro de PR), quand l'issue n'a pas de carte dans le Project, ou quand le champ Status n'a pas l'option visée, dont *In Review*. Ce sont des états de configuration, pas des erreurs.

#### Scenario: Option In Review absente
- **WHEN** le champ Status du Project n'a pas l'option *In Review*
- **THEN** une notice le dit, le workflow réussit et la carte est inchangée

#### Scenario: Issue absente du Project
- **WHEN** l'issue n'a pas de carte dans le Project numéro `PROJECT_NUMBER`
- **THEN** une notice le dit et le workflow réussit

#### Scenario: Issue introuvable
- **WHEN** le numéro lu dans la branche n'est celui d'aucune issue du dépôt, ou est celui d'une PR
- **THEN** une notice le dit, le workflow réussit et aucune carte n'est modifiée

### Requirement: Échec d'un jeton inutilisable
Le workflow SHALL faire échouer l'étape de mise à jour, avec un message qui nomme `PROJECT_TOKEN` et ses scopes `project` et `repo`, quand le jeton est refusé, expiré, de scope insuffisant ou sans accès au dépôt. Toute autre erreur de `gh` MUST aussi la faire échouer, avec un message fixe qui nomme `PROJECT_TOKEN`, `PROJECT_NUMBER` et `PROJECT_OWNER`. Chaque appel de `gh` est contrôlé, jamais abandonné sans message.

#### Scenario: Jeton refusé ou expiré
- **WHEN** l'API refuse `PROJECT_TOKEN`
- **THEN** l'étape échoue et le message nomme `PROJECT_TOKEN` et ses scopes

#### Scenario: Scope insuffisant sur un dépôt privé
- **WHEN** le PAT n'a pas le scope `repo` et le dépôt est privé
- **THEN** l'étape échoue avec ce message, sans le déguiser en notice

#### Scenario: Autre erreur de l'API
- **WHEN** un appel de `gh` échoue pour une autre cause, par exemple un Project introuvable
- **THEN** l'étape échoue avec un message fixe qui nomme `PROJECT_TOKEN`, `PROJECT_NUMBER` et `PROJECT_OWNER`

### Requirement: Journal sans réponse brute de l'API
Le workflow SHALL lire la réponse capturée de `gh` pour classer l'erreur et MUST NOT l'écrire dans le journal : les messages d'échec sont fixes et renvoient à `github-setup.md`.

#### Scenario: Réponse de l'API hors du journal
- **WHEN** les scripts `run:` du workflow généré sont lus
- **THEN** aucune ligne `echo`, `printf`, `fail`, `fail_api` ou `skip` n'écrit la réponse capturée de `gh`

### Requirement: Noms de branche hors du shell
Le workflow SHALL passer le nom de branche et toute valeur issue d'un événement par des variables d'environnement, jamais par une expression `${{ … }}` écrite dans un script `run:`.

#### Scenario: Aucune expression dans un script
- **WHEN** les blocs `run:` du workflow généré sont lus
- **THEN** aucun ne contient `${{`

### Requirement: Actions épinglées
Toute action `uses:` du workflow SHALL être épinglée sur un SHA de commit (ARCH-004) ; le workflow n'en déclare aucune tant que `gh` suffit.

#### Scenario: Pas d'action non épinglée
- **WHEN** le workflow généré est lu
- **THEN** il n'a aucune ligne `uses:` ou chaque ligne `uses:` désigne un SHA de quarante caractères

### Requirement: Modèles de langue
Les modèles français et anglais du workflow SHALL avoir la même structure : la langue ne change que les noms d'étapes, les commentaires et les textes entre guillemets.

#### Scenario: Squelettes YAML identiques
- **WHEN** les deux modèles sont comparés par le test de parité de la suite
- **THEN** leurs squelettes YAML sont identiques

### Requirement: Alignement de l'ADR ARCH-004 généré
Avec `archgate`, `projects` et `issue-source`, l'ADR ARCH-004 généré SHALL, en français et en anglais, dire que le statut automatique est assuré par le workflow `project-status.yml`, inactif tant que le secret `PROJECT_TOKEN` et la variable `PROJECT_NUMBER` n'existent pas, et que la création du secret vaut accord. Sans `projects` ou en mode `jira`, ces mentions MUST NOT apparaître.

#### Scenario: ARCH-004 avec le module
- **WHEN** un projet est généré avec `github`, `projects` et `archgate`, en français puis en anglais
- **THEN** la ligne Projects d'ARCH-004 cite `project-status.yml`, `PROJECT_TOKEN` comme secret optionnel dont la création vaut accord, et `PROJECT_NUMBER`

#### Scenario: ARCH-004 sans le module
- **WHEN** un projet est généré avec `archgate` sans `projects`
- **THEN** ARCH-004 ne cite ni `PROJECT_TOKEN` ni `project-status.yml`

#### Scenario: ARCH-004 en mode jira
- **WHEN** un projet est généré avec `archgate`, `projects`, `jira` et `jiraSource: jira`
- **THEN** ARCH-004 ne cite ni `PROJECT_TOKEN` ni `project-status.yml`

### Requirement: Documentation du skill
`references/github-setup.md` (étape 4) SHALL lister l'option *In Review*, les workflows intégrés à activer, « Pull request linked to issue » à désactiver avec le secret, le PAT classique (scope `project`, et `repo` selon l'essai, expiration courte), le secret `PROJECT_TOKEN` et les variables `PROJECT_NUMBER` et `PROJECT_OWNER`. `SKILL.md` range ces créations dans ce qui reste manuel.

#### Scenario: Étape 4 complète
- **WHEN** `github-setup.md` est lu
- **THEN** l'étape 4 contient ces éléments et demande l'accord de l'utilisateur avant chaque écriture

### Requirement: Pièges consignés
`references/pitfalls.md` SHALL consigner : le PAT classique requis (un PAT fine-grained n'accède pas aux Projects d'un compte personnel), l'absence de secret pour les forks et Dependabot, l'exposition du secret aux collaborateurs en écriture (workflow de la branche), une PR à plusieurs issues, deux branches pour une même issue, l'échec à l'expiration du PAT, « Pull request linked to issue » à désactiver, les noms exacts des options du Project et le résultat de l'essai du scope `repo`.

#### Scenario: Limites présentes
- **WHEN** `pitfalls.md` est lu
- **THEN** il contient chacune de ces limites, et le scope `repo` y est noté « non essayé » tant qu'aucun essai n'a eu lieu

### Requirement: Tests du module
`assets/modules/projects/tests/projects.test.mjs` SHALL vérifier, sur le projet généré, la présence et l'absence du workflow selon `issue-source`, `jira-source` et `gitlab`, les déclencheurs exacts, `permissions: {}`, le groupe de concurrence, l'absence de `push`, `synchronize`, `pull_request_target` et `workflow_dispatch`, la portée des variables et de `GH_TOKEN`, les étapes conditionnées par `env`, l'absence d'expression dans les scripts et les noms exacts des options.

#### Scenario: Test en échec
- **WHEN** le modèle déclare `workflow_dispatch`
- **THEN** le test du module échoue en nommant l'événement
