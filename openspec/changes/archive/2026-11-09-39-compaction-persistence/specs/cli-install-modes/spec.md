## MODIFIED Requirements

### Requirement: Hook de session du mode local
En mode `local` avec le module `claude`, le générateur SHALL créer `.claude/hooks/session-path.mjs` et le déclarer, sans `matcher`, comme première entrée `SessionStart` de type `command` de `.claude/settings.json`. Ce hook SHALL ajouter à `CLAUDE_ENV_FILE` une ligne Bash qui place le `node_modules/.bin` de la racine du projet, calculé depuis l'emplacement du script, devant le `PATH`. En modes `global` et `user`, ni le fichier ni sa déclaration MUST NOT être générés.

#### Scenario: Mode local avec le module claude
- **WHEN** un projet est généré en mode `local` avec le module `claude`
- **THEN** `.claude/hooks/session-path.mjs` existe et `settings.json` déclare un hook `SessionStart` qui l'appelle

#### Scenario: Modes global et user
- **WHEN** un projet est généré en mode `global` ou `user`
- **THEN** `session-path.mjs` n'existe pas et le `settings.json` généré ne déclare aucun `SessionStart` qui l'appelle

#### Scenario: Mise à jour d'un projet local existant
- **WHEN** `--update` est lancé sur un projet en mode `local` qui n'a pas le hook
- **THEN** `session-path.mjs` est créé et `settings.json` ne contient qu'un seul `SessionStart` qui l'appelle, ses autres réglages étant conservés
