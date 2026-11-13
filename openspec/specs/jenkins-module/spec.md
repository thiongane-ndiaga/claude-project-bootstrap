# jenkins-module Specification

## Purpose
Fournir en option un `Jenkinsfile` qui rejoue les contrôles de `ci.yml` sur un serveur Jenkins auto-hébergé, avec la documentation des étapes manuelles et des limites, sans toucher à `settings.json` ni aux projets qui n'activent pas le module.

## Requirements

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

### Requirement: Étapes du Jenkinsfile
Le `Jenkinsfile` SHALL être un pipeline déclaratif dont les étapes se suivent dans l'ordre de `ci.yml` : `Node`, `Titre de PR`, `CLI d'outillage` (avec `openspec` ou `archgate`), `OpenSpec validate` (avec `openspec`), `Archgate check` (avec `archgate`), `Chaîne d'outils du projet`, `Commandes du projet`. En anglais : `PR title`, `Tooling CLIs`, `Project toolchain`, `Project commands`.

#### Scenario: Sélection complète
- **WHEN** un projet est généré avec `github`, `openspec`, `archgate` et `jenkins`
- **THEN** les sept étapes figurent dans cet ordre

#### Scenario: Sans openspec ni archgate
- **WHEN** ni `openspec` ni `archgate` n'est sélectionné
- **THEN** le `Jenkinsfile` ne contient ni `openspec`, ni `archgate`, ni l'étape `CLI d'outillage`

### Requirement: Commandes rejouées
Les étapes SHALL exécuter `node scripts/check-pr-title.mjs`, `openspec validate --all --strict --no-interactive`, `archgate check --output console` et `node .bootstrap/run-checks.mjs`, avec `OPENSPEC_TELEMETRY=0` quand `openspec` est actif. Les écarts admis avec `ci.yml` sont `--output`, l'absence de l'action `project-setup` et le mode d'installation des CLI.

#### Scenario: Parité des commandes
- **WHEN** le test compare les modèles `ci.yml` et `Jenkinsfile`
- **THEN** toutes les commandes ci-dessus et les versions épinglées d'`openspec` et d'`archgate` y figurent à l'identique, hors écarts admis

### Requirement: Titre de PR sans interpolation
L'étape `Titre de PR` MUST ne s'exécuter que pour une PR (`changeRequest()`) et SHALL passer `CHANGE_TITLE` par `withEnv` sous le nom `PR_TITLE`, avec une commande `sh` en guillemets simples. Aucune chaîne `sh` MUST NOT interpoler `CHANGE_TITLE`.

#### Scenario: Pas d'injection
- **WHEN** le test lit le `Jenkinsfile`
- **THEN** `CHANGE_TITLE` n'apparaît que dans `withEnv` et dans aucune chaîne `sh`

### Requirement: Installation des CLI sur l'agent
En mode `local`, l'étape `CLI d'outillage` SHALL lancer `npm ci` et le `PATH` du pipeline SHALL commencer par `node_modules/.bin` de l'espace de travail. Sinon, elle SHALL installer chaque CLI active à sa version épinglée par `npm install -g --prefix` dans un dossier de l'espace de travail, placé en tête du `PATH`. Elle MUST NOT écrire dans le préfixe npm global de l'agent.

#### Scenario: Mode global
- **WHEN** `cliInstall` n'est pas `local` avec `openspec` et `archgate`
- **THEN** le `Jenkinsfile` contient deux `npm install -g --prefix` aux versions de `ci.yml` et pas `npm ci`

#### Scenario: Mode local, archgate seul
- **WHEN** `cliInstall` vaut `local` avec `archgate` sans `openspec`
- **THEN** le `Jenkinsfile` contient `npm ci` et `node_modules/.bin`, et pas `openspec`

### Requirement: Marqueurs résolus
Le `Jenkinsfile` généré MUST NOT contenir de marqueur `@@module` ni de paramètre `{{…}}`.

#### Scenario: Aucun reste
- **WHEN** un projet est généré avec toutes les combinaisons de la matrice incluant `jenkins`
- **THEN** aucun marqueur ni paramètre n'y subsiste

