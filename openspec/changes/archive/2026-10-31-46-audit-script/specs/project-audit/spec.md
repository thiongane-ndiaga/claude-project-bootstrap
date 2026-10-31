## Purpose
Inspecter un projet généré en lecture seule et rapporter chaque écart avec la correction proposée, pour détecter par un contrôle mécanique les pièges connus de la mise en place plutôt que de les découvrir en cas de panne.

## ADDED Requirements

### Requirement: Audit sans effet de bord propre
L'audit lui-même SHALL ne rien écrire dans le projet, son dépôt git ni la forge, et n'émettre aucun appel réseau sans `--forge` ni `--workstation`. Les CLI du projet qu'il appelle sont lancées avec `OPENSPEC_TELEMETRY=0`; leurs seuls effets tolérés sont les fichiers régénérés et ignorés par git que ces outils écrivent d'eux-mêmes.

#### Scenario: Projet inchangé après l'audit
- **WHEN** l'audit s'exécute avec des CLI simulées sur un projet
- **THEN** les empreintes des fichiers suivis et de l'index git sont identiques avant et après

#### Scenario: Aucun appel à gh par défaut
- **WHEN** l'audit s'exécute sans `--forge` ni `--workstation`
- **THEN** aucun appel à `gh` n'est lancé

#### Scenario: Télémétrie coupée
- **WHEN** l'audit lance une CLI du projet
- **THEN** son environnement contient `OPENSPEC_TELEMETRY=0`

### Requirement: Entrées sûres
Aucune valeur fournie en option ou lue dans le projet ne SHALL être insérée dans une chaîne passée à un shell : le dossier cible passe par `cwd` ou `git -C`, `--owner` et `--project` par des variables GraphQL. `--repo` MUST respecter `^[\w.-]+/[\w.-]+$`.

#### Scenario: Dépôt invalide
- **WHEN** `--repo` vaut `a/../b` ou contient des métacaractères
- **THEN** l'audit se termine avec le code 2 sans lancer de commande

#### Scenario: Cible avec espaces et métacaractères
- **WHEN** le chemin du projet contient des espaces ou des caractères spéciaux
- **THEN** l'audit s'exécute normalement et aucune commande n'interprète ces caractères

### Requirement: Rapport par contrôle
Chaque contrôle SHALL produire un résultat avec un identifiant, un statut `ok`, `ecart` ou `non-verifiable`, un message, et pour un écart la correction proposée. Un `non-verifiable` indique la raison. La sortie lisible et la sortie `--json` SHALL comporter le nombre de contrôles par statut.

#### Scenario: Outil absent
- **WHEN** un contrôle dépend d'une CLI introuvable (absente, statut 127 ou 9009)
- **THEN** son statut est `non-verifiable` avec la raison, et il n'est pas compté comme écart

#### Scenario: Sortie JSON
- **WHEN** l'audit s'exécute avec `--json`
- **THEN** la sortie est un objet JSON contenant les résultats et le compte par statut

#### Scenario: Contrôle défaillant
- **WHEN** un contrôle lève une exception
- **THEN** son statut est `non-verifiable` avec le message de l'erreur et les autres contrôles s'exécutent

### Requirement: Code de sortie
L'audit SHALL se terminer avec le code 0 s'il n'y a aucun écart, 1 s'il y en a au moins un, et 2 pour une erreur d'usage. Un `non-verifiable` ne fait pas échouer l'audit, mais le résumé SHALL signaler qu'aucun contrôle n'a été effectué quand tous le sont.

#### Scenario: Projet sain
- **WHEN** tous les contrôles sont `ok` ou `non-verifiable`
- **THEN** le code de sortie est 0

#### Scenario: Écart détecté
- **WHEN** au moins un contrôle est un écart
- **THEN** le code de sortie est 1

#### Scenario: Dossier sans manifeste
- **WHEN** tous les contrôles sont `non-verifiable`
- **THEN** le code de sortie est 0 et le résumé dit qu'aucun contrôle n'a pu être effectué

#### Scenario: Cible absente
- **WHEN** `--target` est omis ou désigne un dossier inexistant
- **THEN** le code de sortie est 2 et un message d'usage est affiché

### Requirement: Manifeste et mise à jour en attente
L'audit SHALL signaler comme écart un manifeste illisible, une version du plugin différente de celle du plugin exécuté, une mise à jour en attente (fichiers à créer, remplacer, fusionner proprement ou en conflit selon `scaffold.mjs --update --dry-run`) et une base de fusion invalide. La sortie 3 de ce rapport est normale. Les fusions de fichiers partagés, les fichiers retirés et la mise à jour du seul manifeste ne sont pas des écarts.

