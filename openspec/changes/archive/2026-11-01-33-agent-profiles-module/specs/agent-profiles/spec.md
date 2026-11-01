## ADDED Requirements

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

### Requirement: Outils des profils
Chaque profil SHALL déclarer sa liste `tools` dans son frontmatter. Un profil MUST NOT disposer des outils `Agent` ni `Skill` et MUST NOT déclarer de `hooks` dans son frontmatter. `architect` et `qa-engineer` SHALL disposer de `Write` et `Edit`, que le hook borne. Ce qu'un profil ne peut pas lancer lui-même (agent, skill), il SHALL le demander à l'agent principal.

#### Scenario: Pas d'outil Agent ni Skill
- **WHEN** les profils sont générés
- **THEN** aucune liste `tools` ne contient `Agent` ni `Skill` et aucun frontmatter ne contient `hooks`

### Requirement: Déclaration du hook de bornage
Avec `agent-profiles`, `.claude/settings.json` SHALL déclarer un hook `PreToolUse` de type `command` appelant `profile-guard.mjs` pour les outils `Write`, `Edit`, `MultiEdit`, `NotebookEdit`, `Bash` et `PowerShell`, sans déclarer de réglage `agent`. La fusion avec des réglages existants MUST conserver les hooks du projet.

#### Scenario: Déclaration dans settings.json
- **WHEN** `settings.json` est généré avec `agent-profiles`
- **THEN** il contient un hook `PreToolUse` vers `profile-guard.mjs` et pas de clé `agent`

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
Les profils SHALL citer, selon les modules actifs, ce qu'ils réutilisent : `architecture-explorer`, `arc42-keeper` et le skill `archgate:adr-author` pour `architect`, `archgate review-context --base --run-checks`, `spec-reviewer` et le skill `archgate:reviewer` pour `qa-engineer`, agents et skills étant lancés par l'agent principal. Ils MUST NOT citer le skill `onboard`. Une référence à un module absent MUST NOT apparaître dans le profil généré.

#### Scenario: Module Archgate absent
- **WHEN** un projet est généré avec `agent-profiles` mais sans `archgate`, `openspec`, `github` ni `arc42`
- **THEN** les profils ne mentionnent aucun de ces modules ni leurs agents ou skills
