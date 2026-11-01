## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Documentation du mode retenu
`docs/workflow.md` SHALL donner la commande d'installation correspondant au mode et, en modes `user` et `local`, nommer le mode retenu (le mode `global` par défaut ne change pas le texte). En mode `local`, elle SHALL indiquer `npm ci`, que le hook de session ajoute les CLI au PATH de l'outil Bash, et que l'outil PowerShell et un terminal personnel ne les trouvent qu'avec `npm run claude` (options après `--`) ou `npx`.

#### Scenario: Section Nouveau poste en mode local
- **WHEN** `docs/workflow.md` est généré en mode `local`
- **THEN** la section indique `npm ci`, `npm run claude` et `npx`, et ne contient pas `npm install -g`