#### Scenario: Version du manifeste en retard
- **WHEN** le manifeste indique une version du plugin différente de celle du plugin exécuté
- **THEN** le contrôle est un écart avec la correction `scaffold.mjs --update`

#### Scenario: Fusion propre en attente
- **WHEN** la simulation de mise à jour rapporte un fichier à fusionner proprement
- **THEN** le contrôle est un écart

#### Scenario: Base de fusion altérée
- **WHEN** la base d'un fichier ne correspond plus à l'empreinte du manifeste
- **THEN** le contrôle des bases est un écart

#### Scenario: Manifeste illisible
- **WHEN** le manifeste n'est pas un JSON valide
- **THEN** le contrôle est un écart

#### Scenario: Projet sans manifeste
- **WHEN** le projet n'a pas de manifeste
- **THEN** les contrôles qui en dépendent sont `non-verifiable` et renvoient vers `scaffold.mjs --adopt`

### Requirement: Hooks git
Pour un projet avec le module `githooks`, l'audit SHALL vérifier que `.githooks/pre-push` est en mode 100755 dans l'index et dans le dernier commit, qu'il est exécutable sur le disque hors Windows, et que `core.hooksPath` vaut `.githooks`. Le dépôt git lu MUST être celui de la cible.

#### Scenario: Mode non enregistré
- **WHEN** `pre-push` est enregistré en mode 100644 dans l'index ou le dernier commit
- **THEN** le contrôle est un écart avec la correction `git update-index --chmod=+x` et `chmod +x`

#### Scenario: Chemin des hooks non réglé
- **WHEN** `core.hooksPath` n'est pas `.githooks`
- **THEN** le contrôle est un écart avec la correction `git config core.hooksPath .githooks`

#### Scenario: Cible dans un dépôt parent
- **WHEN** la racine git de la cible n'est pas la cible elle-même
- **THEN** le contrôle est `non-verifiable`

### Requirement: Cohérence des formulaires et des labels
Pour un projet avec le module `github`, l'audit SHALL vérifier que chaque label posé par un formulaire de `.github/ISSUE_TEMPLATE/` figure dans `.github/labels.json`, sans tenir compte de la casse. Il SHALL reconnaître la liste entre crochets, la liste en bloc et la chaîne séparée par des virgules; une clé `labels` d'un format non reconnu donne `non-verifiable`.

#### Scenario: Formulaire avec un label inconnu
- **WHEN** un formulaire pose un label absent de `labels.json`
- **THEN** le contrôle est un écart qui nomme le formulaire et le label

#### Scenario: Liste en bloc
- **WHEN** un formulaire déclare ses labels en liste YAML en bloc
- **THEN** ses labels sont lus et comparés

### Requirement: Versions épinglées des CLI
L'audit SHALL comparer les versions d'OpenSpec et d'Archgate déclarées dans `ci.yml`, celles du manifeste et celles des CLI installées, et signaler tout écart avec les valeurs en jeu et la commande d'installation.

#### Scenario: CLI du poste différente de la CI
- **WHEN** la version installée d'OpenSpec diffère de celle de `ci.yml`
- **THEN** le contrôle est un écart qui donne les deux versions

### Requirement: Actions épinglées
L'audit SHALL comparer les SHA des actions de `ci.yml` et `release.yml` à ceux de `config.actions` du manifeste, et vérifier qu'une même action porte le même SHA dans les deux workflows.

#### Scenario: Action différente entre deux workflows
- **WHEN** une action a un SHA dans `ci.yml` et un autre dans `release.yml`
- **THEN** le contrôle est un écart qui nomme l'action

