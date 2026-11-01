# agent-profiles Specification

## Purpose
Définir le module optionnel `agent-profiles` : les profils `architect` et `qa-engineer` générés dans `.claude/agents/` et le hook unique `profile-guard.mjs` qui borne leurs écritures et leurs commandes de shell selon `agent_type`, en sous-agent comme en équipe.

## Requirements

### Requirement: Module agent-profiles
Le catalogue SHALL contenir un module `agent-profiles` qui requiert `claude` et vaut `default: false`. Sélectionné, il SHALL générer `.claude/agents/architect.md`, `.claude/agents/qa-engineer.md` et `.claude/hooks/profile-guard.mjs`, en français ou en anglais selon `docLanguage`. Non sélectionné, aucun de ces fichiers ni la déclaration de hook correspondante MUST NOT être généré.

#### Scenario: Module sélectionné
- **WHEN** un projet est généré avec `agent-profiles`
- **THEN** les deux profils et le hook existent et `claude` est présent

#### Scenario: Module absent
- **WHEN** un projet est généré sans `agent-profiles`
- **THEN** aucun profil, aucun `profile-guard.mjs` et aucun hook `PreToolUse` de bornage ne sont générés

#### Scenario: Langue anglaise
- **WHEN** un projet est généré avec `docLanguage: "en"`
- **THEN** les profils sont rédigés en anglais et ont les mêmes outils que les profils français

### Requirement: Déclaration du hook de bornage
Avec `agent-profiles`, `.claude/settings.json` SHALL déclarer un hook `PreToolUse` de type `command` appelant `profile-guard.mjs` pour les outils `Write`, `Edit`, `MultiEdit`, `NotebookEdit`, `Bash`, `PowerShell`, `Agent`, `Task` (ancien nom de `Agent`) et `Skill`, sans déclarer de réglage `agent`. La fusion avec des réglages existants MUST conserver les hooks du projet.

#### Scenario: Déclaration dans settings.json
- **WHEN** `settings.json` est généré avec `agent-profiles`
- **THEN** il contient un hook `PreToolUse` vers `profile-guard.mjs` pour les neuf outils et pas de clé `agent`

#### Scenario: Réglages existants
- **WHEN** `settings.json` contient déjà un hook `PreToolUse` du projet
- **THEN** il subsiste à côté de celui de `profile-guard.mjs`

### Requirement: Bornage des écritures par profil
`profile-guard.mjs` SHALL lire `agent_type` sur l'entrée du hook et, pour les outils d'écriture, refuser (code 2, message sur stderr) un chemin hors des préfixes que sa table `PROFILES` autorise au profil : `architect` n'écrit que dans `docs/architecture/`, `qa-engineer` que dans `tests/` et `test/`. Un `agent_type` absent de la table, ou une entrée sans `agent_type`, MUST NOT être borné.

#### Scenario: Écriture permise
- **WHEN** `agent_type` vaut `architect` et le chemin est `docs/architecture/adrs/x.md`, relatif ou absolu dans le projet
- **THEN** le hook se termine avec le code 0

#### Scenario: Écriture hors périmètre
- **WHEN** `agent_type` vaut `qa-engineer` et le chemin est `src/x.js`
- **THEN** le hook se termine avec le code 2 et nomme le chemin refusé

#### Scenario: Remontée de dossier ou dossier voisin
- **WHEN** le chemin est `docs/architecture/../../src/x.js`, `docs/architecture-old/x.md`, `tests-x/a.js` ou hors du projet
- **THEN** le hook le refuse

#### Scenario: Casse différente
- **WHEN** le chemin est `Tests/a.js`
- **THEN** le hook le refuse, y compris sous Windows (refus à tort sans risque)

#### Scenario: Agent non borné
- **WHEN** `agent_type` est absent ou vaut un nom hors de la table
- **THEN** le hook se termine avec le code 0

