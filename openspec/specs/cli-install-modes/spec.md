# cli-install-modes Specification

## Purpose
Définir le choix du mode d'installation des CLI d'outillage (`global`, `user`, `local`) d'un projet généré et ses effets sur les fichiers générés, le hook de contrôle qualité et la CI.

## Requirements

### Requirement: Clé de configuration du mode d'installation
`bootstrap.json` SHALL accepter une clé facultative `cliInstall` valant `global`, `user` ou `local`. Toute autre valeur MUST faire échouer `scaffold.mjs` (code de sortie 1, aucun fichier écrit) en nommant les valeurs permises. Le mode SHALL être consigné dans `config` du manifeste seulement quand la clé est présente ; absente, elle équivaut à `global` et MUST NOT être écrite.

#### Scenario: Valeur absente
- **WHEN** `cliInstall` est absente
- **THEN** le mode est `global`, le manifeste ne contient pas `cliInstall` et la sortie est identique à celle d'avant la clé

#### Scenario: Valeur invalide
- **WHEN** `cliInstall` vaut `docker`
- **THEN** `scaffold.mjs` s'arrête avec le code 1 en nommant `global`, `user` et `local`

#### Scenario: Mode local sans CLI à installer
- **WHEN** `cliInstall` vaut `local` sans module `openspec` ni `archgate`
- **THEN** `scaffold.mjs` s'arrête avec le code 1 et aucun fichier n'est écrit

#### Scenario: Mise à jour
- **WHEN** `--update` est lancé sur un projet dont le manifeste consigne `cliInstall: local`
- **THEN** le mode `local` est rejoué sans qu'il soit répété dans la configuration

### Requirement: Mode préfixe utilisateur
En mode `user`, `docs/workflow.md` SHALL donner la commande d'installation avec `--prefix ~/.local`, la vérification que `~/.local/bin` est dans le `PATH`, et indiquer que sous Windows ce mode équivaut à `global` (le préfixe npm y est déjà propre à l'utilisateur). Aucun sudo n'y figure. Aucun autre fichier généré, hors `.bootstrap/manifest.json`, ne MUST NOT différer du mode `global`.

#### Scenario: Fichiers du mode user
- **WHEN** un projet est généré en mode `user`
- **THEN** seuls `docs/workflow.md` et `.bootstrap/manifest.json` diffèrent de la génération en mode `global`

### Requirement: Fichier package.json du mode local
En mode `local`, le générateur SHALL créer un `package.json` privé, sans champ `name`, dont le script `claude` lance Claude Code et dont les `devDependencies` épinglent à la version exacte de `bootstrap.json` les seules CLI des modules choisis. Il SHALL le construire en code (JSON toujours valide) et le traiter comme propre au projet (créé une fois, jamais remplacé).

#### Scenario: Package.json généré
- **WHEN** un projet est généré en mode `local` avec les modules `openspec` et `archgate`
- **THEN** `package.json` est du JSON valide, privé, sans `name`, avec les deux `devDependencies` aux versions exactes, et le script `claude`

#### Scenario: Archgate seul
- **WHEN** un projet est généré en mode `local` avec le seul module `archgate`
- **THEN** `package.json` est du JSON valide dont les `devDependencies` ne contiennent qu'`archgate`

#### Scenario: Modes global et user
- **WHEN** un projet est généré en mode `global` ou `user`
- **THEN** aucun `package.json` n'est créé

#### Scenario: Package.json déjà présent
- **WHEN** le projet a déjà un `package.json` et le mode est `local`
- **THEN** le fichier est conservé (`kept`), le rapport de `scaffold.mjs` le signale, et le skill donne la commande `npm install --save-dev --save-exact` des CLI manquantes

### Requirement: Fichiers ignorés et CI du mode local
En mode `local`, le générateur SHALL ajouter `node_modules/` au `.gitignore`. `ci.yml` SHALL installer les CLI avec `npm ci` et le cache npm de `setup-node`, ajouter `node_modules/.bin` au `PATH` du job par une étape `shell: bash`, et MUST NOT contenir `npm install -g`, `OPENSPEC_VERSION` ni `ARCHGATE_VERSION`. Il SHALL conserver `OPENSPEC_TELEMETRY: "0"` quand le module `openspec` est actif. En modes `global` et `user`, `ci.yml` installe les CLI avec `npm install -g`.

#### Scenario: CI en mode local
- **WHEN** `ci.yml` est généré en mode `local`, y compris en dépôt public
- **THEN** il contient `npm ci`, `cache: npm` et `GITHUB_PATH` dans une étape `shell: bash`, et ne contient pas `npm install -g`

#### Scenario: Archgate seul
- **WHEN** `ci.yml` est généré en mode `local` avec le seul module `archgate`
- **THEN** il est du YAML valide, sans bloc `env` vide

#### Scenario: Gitignore
- **WHEN** le `.gitignore` est généré en mode `local`
- **THEN** il contient `node_modules/`

#### Scenario: Modes global et user
- **WHEN** `ci.yml` est généré en mode `global` ou `user`
- **THEN** il contient `npm install -g`

### Requirement: Même appel des CLI quel que soit le mode
`quality-gate.mjs` SHALL appeler `openspec` et `archgate` par leur nom dans tous les modes. En mode `local`, il SHALL préfixer le `PATH` du processus (donc de ses commandes et de celles de `.bootstrap/checks.json`) par le dossier `node_modules/.bin` situé à la racine du projet, calculée depuis l'emplacement du script, avec le séparateur de la plateforme et en retrouvant la clé `PATH` sans tenir compte de la casse.