### Requirement: Contrôles des outils du projet
L'audit SHALL appeler `archgate check`, `openspec validate --all --strict --no-interactive` et `openspec doctor --json` pour les modules actifs, vérifier d'abord la présence de la CLI, et rapporter un échec comme écart. Pour `openspec doctor`, il SHALL lire le JSON (racine non saine ou statut d'erreur) et vérifier que la racine rapportée est la cible.

#### Scenario: Violation d'un ADR
- **WHEN** `archgate check` échoue
- **THEN** le contrôle est un écart qui reprend le début de sa sortie

#### Scenario: Doctor en erreur avec le code 0
- **WHEN** `openspec doctor --json` sort en 0 avec un statut d'erreur
- **THEN** le contrôle est un écart

#### Scenario: Racine d'un dépôt parent
- **WHEN** `openspec doctor` rapporte une racine qui n'est pas la cible
- **THEN** le contrôle est `non-verifiable`

### Requirement: Réglages et ADR d'exemple
L'audit SHALL signaler comme écart un `agent` imposé dans `.claude/settings.json` ou `.claude/settings.local.json` du projet quand il vaut `archgate:developer`, et la présence d'un ADR d'exemple `GEN-001` dans `.archgate/adrs/`.

#### Scenario: Agent imposé
- **WHEN** `.claude/settings.local.json` contient `"agent": "archgate:developer"`
- **THEN** le contrôle est un écart avec la correction de retirer la clé

### Requirement: Contrôles de la forge
Sur l'option `--forge`, l'audit SHALL, en lecture seule, comparer les labels des formulaires à ceux du dépôt, et les contextes exigés sur `main` (protection de branche et rulesets) aux noms des jobs de tous les workflows, matrices développées. Un contexte d'une autre application, une protection absente ou un accès refusé est `non-verifiable`; un contexte exigé qui n'existe nulle part est un écart.

#### Scenario: Check exigé inexistant
- **WHEN** la protection de `main` exige un check qui ne correspond à aucun job
- **THEN** le contrôle est un écart qui nomme le check

#### Scenario: Protection par ruleset
- **WHEN** `main` est protégée par un ruleset et non par une protection de branche
- **THEN** les contextes du ruleset sont lus et comparés

#### Scenario: Protection absente
- **WHEN** l'API répond 404 ou 403 pour la protection
- **THEN** le contrôle est `non-verifiable` avec la raison

#### Scenario: Label absent du dépôt
- **WHEN** un formulaire pose un label absent du dépôt
- **THEN** le contrôle est un écart avec la correction `sync-labels.mjs`

#### Scenario: Dépôt introuvable
- **WHEN** `--forge` est demandé et que ni `--repo` ni le remote `origin` ne donnent un dépôt
- **THEN** les contrôles de la forge sont `non-verifiable`

### Requirement: Migrations en attente
Sur l'option `--forge`, l'audit SHALL calculer les actions de toutes les migrations applicables au projet, qu'elles soient consignées ou non, et signaler comme écart toute migration qui en propose. Les notes d'une migration figurent dans le message. Le `gh` utilisé MUST refuser toute écriture.

#### Scenario: Migration consignée mais dérivée
- **WHEN** une migration consignée au manifeste propose à nouveau des actions parce que l'état de la forge a changé
- **THEN** le contrôle est un écart qui liste ces actions

#### Scenario: Écriture refusée
- **WHEN** une migration tente une écriture pendant l'audit
- **THEN** l'appel est refusé et le contrôle est `non-verifiable`

### Requirement: Automatisations du Project
Pour un projet avec le module `projects` et les options `--project` et `--owner`, l'audit SHALL vérifier que « Auto-add to project », « Item closed » et « Pull request merged » sont activées, et indiquer que la cible d'« Auto-add » n'est pas exposée par l'API. Sans numéro de Project, le contrôle est `non-verifiable`.

#### Scenario: Automatisation désactivée
- **WHEN** « Item closed » est désactivée
- **THEN** le contrôle est un écart

#### Scenario: Cible non vérifiable
- **WHEN** « Auto-add to project » est activée
- **THEN** le contrôle mentionne que le dépôt cible reste à vérifier à la main

### Requirement: Contrôles du poste
Sur l'option `--workstation`, l'audit SHALL vérifier : Node ≥ 20.19, git présent, `gh` authentifié avec le scope `project` si le module `projects` est actif, préfixe npm global inscriptible hors Windows, et l'absence d'une installation du plugin Archgate en portée utilisateur dont la configuration impose un agent. Aucune correction proposée ne contient `sudo`.

#### Scenario: Préfixe npm non inscriptible
- **WHEN** le préfixe npm global n'est pas inscriptible sous Linux ou macOS
- **THEN** le contrôle est un écart avec la correction `npm install -g --prefix ~/.local`, sans `sudo`

#### Scenario: Plugin Archgate qui impose un agent
- **WHEN** une installation du plugin en portée utilisateur a une configuration qui impose un agent
- **THEN** le contrôle est un écart avec la correction d'une installation en portée locale

#### Scenario: Jeton sans liste de scopes
- **WHEN** `gh auth status` ne rapporte pas de scopes
- **THEN** le contrôle du scope est `non-verifiable`

### Requirement: Intégration au skill
Le skill SHALL lancer l'audit à la fin de la phase de vérification et après chaque mise à jour d'un projet, présenter les écarts avec leurs corrections, et faire demander l'accord avant `--forge`. Il SHALL indiquer qu'auditer un projet exécute son outillage et ne convient qu'aux dépôts de confiance.

#### Scenario: Documentation du skill
- **WHEN** `SKILL.md` est lu
- **THEN** il décrit le lancement de l'audit en fin de phase 3 et après une mise à jour, l'accord requis pour `--forge` et la mise en garde sur la confiance