### Requirement: Refus par défaut en cas d'erreur
Pour un profil de la table, une entrée incomplète ou une erreur interne du hook (chemin d'écriture absent, racine du projet inconnue, exception) SHALL se terminer avec le code 2 et non avec un code qui laisse l'outil s'exécuter. Une entrée illisible, dont le profil est inconnu, SHALL se terminer avec le code 0.

#### Scenario: Chemin absent
- **WHEN** `agent_type` vaut `architect`, l'outil est `Write` et `file_path` est absent
- **THEN** le hook se termine avec le code 2

#### Scenario: Racine inconnue
- **WHEN** ni `CLAUDE_PROJECT_DIR` ni `cwd` ne sont fournis pour un profil de la table
- **THEN** le hook se termine avec le code 2

### Requirement: Bornage du shell par profil
Pour `Bash` et `PowerShell`, `profile-guard.mjs` SHALL autoriser un profil à exécuter les commandes de lecture seule acceptées par `read-only-bash.mjs` et les commandes supplémentaires que sa table lui accorde, et refuser toute autre commande (code 2). Si `read-only-bash.mjs` est absent, la commande SHALL être refusée.

#### Scenario: Lecture seule
- **WHEN** `agent_type` vaut `qa-engineer` et la commande est `git status`
- **THEN** le hook se termine avec le code 0

#### Scenario: Commande d'écriture
- **WHEN** `agent_type` vaut `architect` et la commande est `cat x` ou `git status && rm -rf x`
- **THEN** le hook se termine avec le code 2

### Requirement: Commandes supplémentaires de qa-engineer
`qa-engineer` SHALL pouvoir lancer, en plus de la lecture seule, `node .claude/hooks/quality-gate.mjs`, `node .bootstrap/run-checks.mjs` (séparateurs `/` ou `\`) et `archgate review-context` suivi seulement des options `--staged`, `--run-checks`, `--verbose`, `--strict`, `--base` avec une référence facultative et `--domain` avec un domaine. Toute autre option ou tout chaînage MUST être refusé.

#### Scenario: Contrôles permis
- **WHEN** `qa-engineer` lance `node .claude/hooks/quality-gate.mjs` ou `archgate review-context --base --run-checks`
- **THEN** le hook se termine avec le code 0

#### Scenario: Option ou chaînage inconnus
- **WHEN** `qa-engineer` lance `archgate review-context --output x` ou `node .claude/hooks/quality-gate.mjs && rm x`
- **THEN** le hook se termine avec le code 2

### Requirement: Commandes supplémentaires d'architect
`architect` SHALL pouvoir lancer `archgate adr create --title "<titre>" --domain <domaine>` et `archgate adr domain list`. Le titre SHALL se limiter aux lettres, chiffres, espaces et à la ponctuation `,.:'’_-` : aucun guillemet, parenthèse, substitution ni option supplémentaire n'est admis, le motif étant évalué tel quel par PowerShell comme par Bash.

#### Scenario: Création d'ADR permise
- **WHEN** `architect` lance `archgate adr create --title "Choix de la base" --domain architecture`
- **THEN** le hook se termine avec le code 0, et refuse la même commande pour `qa-engineer`

#### Scenario: Injection par le titre
- **WHEN** le titre contient `$(…)`, un accent grave, des guillemets typographiques autour d'une expression entre parenthèses, un saut de ligne, ou est suivi d'une option comme `--body`
- **THEN** le hook se termine avec le code 2

### Requirement: Teammates
Le hook SHALL appliquer la table à un teammate dont le nom est celui d'un profil, comme à un sous-agent du même profil. Les profils générés SHALL indiquer qu'un teammate porte le nom de son profil.

#### Scenario: Teammate nommé comme son profil
- **WHEN** `agent_type` vaut `qa-engineer` parce que le teammate porte ce nom
- **THEN** les mêmes refus et autorisations s'appliquent qu'à un sous-agent `qa-engineer`

### Requirement: Qui écrit ne relit pas
Chaque profil SHALL contenir la règle « qui écrit ne relit pas » : `architect` ne fait pas relire ses ADR par lui-même et ne les passe pas à « Accepté », `qa-engineer` ne relit pas du code qu'il a écrit et ne corrige pas le code relu.

#### Scenario: Règle présente
- **WHEN** les profils sont générés, en français ou en anglais
- **THEN** chacun contient la règle correspondante

### Requirement: Réutilisation d'Archgate et d'OpenSpec
Les profils SHALL citer, selon les modules actifs, ce qu'ils réutilisent : `architecture-explorer`, `arc42-keeper` et le skill `archgate:adr-author` pour `architect`, `archgate review-context --base --run-checks`, `spec-reviewer` et le skill `archgate:reviewer` pour `qa-engineer`. Ils lancent eux-mêmes les agents et skills de leur table et demandent le reste à l'agent principal. Ils MUST NOT citer le skill `onboard`. Une référence à un module absent MUST NOT apparaître dans le profil généré.

#### Scenario: Module Archgate absent
- **WHEN** un projet est généré avec `agent-profiles` mais sans `archgate`, `openspec`, `github` ni `arc42`
- **THEN** les profils ne mentionnent aucun de ces modules ni leurs agents ou skills

### Requirement: Outils et frontmatter des profils
Chaque profil SHALL déclarer sa liste `tools` dans son frontmatter et MUST NOT déclarer de `hooks`. `architect` SHALL disposer de `Agent` et `Skill`, `qa-engineer` de `Agent` sans `Skill`, et tous deux de `Write` et `Edit`, que le hook borne. Ce qu'un profil ne peut pas lancer lui-même, il SHALL le demander à l'agent principal.

#### Scenario: Outils et frontmatter
- **WHEN** les profils sont générés
- **THEN** aucun frontmatter ne contient `hooks`, `architect` a `Agent` et `Skill`, `qa-engineer` a `Agent` sans `Skill`

### Requirement: Bornage des agents lançables
Pour les outils `Agent` et `Task`, `profile-guard.mjs` SHALL refuser (code 2) un profil de la table dont le `subagent_type` n'est pas dans sa liste `agents`, dont l'appel porte un `name` ou un `team_name`, ou dont la liste est vide ou absente. `architect` peut lancer `architecture-explorer` et `arc42-keeper`, `qa-engineer` seulement `spec-reviewer`. Un `subagent_type` absent, vide ou nul vaut `general-purpose` et MUST être refusé.

#### Scenario: Agent permis
- **WHEN** `architect` lance `arc42-keeper` ou `qa-engineer` lance `spec-reviewer`, y compris par l'outil `Task`
- **THEN** le hook se termine avec le code 0

#### Scenario: Agent non permis
- **WHEN** un profil lance `general-purpose`, un agent d'un plugin, un autre profil, lui-même ou un appel sans `subagent_type`
- **THEN** le hook se termine avec le code 2 et nomme l'agent refusé

#### Scenario: Agent nommé ou d'équipe
- **WHEN** un profil lance `arc42-keeper` avec un `name` ou un `team_name`
- **THEN** le hook se termine avec le code 2

#### Scenario: Liste absente
- **WHEN** un agent de la table sans liste `agents` lance n'importe quel agent
- **THEN** le hook se termine avec le code 2

### Requirement: Bornage des skills
Pour l'outil `Skill`, `profile-guard.mjs` SHALL refuser (code 2) un profil de la table dont le skill n'est pas dans sa liste `skills`, ou dont la liste est vide ou absente. `architect` peut lancer `archgate:adr-author` ; `qa-engineer` n'en a aucun, car `archgate:reviewer` lance des agents `general-purpose` que la table interdit.

#### Scenario: Skill permis
- **WHEN** `architect` lance `archgate:adr-author`
- **THEN** le hook se termine avec le code 0

#### Scenario: Skill non permis
- **WHEN** `qa-engineer` lance `archgate:reviewer` ou `architect` lance `archgate:onboard`
- **THEN** le hook se termine avec le code 2

### Requirement: Bornes propres des agents lançables
La table SHALL contenir les agents que les profils lancent, avec leurs bornes, pour qu'elles ne dépendent pas de leur hook de frontmatter, inactif pour un teammate : `arc42-keeper` n'écrit que dans `docs/architecture/arc42/`, `spec-reviewer` et `architecture-explorer` n'écrivent nulle part, et le shell de `spec-reviewer` est en lecture seule. Ces agents MUST NOT pouvoir lancer d'agent ni de skill.

#### Scenario: Écriture d'un agent lançable
- **WHEN** `arc42-keeper` écrit dans `docs/architecture/arc42/05.md` puis dans `src/x.js`
- **THEN** la première écriture est permise et la seconde refusée

#### Scenario: Agent lançable sans écriture
- **WHEN** `spec-reviewer` écrit un fichier ou lance `rm -rf x`
- **THEN** le hook se termine avec le code 2
