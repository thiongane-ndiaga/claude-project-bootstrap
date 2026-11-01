## MODIFIED Requirements

### Requirement: Versions épinglées des CLI
L'audit SHALL comparer les versions d'OpenSpec et d'Archgate déclarées dans `ci.yml` (modes `global` et `user`) ou dans les `devDependencies` de `package.json` (mode `local`, sans dépendre de la présence de `ci.yml`), celles du manifeste et celles des CLI installées, et signaler tout écart avec les valeurs en jeu et la commande d'installation du mode. En mode `local`, une CLI du module actif absente des `devDependencies` est aussi un écart.

#### Scenario: CLI du poste différente de la CI
- **WHEN** la version installée d'OpenSpec diffère de celle de `ci.yml`
- **THEN** le contrôle est un écart qui donne les deux versions

#### Scenario: Version différente en mode user
- **WHEN** le mode est `user` et la version installée diffère de celle de `ci.yml`
- **THEN** la correction proposée est `npm install -g --prefix ~/.local` avec la version de `ci.yml`

#### Scenario: Version différente en mode local
- **WHEN** le mode est `local` et la version de `package.json` diffère de celle du manifeste
- **THEN** le contrôle est un écart qui cite `package.json` et propose `npm install --save-dev --save-exact <paquet>@<version>`

#### Scenario: Devdependency absente en mode local
- **WHEN** le mode est `local`, le module `archgate` est actif et `package.json` n'a pas `archgate` dans `devDependencies`
- **THEN** le contrôle est un écart avec la même commande d'installation

### Requirement: Contrôles des outils du projet
L'audit SHALL appeler `archgate check`, `openspec validate --all --strict --no-interactive` et `openspec doctor --json` pour les modules actifs, vérifier d'abord la présence de la CLI, et rapporter un échec comme écart. En mode `local`, il SHALL préfixer le `PATH` de ces appels (et de la sonde de version) par `<cible>/node_modules/.bin`. Pour `openspec doctor`, il SHALL lire le JSON (racine non saine ou statut d'erreur) et vérifier que la racine rapportée est la cible.

#### Scenario: Violation d'un ADR
- **WHEN** `archgate check` échoue
- **THEN** le contrôle est un écart qui reprend le début de sa sortie

#### Scenario: Doctor en erreur avec le code 0
- **WHEN** `openspec doctor --json` sort en 0 avec un statut d'erreur
- **THEN** le contrôle est un écart

#### Scenario: Racine d'un dépôt parent
- **WHEN** `openspec doctor` rapporte une racine qui n'est pas la cible
- **THEN** le contrôle est `non-verifiable`

#### Scenario: CLI locales
- **WHEN** le mode est `local` et que `node_modules/.bin` du projet contient les CLI
- **THEN** l'audit les trouve sans qu'elles soient dans le `PATH` du poste

### Requirement: Contrôles du poste
Sur l'option `--workstation`, l'audit SHALL vérifier : Node ≥ 20.19, git présent, `gh` authentifié avec le scope `project` si le module `projects` est actif, préfixe npm global inscriptible hors Windows pour les modes `global` et `user`, `node_modules/.bin` contenant les CLI du projet pour le mode `local`, et l'absence d'une installation du plugin Archgate en portée utilisateur dont la configuration impose un agent. Aucune correction proposée ne contient `sudo`.

#### Scenario: Préfixe npm non inscriptible
- **WHEN** le préfixe npm global n'est pas inscriptible sous Linux ou macOS (mode `global` ou `user`)
- **THEN** le contrôle est un écart avec la correction `npm install -g --prefix ~/.local`, sans `sudo`

#### Scenario: CLI locales absentes
- **WHEN** le mode est `local` et `node_modules/.bin/openspec` (ou `.cmd` sous Windows) n'existe pas
- **THEN** le contrôle est un écart avec la correction `npm ci`

#### Scenario: Plugin Archgate qui impose un agent
- **WHEN** une installation du plugin en portée utilisateur a une configuration qui impose un agent
- **THEN** le contrôle est un écart avec la correction d'une installation en portée locale

#### Scenario: Jeton sans liste de scopes
- **WHEN** `gh auth status` ne rapporte pas de scopes
- **THEN** le contrôle du scope est `non-verifiable`