### Requirement: Vérification de Node
La première étape SHALL échouer, avec un message nommant la version trouvée ou l'absence de `node`, lorsque Node est antérieur à 20.19. Son script SHALL s'analyser sous un Node ancien (ni `?.` ni `??`).

#### Scenario: Version insuffisante
- **WHEN** le test exécute le script de l'étape en simulant la version 20.18.0
- **THEN** le code de sortie est non nul et le message contient 20.18.0

#### Scenario: Version suffisante
- **WHEN** le test l'exécute en simulant 20.19.0
- **THEN** le code de sortie est 0

### Requirement: Chaîne d'outils propre au projet
`scripts/jenkins-setup.sh` SHALL appartenir au projet (`owned`) : créé s'il est absent, jamais écrasé ni fusionné par `--update`. L'étape `Chaîne d'outils du projet` SHALL l'exécuter avant `Commandes du projet`.

#### Scenario: Mise à jour
- **WHEN** le projet modifie `scripts/jenkins-setup.sh` puis lance `--update`
- **THEN** le fichier reste intact

### Requirement: Fichiers existants et ajout du module
Un `Jenkinsfile` existant et divergent, sans manifeste, SHALL produire un conflit (code 3) sans être modifié, comme tout fichier géré. L'ajout de `jenkins` à un projet existant SHALL créer seulement ses fichiers.

#### Scenario: Jenkinsfile existant
- **WHEN** un `Jenkinsfile` différent existe et `jenkins` est sélectionné
- **THEN** le code est 3 et le fichier est intact

#### Scenario: Ajout par --update
- **WHEN** `jenkins` est ajouté à un projet généré
- **THEN** seuls ses trois fichiers apparaissent

### Requirement: Documentation des étapes manuelles
`docs/jenkins.md` SHALL exister en français et en anglais et lister : serveur et agent existants, Node ≥ 20.19, plugin GitHub Branch Source, job multibranche, identifiants, webhook, confiance des PR de fork, contrôle requis de la protection de branche, validation par le linter déclaratif.

#### Scenario: Étapes présentes
- **WHEN** un projet est généré avec `jenkins`, en français puis en anglais
- **THEN** chaque étape ci-dessus apparaît dans `docs/jenkins.md`

### Requirement: Limites documentées
`docs/jenkins.md` SHALL énoncer les limites : complément de `ci.yml`, agents Linux ou macOS (étiquette d'agent à poser), `ciOs` ignoré, historique git possiblement superficiel, `Jenkinsfile` exécuté par aucun test du plugin, nom du contexte Jenkins non comparé aux jobs par l'audit `forge-protection`, dépôt privé sans protection de branche, prérequis `package-lock.json` en mode local.

#### Scenario: Selon la visibilité et le mode
- **WHEN** le projet est privé ou en mode `local`
- **THEN** le paragraphe sur l'absence de protection de branche ou sur `package-lock.json` apparaît, et il est absent sinon

### Requirement: Renvoi dans le workflow
Avec `jenkins`, le tableau des contrôles de `docs/workflow.md` SHALL mentionner `Jenkinsfile` et `docs/jenkins.md`.

#### Scenario: Renvoi présent
- **WHEN** un projet est généré avec `jenkins`
- **THEN** `docs/workflow.md` cite `Jenkinsfile`, et sans le module il ne le cite pas

### Requirement: Variante GitLab de la documentation
Avec `gitlab`, `docs/jenkins.md` SHALL décrire GitLab Branch Source, le webhook et le jeton côté GitLab, l'option « les pipelines doivent réussir », la confiance des merge requests de fork, et ne pas citer GitHub, `ci.yml` ni les protections de branche de GitHub Free.

#### Scenario: Documentation GitLab
- **WHEN** un projet est généré avec `gitlab` et `jenkins`, en français puis en anglais
- **THEN** `docs/jenkins.md` cite GitLab Branch Source et la confiance des forks, et ne contient ni `GitHub` ni `ci.yml`