#### Scenario: Hook en mode local
- **WHEN** `quality-gate.mjs` est généré en mode `local`
- **THEN** il construit le `PATH` avec `node_modules/.bin`, `path.delimiter` et une recherche insensible à la casse de la clé

#### Scenario: Hook en mode global
- **WHEN** `quality-gate.mjs` est généré en mode `global` ou `user`
- **THEN** il ne mentionne pas `node_modules`

### Requirement: Documentation du mode retenu
`docs/workflow.md` SHALL donner la commande d'installation correspondant au mode et, en modes `user` et `local`, nommer le mode retenu (le mode `global` par défaut ne change pas le texte). En mode `local`, elle SHALL indiquer `npm ci`, que le hook de session ajoute les CLI au PATH de l'outil Bash, et que l'outil PowerShell et un terminal personnel ne les trouvent qu'avec `npm run claude` (options après `--`) ou `npx`.

#### Scenario: Section Nouveau poste en mode local
- **WHEN** `docs/workflow.md` est généré en mode `local`
- **THEN** la section indique `npm ci`, `npm run claude` et `npx`, et ne contient pas `npm install -g`

### Requirement: Question de phase 0 et défaut
Le skill SHALL poser la question du mode à la phase 0 avec un défaut documenté, déterminé par un test d'écriture dans le préfixe npm global dès la phase 0 : `user` si le préfixe n'est pas inscriptible (hors Windows), sinon `global`. Il MUST NOT proposer `local` comme défaut. En mode `local`, il SHALL créer le lockfile (`npm install --package-lock-only`) avec l'accord de l'utilisateur avant le premier push, car `npm ci` échoue sans lockfile.

#### Scenario: Préfixe non inscriptible
- **WHEN** le préfixe npm global n'est pas inscriptible sous Linux
- **THEN** le skill recommande `user` en premier

#### Scenario: Lockfile absent
- **WHEN** le mode est `local` et qu'aucun lockfile n'est commité
- **THEN** le skill le crée avant de pousser, et `pitfalls.md` décrit l'échec de `npm ci` sans lockfile

### Requirement: Hook de session du mode local
En mode `local` avec le module `claude`, le générateur SHALL créer `.claude/hooks/session-path.mjs` et le déclarer, sans `matcher`, comme hook `SessionStart` de type `command` dans `.claude/settings.json`. Ce hook SHALL ajouter à `CLAUDE_ENV_FILE` une ligne Bash qui place le `node_modules/.bin` de la racine du projet, calculé depuis l'emplacement du script, devant le `PATH`. En modes `global` et `user`, ni le fichier ni la déclaration MUST NOT être générés.

#### Scenario: Mode local avec le module claude
- **WHEN** un projet est généré en mode `local` avec le module `claude`
- **THEN** `.claude/hooks/session-path.mjs` existe et `settings.json` déclare un hook `SessionStart` qui l'appelle

#### Scenario: Modes global et user
- **WHEN** un projet est généré en mode `global` ou `user`
- **THEN** `session-path.mjs` n'existe pas et le `settings.json` généré ne déclare aucun `SessionStart`

#### Scenario: Mise à jour d'un projet local existant
- **WHEN** `--update` est lancé sur un projet en mode `local` qui n'a pas le hook
- **THEN** `session-path.mjs` est créé et `settings.json` ne contient qu'un seul `SessionStart`, ses autres réglages étant conservés

### Requirement: Forme de la ligne écrite par le hook
La ligne écrite SHALL avoir la forme `export PATH='<dossier>':"$PATH"`, terminée par un saut de ligne, une seule par exécution, ajoutée sans écraser le contenu existant du fichier. Une apostrophe du dossier SHALL être écrite `'\''`. Sous Windows, le dossier SHALL être exprimé en syntaxe Git Bash (`C:\a` devient `/c/a`) ; ailleurs il reste inchangé.

#### Scenario: Chemin avec espace et apostrophe
- **WHEN** le hook s'exécute dans un projet dont le chemin contient une espace et une apostrophe
- **THEN** Bash, relisant le fichier, obtient un `PATH` qui commence par le `node_modules/.bin` du projet

#### Scenario: Ajout sans écrasement
- **WHEN** `CLAUDE_ENV_FILE` contient déjà des lignes
- **THEN** elles sont conservées et une seule ligne `export PATH` est ajoutée à la fin

#### Scenario: Chemin Windows
- **WHEN** la racine du projet est `X:\...` sous Windows
- **THEN** la ligne commence par `export PATH='/x/`

### Requirement: Tolérance du hook de session
Le hook de session SHALL se terminer avec le code 0 quand `CLAUDE_ENV_FILE` est absent ou que l'écriture échoue, sans bloquer le démarrage de la session. Il MUST NOT écrire autre chose que cette ligne.

#### Scenario: Variable absente
- **WHEN** le hook est exécuté sans `CLAUDE_ENV_FILE`
- **THEN** il se termine avec le code 0 sans rien écrire

#### Scenario: Écriture impossible
- **WHEN** `CLAUDE_ENV_FILE` désigne un fichier dont le dossier n'existe pas
- **THEN** il se termine avec le code 0
