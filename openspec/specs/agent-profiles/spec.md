# agent-profiles Specification

## Purpose
Définir le module optionnel `agent-profiles` : les profils par défaut `architect`, `qa-engineer`, `developer` et `project-lead` (orchestrateur), les profils optionnels choisis par la clé `profiles`, générés dans `.claude/agents/`, et le hook unique qui borne leurs écritures, leur shell, leurs agents et leurs skills.

## Requirements

### Requirement: Module agent-profiles
Le catalogue SHALL contenir un module `agent-profiles` qui requiert `claude` et vaut `default: false`. Sélectionné, il SHALL générer `architect.md`, `qa-engineer.md`, `developer.md` et `project-lead.md` dans `.claude/agents/`, les profils optionnels choisis par `profiles`, `.claude/hooks/profile-guard.mjs` et les skills de `profile-skills`, en français ou en anglais selon `docLanguage`. Non sélectionné, aucun de ces fichiers ni la déclaration de hook MUST NOT être généré.

#### Scenario: Module sélectionné
- **WHEN** un projet est généré avec `agent-profiles`
- **THEN** les quatre profils et le hook existent et `claude` est présent

#### Scenario: Module absent
- **WHEN** un projet est généré sans `agent-profiles`
- **THEN** aucun profil, aucun `profile-guard.mjs` et aucun hook `PreToolUse` de bornage ne sont générés

#### Scenario: Langue anglaise
- **WHEN** un projet est généré avec `docLanguage: "en"`
- **THEN** les profils sont rédigés en anglais et ont les mêmes outils que les profils français

### Requirement: Déclaration du hook de bornage
Avec `agent-profiles`, `.claude/settings.json` SHALL déclarer un hook `PreToolUse` de type `command` appelant `profile-guard.mjs` pour les outils `Write`, `Edit`, `MultiEdit`, `NotebookEdit`, `Bash`, `PowerShell`, `Agent`, `Task` (ancien nom de `Agent`) et `Skill`, et une seconde entrée au matcher `mcp__.*` vers le même hook. Il MUST NOT déclarer de réglage `agent` sauf si la clé `mainAgent` est présente. La fusion avec des réglages existants MUST conserver les hooks du projet.

#### Scenario: Déclaration dans settings.json
- **WHEN** `settings.json` est généré avec `agent-profiles` sans `mainAgent`
- **THEN** il contient deux entrées `PreToolUse` vers `profile-guard.mjs`, l'une pour les neuf outils, l'autre au matcher `mcp__.*`, et pas de clé `agent`

#### Scenario: Réglages existants
- **WHEN** `settings.json` contient déjà un hook `PreToolUse` du projet
- **THEN** il subsiste à côté de celui de `profile-guard.mjs`

#### Scenario: Mise à jour d'un projet existant
- **WHEN** `--update` s'applique à un projet dont `settings.json` ne porte que la première entrée
- **THEN** la seconde entrée est ajoutée et la première reste identique

### Requirement: Bornage des écritures par profil
`profile-guard.mjs` SHALL lire `agent_type` sur l'entrée du hook et, pour les outils d'écriture, refuser (code 2, message sur stderr) un chemin hors des préfixes que sa table `PROFILES` autorise au profil (`architect` : `docs/architecture/` ; `qa-engineer` : `tests/` et `test/`), ou, pour `developer`, sous une entrée de sa liste d'exclusion. Un `agent_type` absent de la table, ou une entrée sans `agent_type`, MUST NOT être borné.

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
- **WHEN** le chemin est `Tests/a.js` et que le dossier `tests/` n'existe pas encore
- **THEN** le hook le refuse, y compris sous Windows (refus à tort sans risque)

#### Scenario: Agent non borné
- **WHEN** `agent_type` est absent ou vaut un nom hors de la table
- **THEN** le hook se termine avec le code 0

### Requirement: Refus par défaut en cas d'erreur
Pour un profil de la table, une entrée incomplète ou une erreur interne du hook (chemin d'écriture absent, racine du projet inconnue, fichier de skill illisible, exception) SHALL se terminer avec le code 2 et non avec un code qui laisse l'outil s'exécuter. Une entrée illisible, dont le profil est inconnu, SHALL se terminer avec le code 0.

#### Scenario: Chemin absent
- **WHEN** `agent_type` vaut `architect`, l'outil est `Write` et `file_path` est absent
- **THEN** le hook se termine avec le code 2

#### Scenario: Racine inconnue
- **WHEN** ni `CLAUDE_PROJECT_DIR` ni `cwd` ne sont fournis pour un profil de la table
- **THEN** le hook se termine avec le code 2

### Requirement: Bornage du shell par profil
Pour `Bash` et `PowerShell`, `profile-guard.mjs` SHALL autoriser un profil à exécuter les commandes de lecture seule acceptées par `read-only-bash.mjs` et les commandes supplémentaires que sa table lui accorde, et refuser toute autre commande (code 2), sauf pour `developer`, dont le shell n'est pas borné. Si `read-only-bash.mjs` est absent, la commande d'un profil borné SHALL être refusée.

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

### Requirement: Valeurs de départ des agents sonnet et haiku
Les valeurs SHALL être, dans l'ordre `model`, `effort`, `maxTurns` : `developer` sonnet, high, 60 ; `business-analyst` sonnet, high, 40 ; `product-owner` sonnet, medium, 20 ; `acceptance-tester` sonnet, medium, 25 ; `devops-engineer` sonnet, medium, 25 ; `scout` haiku, medium, 20 ; et, sans `agent-profiles`, `arc42-keeper` sonnet, medium, 30 et `traceability-checker` sonnet, medium, 25.

#### Scenario: Table des valeurs sonnet et haiku
- **WHEN** les agents sont générés
- **THEN** chacun de ces agents porte son triplet

### Requirement: Qui écrit ne relit pas
Chaque profil SHALL contenir la règle « qui écrit ne relit pas » : `architect` ne fait pas relire ses ADR par lui-même et ne les passe pas à « Accepté », `qa-engineer` ne relit pas du code qu'il a écrit et ne corrige pas le code relu.

#### Scenario: Règle présente
- **WHEN** les profils sont générés, en français ou en anglais
- **THEN** chacun contient la règle correspondante

### Requirement: Réutilisation d'Archgate et d'OpenSpec
Les profils SHALL citer, selon les modules actifs, ce qu'ils réutilisent : les skills `archgate:adr-author` et `archgate:cli-reference` pour `architect`, `archgate review-context --base --run-checks` pour `qa-engineer`, le skill `openspec-apply-change` (`/opsx:apply`) pour `developer`. Ils lancent les skills de leur table et demandent le reste à l'agent principal. Ils MUST NOT citer le skill `onboard` ni les agents `architecture-explorer`, `arc42-keeper`, `spec-reviewer` et `traceability-checker`. Une référence à un module absent MUST NOT apparaître.

#### Scenario: Module Archgate absent
- **WHEN** un projet est généré avec `agent-profiles` mais sans `archgate`, `openspec`, `github` ni `arc42`
- **THEN** les profils ne mentionnent aucun de ces modules ni leurs skills

#### Scenario: Skills réutilisés
- **WHEN** un projet est généré avec `agent-profiles`, `openspec` et `archgate-plugin`
- **THEN** `developer.md` demande de lancer le skill d'apply et `architect.md` cite `archgate:adr-author` et `archgate:cli-reference`

#### Scenario: Sans archgate-plugin
- **WHEN** un projet est généré avec `agent-profiles` et `openspec` mais sans `archgate-plugin`
- **THEN** `architect.md` ne cite ni `archgate:adr-author` ni `archgate:cli-reference`

### Requirement: Outils et frontmatter des profils
Chaque profil borné (`architect`, `qa-engineer`, `developer` et les profils optionnels) SHALL déclarer sa liste `tools` et MUST NOT déclarer de `hooks`. `architect`, `qa-engineer` et `developer` SHALL disposer de `Skill` sans `Agent`, `business-analyst` de `Skill`, les autres sans `Agent` ni `Skill`. `project-lead` MUST NOT déclarer de `tools` ni de `hooks` et SHALL déclarer `disallowedTools` : `Write, Edit, MultiEdit, NotebookEdit`.

#### Scenario: Outils et frontmatter
- **WHEN** les profils sont générés
- **THEN** aucun frontmatter ne contient `hooks`, `architect`, `qa-engineer` et `developer` ont `Skill` sans `Agent`, aucun autre profil borné n'a `Agent`, et `project-lead` n'a pas de ligne `tools` mais refuse `Write`, `Edit`, `MultiEdit` et `NotebookEdit`

### Requirement: Bornage des agents lançables
Pour les outils `Agent` et `Task`, `profile-guard.mjs` SHALL refuser (code 2) un profil de la table dont le `subagent_type` n'est pas dans sa liste `agents` (vide ou absente : aucun agent), ou dont l'appel porte un `name` ou un `team_name`, sauf pour un type de la liste `namedAgents` du profil, dont le `name` doit égaler le `subagent_type`. Un `subagent_type` absent, vide ou nul vaut `general-purpose` et MUST être refusé. Seul `project-lead` lance des agents.

#### Scenario: Agent permis
- **WHEN** un agent de la table dont la liste `agents` contient `x` lance `x`, y compris par l'outil `Task`
- **THEN** le hook se termine avec le code 0

#### Scenario: Agent non permis
- **WHEN** un profil lance un agent absent de sa liste `agents`, `general-purpose`, un agent d'un plugin, lui-même ou un appel sans `subagent_type`
- **THEN** le hook se termine avec le code 2 et nomme l'agent refusé

#### Scenario: Agents refusés à project-lead
- **WHEN** `project-lead` lance `general-purpose`, `Explore`, `archgate:planner` ou `project-lead`
- **THEN** le hook se termine avec le code 2

#### Scenario: Agent nommé ou d'équipe
- **WHEN** un profil sans liste `namedAgents` lance un agent avec un `name` ou un `team_name`
- **THEN** le hook se termine avec le code 2

#### Scenario: Teammate de project-lead
- **WHEN** `project-lead` lance `architect` avec `name: "architect"`, avec ou sans `team_name`
- **THEN** le hook se termine avec le code 0

#### Scenario: Nom absent ou différent du type
- **WHEN** `project-lead` lance `architect` avec `name: "x"`, avec `team_name` seul, ou `second-opinion` avec `name: "second-opinion"`
- **THEN** le hook se termine avec le code 2

#### Scenario: Architect et qa-engineer
- **WHEN** `architect` ou `qa-engineer` lance un agent, y compris par l'outil `Task`
- **THEN** le hook se termine avec le code 2

#### Scenario: Liste absente
- **WHEN** un agent de la table sans liste `agents` lance n'importe quel agent
- **THEN** le hook se termine avec le code 2

### Requirement: Bornage des skills
Pour l'outil `Skill`, `profile-guard.mjs` SHALL refuser (code 2) un profil de la table dont le skill n'est pas dans sa liste `skills` (comparaison du nom exact), ou dont la liste est vide ou absente, sauf pour un profil à l'option `skillsOpen`, qui n'a pas de liste. Les skills à contexte isolé sont refusés à tous (« Skills à contexte isolé »). `architect` peut lancer `archgate:adr-author`, `archgate:cli-reference`, `adr-options-comparison` et `arc42-update` ; `qa-engineer`, `spec-review` et `pr-readiness-review` ; `developer`, `openspec-apply-change` et `opsx:apply`. `archgate:reviewer` et l'agent `archgate:planner` ne sont permis à aucun profil.

#### Scenario: Skill permis
- **WHEN** `architect` lance `archgate:adr-author`, `archgate:cli-reference`, `adr-options-comparison` ou `arc42-update`, ou `qa-engineer` lance `spec-review` ou `pr-readiness-review`
- **THEN** le hook se termine avec le code 0

#### Scenario: Skill de developer
- **WHEN** `developer` lance `openspec-apply-change` ou `opsx:apply`
- **THEN** le hook se termine avec le code 0

#### Scenario: Skill non permis
- **WHEN** `qa-engineer` lance `archgate:reviewer`, `arc42-update` ou `/spec-review`, `architect` lance `archgate:onboard` ou `spec-review`, ou `developer` lance `archgate:reviewer`, `archgate:adr-author`, `opsx:archive`, `opsx:sync` ou `opsx:propose`
- **THEN** le hook se termine avec le code 2

#### Scenario: Skill de developer à contexte isolé
- **WHEN** `developer` lance un skill permis dont l'en-tête déclare `context: fork`
- **THEN** le hook se termine avec le code 2

#### Scenario: Skill de project-lead
- **WHEN** `project-lead` lance `archgate:lessons-learned` ou `opsx:explore`
- **THEN** le hook se termine avec le code 0

### Requirement: Outils des profils en lecture seule
`product-owner`, `acceptance-tester` et `scout` SHALL n'avoir ni `Write` ni `Edit`. `second-opinion` SHALL n'avoir ni `Bash`, ni `Write`, ni `Edit`, ni `Agent`, ni `Skill`.

#### Scenario: Profils en lecture seule
- **WHEN** `acceptance-tester`, `scout` et `second-opinion` sont générés
- **THEN** `acceptance-tester` et `scout` ont `Read, Glob, Grep, Bash`, `second-opinion` a `Read, Glob, Grep, WebSearch, WebFetch`, et aucun n'a `Write`, `Edit`, `Agent` ni `Skill`

### Requirement: Profil project-lead
`project-lead.md` SHALL contenir la consigne de délégation (`architect`, `qa-engineer`, `developer`, puis `business-analyst` s'il existe dans `.claude/agents/`), le brief borné, l'échelle d'arbitrage à cinq niveaux et la règle « qui écrit ne relit pas ». Il SHALL dire que `project-lead` ne produit ni code ni spec, et confier les specs à `developer` quand `business-analyst` n'existe pas.

#### Scenario: Contenu de la définition
- **WHEN** `project-lead.md` est généré
- **THEN** il contient les sections de délégation, de brief borné et d'échelle à cinq niveaux, et la règle de relecture

#### Scenario: Orchestrateur
- **WHEN** `project-lead.md` est généré
- **THEN** il dit qu'il ne produit ni code ni spec, délègue le code à `developer` sans condition et ne contient plus la consigne de les écrire lui-même

#### Scenario: Sans business-analyst
- **WHEN** `project-lead.md` est généré sans `business-analyst` dans `profiles`
- **THEN** il confie la rédaction du changement OpenSpec à `developer`

### Requirement: Garde-fous de project-lead
`project-lead.md` SHALL exiger l'accord de l'utilisateur pour toute écriture visible à l'extérieur (niveau 5 de l'échelle), porter l'échelle d'arbitrage et la répartition des rôles, et dire que le hook borne ses écritures, son shell, ses agents et ses outils MCP. Il MUST NOT lancer `/opsx:apply`, `/opsx:archive` ni `/opsx:sync` lui-même. Ses garde-fous restent doublés par `disallowedTools`.

#### Scenario: Pas de bornage de l'agent principal
- **WHEN** l'entrée du hook n'a pas d'`agent_type` (session sans réglage `agent`)
- **THEN** le hook se termine avec le code 0

#### Scenario: Consigne à jour
- **WHEN** `project-lead.md` est généré, en français ou en anglais
- **THEN** il ne contient ni « aucun hook ne te borne » ni « no hook bounds you », dit que le hook refuse l'écriture, limite le shell au pilotage, les outils MCP à la lecture et ne lance que les profils, et interdit à `project-lead` de lancer `/opsx:apply`, `/opsx:archive` et `/opsx:sync`

#### Scenario: Écritures visibles
- **WHEN** un projet est généré avec `github`
- **THEN** `project-lead.md` demande l'accord de l'utilisateur pour `gh issue create`, `gh pr create`, `gh pr merge` et les releases

#### Scenario: Limite consignée
- **WHEN** `docs/workflow.md` est généré avec `agent-profiles`
- **THEN** sa table des règles doublées cite `disallowedTools` et le hook de bornage pour « ne produit ni code ni spec », sans dire que l'effet n'est pas vérifié, et une ligne sur les outils MCP

### Requirement: Parcours de project-lead selon les modules
Les blocs de `project-lead.md` qui citent `archgate`, `archgate-plugin`, `openspec` ou `github` SHALL n'apparaître que si ces modules sont actifs. Avec `openspec`, il SHALL décrire `/opsx:explore` (mené en dialogue, sans décision ni code), `/opsx:update` et la lecture de l'avancement par `openspec status --json` et `list --json`. Avec `archgate`, il SHALL joindre les briefings d'ADR au brief et traiter les ADR comme des bloquants.

#### Scenario: Modules absents
- **WHEN** un projet est généré avec `agent-profiles` sans `archgate`, `openspec`, `github` ni `arc42`
- **THEN** `project-lead.md` ne mentionne aucun de ces modules ni leurs commandes

#### Scenario: Modules présents
- **WHEN** un projet est généré avec `openspec` et `archgate`
- **THEN** `project-lead.md` décrit `/opsx:explore`, `/opsx:update`, `openspec status --json` et les briefings d'ADR

### Requirement: Lancements demandés par les profils
Avec `archgate-plugin`, `project-lead` SHALL lancer `archgate:lessons-learned` en fin de tâche et confier à `architect` les ADR qui en ressortent. Il MUST NOT lancer `archgate:reviewer`, dont les agents `general-purpose` sont refusés ; la vérification ADR passe par `qa-engineer`. Il SHALL traiter les demandes de lancement (agent, skill) que les profils lui adressent, en les lançant ou en refusant explicitement.

#### Scenario: Skills d'Archgate
- **WHEN** un projet est généré avec `archgate-plugin`
- **THEN** `project-lead.md` demande de lancer `archgate:lessons-learned`, ne cite pas `archgate:reviewer`, et `qa-engineer.md` ne demande pas à l'agent principal de le lancer

#### Scenario: Demandes des profils
- **WHEN** `project-lead.md` est généré
- **THEN** il demande de traiter ce que le hook refuse aux profils

### Requirement: Clé mainAgent
La configuration SHALL accepter une clé facultative `mainAgent` valant `"project-lead"`. Présente, `.claude/settings.json` SHALL contenir `"agent": "project-lead"` ; absente, aucune clé `agent` MUST NOT être écrite. Toute autre valeur, ou la clé sans le module `agent-profiles`, MUST faire échouer `scaffold.mjs` (code 1, aucun fichier écrit). La clé SHALL être consignée au manifeste seulement quand elle est présente et héritée par `--update`.

#### Scenario: Clé absente
- **WHEN** `mainAgent` est absent
- **THEN** `settings.json` n'a pas de clé `agent` et le manifeste ne contient pas `mainAgent`

#### Scenario: Clé présente
- **WHEN** `mainAgent` vaut `"project-lead"` avec `agent-profiles`
- **THEN** `settings.json` contient `"agent": "project-lead"` et le manifeste consigne la valeur

#### Scenario: Valeur invalide ou module absent
- **WHEN** `mainAgent` vaut `"autre"`, ou vaut `"project-lead"` sans `agent-profiles`
- **THEN** `scaffold.mjs` s'arrête avec le code 1 sans écrire de fichier

#### Scenario: Mise à jour
- **WHEN** `--update` est lancé sur un projet dont le manifeste consigne `mainAgent`
- **THEN** la valeur est conservée sans être répétée dans la configuration

### Requirement: Coexistence avec archgate-plugin
`agent-profiles` MUST NOT déclarer d'incompatibilité avec `archgate-plugin`. Avec `mainAgent`, le réglage `agent` du projet l'emporte sur l'agent du plugin Archgate.

#### Scenario: Combinaison acceptée
- **WHEN** un projet est généré avec `agent-profiles`, `archgate-plugin` et `mainAgent`
- **THEN** la génération réussit et `settings.json` contient `"agent": "project-lead"`

### Requirement: Désactivation de mainAgent
`mainAgent: null` SHALL désactiver la clé : elle n'est ni héritée du manifeste, ni consignée, et le module `agent-profiles` peut alors être retiré. Si `settings.json` ou `settings.local.json` déclare déjà un autre `agent`, la clé existante MUST être conservée et le rapport MUST porter un avertissement qui la nomme.

#### Scenario: Désactivation
- **WHEN** `--update` est lancé avec `mainAgent: null`
- **THEN** le manifeste ne consigne plus `mainAgent` et la valeur n'est pas héritée

#### Scenario: Retrait du module
- **WHEN** `agent-profiles` est retiré de la sélection avec `mainAgent: null`
- **THEN** `scaffold.mjs` réussit

#### Scenario: Agent déjà déclaré par le projet
- **WHEN** `mainAgent` est présent et `settings.json` ou `settings.local.json` déclare déjà un autre `agent`
- **THEN** la clé existante est conservée et le rapport porte un avertissement qui la nomme

### Requirement: Question de phase 0 sur l'agent principal
Le module `agent-profiles` SHALL déclarer dans `module.json` une question de phase 0 demandant si `project-lead` devient l'agent principal des sessions du projet, en indiquant que le choix s'applique à toutes les sessions du clone et que la réponse par défaut est non. `scaffold.mjs --list-modules` MUST la lister avec le module.

#### Scenario: Question listée
- **WHEN** `scaffold.mjs --list-modules` est lancé
- **THEN** le module `agent-profiles` porte une question qui cite `mainAgent` et le défaut non

### Requirement: Traitement de la réponse par le skill
`SKILL.md` SHALL demander de poser cette question en phase 0 et de reporter une réponse positive dans `bootstrap.json` (`mainAgent: "project-lead"`). Il SHALL demander d'annoncer le choix en phase 1, avant toute écriture, avec les avertissements du dry-run.

#### Scenario: Annonce en phase 1
- **WHEN** l'utilisateur choisit `project-lead` comme agent principal
- **THEN** la phase 1 annonce que toutes les sessions du clone démarreront avec `project-lead` et reporte les avertissements du dry-run

### Requirement: Clé profiles
La configuration SHALL accepter une clé facultative `profiles`, liste de noms parmi `acceptance-tester`, `business-analyst`, `compliance-reviewer`, `devops-engineer`, `product-owner`, `scout` et `second-opinion`. Seuls les profils listés SHALL être générés en plus des profils par défaut. Avec `agent-profiles`, `developer` listé est ignoré avec un avertissement. Un nom inconnu, une valeur non liste ou la clé sans `agent-profiles` MUST faire échouer `scaffold.mjs`.

#### Scenario: Clé absente
- **WHEN** `profiles` est absent
- **THEN** aucun profil optionnel n'est généré et le manifeste ne contient pas `profiles`

#### Scenario: Profils listés
- **WHEN** `profiles` vaut `["product-owner", "scout", "business-analyst", "scout"]`
- **THEN** les trois profils sont générés et le manifeste consigne la liste triée sans doublon

#### Scenario: Nouveaux profils
- **WHEN** `profiles` vaut `["second-opinion", "scout", "acceptance-tester"]`
- **THEN** les trois profils sont générés et le manifeste consigne la liste triée

#### Scenario: Profils du lot 2b
- **WHEN** `profiles` vaut `["devops-engineer"]`
- **THEN** seul `devops-engineer` est généré en plus des profils par défaut

#### Scenario: developer listé
- **WHEN** `profiles` vaut `["developer", "scout"]` avec `agent-profiles`
- **THEN** `developer.md` est généré une seule fois, un avertissement nomme `developer` et le manifeste consigne `["scout"]`

#### Scenario: Refus
- **WHEN** `profiles` contient un nom inconnu, n'est pas une liste, ou est donné sans `agent-profiles`, y compris `["developer"]`
- **THEN** `scaffold.mjs` s'arrête avec le code 1 sans écrire de fichier

### Requirement: Désactivation et héritage de profiles
`profiles: []` ou `profiles: null` SHALL désactiver la clé : elle n'est ni héritée du manifeste ni consignée. Les fichiers des profils optionnels qui ne sont plus produits sont signalés dans `retired` et retirés du manifeste, mais laissés sur le disque ; `developer.md`, toujours produit, n'en fait pas partie. `--update` sans `profiles` SHALL conserver la liste du manifeste, privée de `developer` avec un avertissement si elle le contient.

#### Scenario: Héritage
- **WHEN** `--update` est lancé sans `profiles` sur un projet dont le manifeste consigne la liste
- **THEN** la liste est conservée

#### Scenario: Désactivation
- **WHEN** `--update` est lancé avec `profiles: []` ou `profiles: null`
- **THEN** le manifeste ne consigne plus `profiles`, les fichiers des profils optionnels sont signalés dans `retired` et restent sur le disque, et `developer.md` n'est pas dans `retired`

#### Scenario: Retrait d'une dépendance hérite d'une liste
- **WHEN** `--update` retire `openspec` ou `agent-profiles` alors que le manifeste consigne `business-analyst` ou `profiles` sans `profiles: []`
- **THEN** `scaffold.mjs` s'arrête avec le code 1

#### Scenario: Manifeste avec developer
- **WHEN** `--update` est lancé sans `profiles` sur un manifeste dont `profiles` contient `developer`
- **THEN** un avertissement nomme `developer`, le manifeste n'en consigne plus et `developer.md` est conservé

### Requirement: Profil product-owner
`product-owner` SHALL structurer le besoin (qui, quoi, pourquoi, valeur), rendre un brouillon d'issue avec des critères d'acceptation vérifiables, contester la couverture du besoin par les specs, et remonter les décisions d'architecture et de périmètre au chef de projet. Il MUST NOT écrire de fichier : la table du hook lui refuse l'écriture et limite son shell à la lecture.

#### Scenario: Lecture seule
- **WHEN** `agent_type` vaut `product-owner`, écrit un fichier ou lance `rm x`
- **THEN** le hook se termine avec le code 2 ; `git log` et `gh issue view` sont permis

### Requirement: Profil developer
`developer` SHALL être généré avec `agent-profiles` sans figurer dans `profiles`. Il SHALL implémenter le brief, faire un commit atomique par tâche, lancer les tests du projet, ne rien publier et rendre un travail relu par `qa-engineer`. Avec `openspec`, il SHALL lancer le skill `openspec-apply-change` (`/opsx:apply`) pour exécuter un changement existant. Sans `business-analyst`, il SHALL rédiger et réviser le changement OpenSpec dans `openspec/changes/<id>/`. Son shell n'est pas borné ; il MUST NOT disposer de l'outil `Agent` et ne lance aucun autre skill que celui d'apply.

#### Scenario: Profil généré
- **WHEN** `developer` est généré
- **THEN** son frontmatter a `Skill` sans `Agent` et le profil dit que `qa-engineer` relit son travail, que rien n'est publié par lui et qu'il ne lance aucun agent ni autre skill que celui d'apply

#### Scenario: Profil par défaut
- **WHEN** un projet est généré avec `agent-profiles` sans clé `profiles`
- **THEN** `.claude/agents/developer.md` existe

#### Scenario: Rédaction des specs
- **WHEN** `developer` est généré avec `openspec`
- **THEN** il dit comment créer, rédiger et valider un changement et qu'il n'écrit que dans `openspec/changes/<id>/`

#### Scenario: Exécution d'un changement
- **WHEN** `developer` est généré avec `openspec`
- **THEN** il dit de lancer le skill d'apply sur le changement du brief et d'en suivre `tasks.md`

### Requirement: Dossiers de gouvernance interdits à developer
La table du hook SHALL refuser à `developer` l'écriture sous `.archgate/`, `.bootstrap/`, `.claude/`, `.git/`, `.githooks/`, `.github/`, `docs/architecture/`, `openspec/changes/archive/`, `openspec/schemas/` et `openspec/specs/`, et dans les fichiers `CLAUDE.md`, `AGENTS.md`, `docs/workflow.md`, `openspec/config.yaml`, `openspec/config.yml`, `release-please-config.json` et `.release-please-manifest.json`. `openspec/changes/` reste ouvert.

#### Scenario: Écriture dans le code
- **WHEN** `developer` écrit `src/a.js`, `tests/a.test.js` ou `openspec/changes/12-x/tasks.md`
- **THEN** le hook se termine avec le code 0

#### Scenario: Dossiers et fichiers de gouvernance
- **WHEN** `developer` écrit `.claude/settings.json`, `docs/architecture/adrs/x.md`, `CLAUDE.md`, `.git/hooks/pre-commit` ou `openspec/specs/x/spec.md`
- **THEN** le hook se termine avec le code 2 et nomme l'entrée de la liste

#### Scenario: Dossier voisin ou chemin hors du projet
- **WHEN** `developer` écrit `docs/architecture-old/x.md`, puis `../x.js`
- **THEN** le premier est permis et le second refusé

### Requirement: Comparaison des entrées de la liste d'exclusion
La comparaison SHALL ignorer la casse ainsi que les points et espaces finals d'un segment. Une entrée terminée par `/` désigne un dossier ; toute autre entrée désigne un fichier exact, qui ne bloque pas ses voisins (`CLAUDE.md.bak`).

#### Scenario: Variantes de casse et de points finals
- **WHEN** `developer` écrit `.Claude/x`, `.claude./x`, `docs/architecture./x.md` ou `OpenSpec/Specs/x`
- **THEN** le hook se termine avec le code 2

#### Scenario: Fichier exact et voisins
- **WHEN** `developer` écrit `CLAUDE.md.bak`, `openspec/config.yaml.bak` ou `docs/workflow.md.old`
- **THEN** le hook se termine avec le code 0

### Requirement: Chemin réel des écritures
Pour les profils de la table, le hook SHALL comparer le chemin réel de l'écriture : l'ancêtre existant le plus long est résolu (liens, jonctions, noms courts 8.3, casse réelle), puis le reste du chemin lui est ajouté. Il SHALL refuser un chemin dont un segment contient `:` (flux NTFS).

#### Scenario: Jonction vers un dossier de gouvernance
- **WHEN** `src/lien` est une jonction vers `.claude/` et `developer` écrit `src/lien/settings.json`
- **THEN** le hook se termine avec le code 2

#### Scenario: Jonction vers l'extérieur
- **WHEN** `tests/evasion` est une jonction vers un dossier hors du projet et `qa-engineer` y écrit
- **THEN** le hook se termine avec le code 2

#### Scenario: Nom court 8.3 ou flux NTFS
- **WHEN** `developer` écrit `CLAUDE~1/settings.json` sous Windows, ou `.claude::$INDEX_ALLOCATION/settings.json`
- **THEN** le hook se termine avec le code 2

### Requirement: Profil business-analyst
`business-analyst` SHALL rédiger le changement OpenSpec d'une issue avec le skill `opsx:propose`, le réviser avec `opsx:update` et le valider avec `openspec validate`. La table du hook SHALL limiter son écriture à `openspec/changes/`, son shell à la lecture plus `openspec new change`, `openspec instructions` et `openspec context` (guillemets facultatifs autour des noms), ses skills à `opsx:propose`, `opsx:update` et `openspec-propose`, `openspec-update-change`, et lui interdire tout agent.

#### Scenario: Écriture du changement
- **WHEN** `business-analyst` écrit `openspec/changes/12-x/proposal.md`, puis `openspec/specs/x/spec.md` et `src/x.js`
- **THEN** la première écriture est permise, les deux autres refusées

#### Scenario: Formes des skills OpenSpec
- **WHEN** `business-analyst` lance `openspec new change "12-x"`, `openspec instructions "proposal" --change "12-x" --json` et `openspec context --json`
- **THEN** le hook se termine avec le code 0 ; `openspec archive 12-x` et `openspec new change "$(rm x)"` sont refusés

#### Scenario: Skills
- **WHEN** `business-analyst` lance les skills `opsx:propose` puis `opsx:archive`
- **THEN** le premier est permis et le second refusé

### Requirement: Hook conservé par keep
Quand `.claude/hooks/profile-guard.mjs` figure dans `keep` avec le module `agent-profiles`, le rapport de `scaffold.mjs` SHALL porter un avertissement indiquant que les profils ne sont bornés que par la version du projet.

#### Scenario: Hook personnalisé
- **WHEN** `keep` contient `.claude/hooks/profile-guard.mjs` et `agent-profiles` est sélectionné
- **THEN** le rapport contient un avertissement qui nomme le fichier

### Requirement: Question de phase 0 sur les profils optionnels
Le module `agent-profiles` SHALL déclarer, en plus de la question sur l'agent principal, une question de phase 0 sur les profils optionnels à générer (clé `profiles`), qui cite les sept profils, les dépendances de `business-analyst` et de `compliance-reviewer` et le défaut : aucun. Il SHALL déclarer en plus une question sur le domaine réglementé (clé `regulatedDomain`).

#### Scenario: Question listée
- **WHEN** `scaffold.mjs --list-modules` est lancé
- **THEN** le module `agent-profiles` porte trois questions, dont une citant `profiles`, les sept noms et le défaut aucun, et une citant `regulatedDomain` et le défaut non

### Requirement: Traitement de la réponse sur les profils par le skill
`SKILL.md` SHALL demander de poser la question sur les profils en phase 0, d'expliquer le rôle de chaque profil optionnel et de reporter la liste choisie dans `bootstrap.json` (`profiles`). Il SHALL demander d'annoncer en phase 1 les profils générés, dont `developer`, et l'absence de bornage de son shell.

#### Scenario: Annonce en phase 1
- **WHEN** un projet est généré avec `agent-profiles`
- **THEN** la phase 1 annonce les profils générés et que le shell de `developer` n'est pas borné

### Requirement: Délégation de project-lead aux profils du lot 2a
La consigne de `project-lead` SHALL déléguer la recette à `acceptance-tester` après la relecture de `qa-engineer`, l'exploration factuelle à `scout` et le contre-avis à `second-opinion` aux niveaux 3 et 4 de l'échelle, seulement si ces profils existent dans `.claude/agents/`, et SHALL demander un brief neutre pour `second-opinion`.

#### Scenario: Profils du lot 2a
- **WHEN** `project-lead.md` est généré
- **THEN** sa consigne cite `acceptance-tester`, `scout` et `second-opinion` conditionnés à leur présence dans `.claude/agents/`, et la neutralité du brief de `second-opinion`

### Requirement: Modèle, effort et tours maximum des agents
Chaque agent généré qui déclare une liste `tools` SHALL déclarer `model`, `effort` et `maxTurns`. `project-lead`, agent principal, MUST NOT déclarer ces champs : il suit la session.

#### Scenario: Valeurs déclarées
- **WHEN** tous les modules et les profils optionnels sont générés avec `agent-profiles`
- **THEN** chaque agent à liste `tools` déclare `model`, `effort` et `maxTurns`

#### Scenario: Agents historiques sans agent-profiles
- **WHEN** tous les modules sont générés sans `agent-profiles`
- **THEN** `arc42-keeper`, `spec-reviewer`, `architecture-explorer` et `traceability-checker` déclarent `model`, `effort` et `maxTurns`

#### Scenario: Agent principal
- **WHEN** `project-lead` est généré
- **THEN** son frontmatter ne contient ni `model`, ni `effort`, ni `maxTurns`

### Requirement: Valeurs de départ par agent
Les valeurs SHALL être, dans l'ordre `model`, `effort`, `maxTurns` : `architect` opus, high, 40 ; `qa-engineer` opus, high, 40 ; `second-opinion` opus, high, 30 ; `compliance-reviewer` opus, high, 30. Les agents sonnet et haiku ont leur exigence propre. Les valeurs SHALL être identiques en français et en anglais.

#### Scenario: Table des valeurs
- **WHEN** les agents sont générés avec `docLanguage: "fr"`
- **THEN** chacun porte le triplet de la table

#### Scenario: Version anglaise
- **WHEN** les agents sont générés avec `docLanguage: "en"`
- **THEN** chacun porte le même triplet

### Requirement: Valeurs fixes sans clé de configuration
Le générateur SHALL écrire ces valeurs telles quelles et MUST NOT lire de clé de configuration pour les modifier. L'utilisateur les modifie dans le frontmatter ou les surcharge par `CLAUDE_CODE_EFFORT_LEVEL`, `CLAUDE_CODE_SUBAGENT_MODEL` ou le paramètre d'appel.

#### Scenario: Aucune clé
- **WHEN** `scaffold.mjs` reçoit une clé `effort`, `model` ou `maxTurns` dans la configuration
- **THEN** elle n'a aucun effet : les agents générés sont identiques, octet pour octet, à ceux d'une génération sans elle

### Requirement: Cohérence avec la consigne de l'advisor
La règle de présence de la consigne de l'advisor SHALL continuer de se fonder sur `model:` : le bloc reste présent exactement dans les profils du module `agent-profiles` dont le modèle est de la famille `sonnet` ou `haiku`.

#### Scenario: Valeurs de départ
- **WHEN** les agents sont générés avec la clé `advisor` et tous les profils optionnels
- **THEN** la consigne figure dans `product-owner`, `developer`, `business-analyst`, `acceptance-tester`, `devops-engineer` et `scout`, et dans aucun autre agent

### Requirement: Profil acceptance-tester
`acceptance-tester` SHALL valider le résultat d'un changement face aux critères de l'issue et aux scénarios des specs, rendre pour chaque critère un verdict avec sa preuve, et remonter ce qu'il ne peut pas vérifier. Il MUST NOT écrire de fichier : la table du hook lui refuse l'écriture et limite son shell à la commande de lecture seule de `read-only-bash.mjs`.

#### Scenario: Lecture seule
- **WHEN** `agent_type` vaut `acceptance-tester`, écrit un fichier ou lance `rm x`
- **THEN** le hook se termine avec le code 2 ; `git log` et `gh issue view` sont permis

### Requirement: Preuves de acceptance-tester
Les preuves d'`acceptance-tester` SHALL venir de l'issue, des specs, de `gh pr checks`, de `gh run view`, de `openspec validate` et du rapport de tests que `qa-engineer` joint au brief ; il n'exécute ni lanceur de tests ni contrôle qualité, que le hook refuse. Sa consigne lui demande de ne pas lire le code source ; rien ne l'en empêche techniquement. Sans les modules `github` ou `openspec`, ses références à l'issue et aux specs sont omises et il prend les critères dans le brief.

#### Scenario: Modules absents
- **WHEN** `acceptance-tester` est généré sans les modules `github` et `openspec`
- **THEN** son modèle ne mentionne ni `gh` ni `openspec` et indique que les critères viennent du brief

### Requirement: Profil scout
`scout` SHALL explorer le dépôt et la documentation, rendre des résumés structurés où chaque affirmation cite sa preuve (fichier et ligne), et ne rien décider. Il MUST NOT écrire de fichier : la table du hook lui refuse l'écriture et limite son shell à la lecture. Il se distingue de l'agent intégré `Explore` par son rapport structuré, prouvé et borné par `maxTurns`.

#### Scenario: Lecture seule
- **WHEN** `agent_type` vaut `scout`, écrit un fichier ou lance `rm x`
- **THEN** le hook se termine avec le code 2

### Requirement: Profil second-opinion
`second-opinion` SHALL donner un contre-avis indépendant sur un brief neutre (question, options, preuves) : pour chaque option, les arguments pour et contre, puis l'objection la plus forte à l'option qui paraît favorite. Il SHALL écarter toute préférence ou tout raisonnement de l'orchestrateur présent dans le brief et le signaler. Il MUST NOT disposer de `Bash`, `Agent` ni `Skill`.

#### Scenario: Brief avec préférence
- **WHEN** le brief reçu contient la préférence de l'orchestrateur
- **THEN** la consigne du profil lui demande de l'écarter et de la signaler dans son rapport

### Requirement: Isolement de second-opinion
La table du hook SHALL refuser l'écriture à `second-opinion` et limiter le shell d'un agent portant ce nom mais lancé avec un autre type. La consigne de `second-opinion` SHALL le réserver aux sous-agents, car en équipe les messages d'un teammate peuvent lui transmettre la préférence de l'orchestrateur.

#### Scenario: Consigne de lancement
- **WHEN** `second-opinion` est généré
- **THEN** sa consigne demande un lancement en sous-agent et non en équipe

#### Scenario: Hook
- **WHEN** `agent_type` vaut `second-opinion`, écrit un fichier ou lance `rm x`
- **THEN** le hook se termine avec le code 2 ; `git log` est permis

### Requirement: Droits des profils du lot 2a
Les entrées de la table du hook pour `acceptance-tester`, `scout` et `second-opinion` SHALL n'accorder ni écriture, ni commande de shell supplémentaire, ni lancement d'agent ou de skill. L'entrée de `second-opinion` existe malgré l'absence de `Bash` dans sa liste `tools` : elle borne un teammate de ce nom lancé avec un autre type d'agent.

#### Scenario: Lancements refusés
- **WHEN** `agent_type` vaut l'un de ces trois profils et lance un agent ou un skill
- **THEN** le hook se termine avec le code 2

### Requirement: Dépendances des profils optionnels
`business-analyst` SHALL exiger le module `openspec`. `compliance-reviewer` SHALL exiger la clé `regulatedDomain`. Un profil dont la dépendance manque MUST faire échouer `scaffold.mjs` (code 1, aucun fichier écrit).

#### Scenario: business-analyst sans openspec
- **WHEN** `profiles` liste `business-analyst` sans le module `openspec`
- **THEN** `scaffold.mjs` s'arrête avec le code 1

#### Scenario: compliance-reviewer sans domaine
- **WHEN** `profiles` liste `compliance-reviewer` sans `regulatedDomain`
- **THEN** `scaffold.mjs` s'arrête avec le code 1 en nommant la clé manquante

### Requirement: Clé regulatedDomain
La configuration SHALL accepter une clé facultative `regulatedDomain`, texte libre posé par la question de phase 0 du module. Après normalisation NFC et retrait des espaces U+0020 de début et de fin, la valeur MUST faire de 1 à 120 points de code, contenir au moins une lettre ou un chiffre et n'avoir que des lettres, marques, chiffres, espaces U+0020 et la ponctuation `,.;:'’()/&_-`.

#### Scenario: Domaine valide
- **WHEN** `regulatedDomain` vaut `RGPD, paiement` avec `compliance-reviewer` listé
- **THEN** le profil est généré et nomme ce domaine

### Requirement: Valeurs refusées de regulatedDomain
Toute autre valeur que celle de l'exigence précédente (non-texte, `false`, liste, nombre) MUST faire échouer `scaffold.mjs` (code 1, aucun fichier écrit), de même que la clé donnée sans le module `agent-profiles`.

#### Scenario: Valeur refusée
- **WHEN** `regulatedDomain` est vide, faite d'espaces ou de ponctuation seule, dépasse 120 points de code, contient un retour à la ligne, une tabulation, un guillemet droit, une accolade, un accent grave ou `@`, ou n'est pas un texte
- **THEN** `scaffold.mjs` s'arrête avec le code 1 sans écrire de fichier

#### Scenario: Clé sans le module
- **WHEN** `regulatedDomain` est donnée sans le module `agent-profiles`
- **THEN** `scaffold.mjs` s'arrête avec le code 1

### Requirement: Emploi de regulatedDomain
Le texte de `regulatedDomain` SHALL être injecté uniquement dans le corps du modèle de `compliance-reviewer`, jamais dans un frontmatter ni dans un autre fichier généré. Le plugin MUST NOT en déduire d'exigence. Le texte est visible dans le dépôt (modèle du profil et manifeste).

#### Scenario: Emplacement
- **WHEN** `compliance-reviewer` est généré avec un domaine
- **THEN** le domaine figure dans le corps du profil, pas dans son frontmatter, et dans aucun autre fichier hors manifeste

### Requirement: Traitement de la réponse sur le domaine par le skill
`SKILL.md` SHALL demander de poser la question du domaine réglementé en phase 0 quand `compliance-reviewer` est choisi, de prévenir que le texte est visible dans le dépôt, et de reporter la valeur dans `bootstrap.json` (`regulatedDomain`). Il SHALL demander de ne pas proposer `compliance-reviewer` quand le projet ne déclare aucun domaine.

#### Scenario: Profil sans domaine
- **WHEN** l'utilisateur choisit `compliance-reviewer` sans domaine
- **THEN** le skill demande le domaine avant de lancer le générateur

### Requirement: Désactivation et héritage de regulatedDomain
`regulatedDomain: null` SHALL désactiver la clé : elle n'est ni héritée du manifeste ni consignée. Sans cette valeur, `--update` SHALL conserver la clé du manifeste. Retirer la clé alors que le manifeste liste `compliance-reviewer` MUST faire échouer `scaffold.mjs`.

#### Scenario: Héritage
- **WHEN** `--update` est lancé sans `regulatedDomain` sur un projet dont le manifeste la consigne
- **THEN** la valeur est conservée et le profil reste généré

#### Scenario: Désactivation avec le profil hérité
- **WHEN** `--update` est lancé avec `regulatedDomain: null` alors que `compliance-reviewer` est hérité
- **THEN** `scaffold.mjs` s'arrête avec le code 1

#### Scenario: Désactivation sans le profil
- **WHEN** `--update` est lancé avec `regulatedDomain: null` sans `compliance-reviewer`
- **THEN** la clé quitte le manifeste

#### Scenario: Retrait du module
- **WHEN** `--update` retire `agent-profiles` avec `profiles: []` alors que `regulatedDomain` est héritée
- **THEN** `scaffold.mjs` s'arrête avec le code 1 tant que `regulatedDomain: null` n'est pas aussi passé

#### Scenario: Reprise
- **WHEN** une génération est interrompue puis reprise après une réponse sur `regulatedDomain`
- **THEN** l'état de reprise conserve la valeur

### Requirement: Clé regulatedDomain sans profil
Quand `regulatedDomain` est présente sans `compliance-reviewer` dans `profiles`, la clé SHALL n'avoir aucun effet et le rapport de `scaffold.mjs` SHALL porter un avertissement.

#### Scenario: Avertissement
- **WHEN** `regulatedDomain` vaut `RGPD` et `profiles` ne liste pas `compliance-reviewer`
- **THEN** aucun fichier de `compliance-reviewer` n'est généré et le rapport porte l'avertissement

### Requirement: Profil compliance-reviewer
`compliance-reviewer` SHALL relire les specs et les ADR face aux exigences du domaine déclaré, citer pour chaque constat la source (document et passage), distinguer l'exigence connue de l'hypothèse, et rappeler qu'il ne remplace pas un juriste. Il MUST NOT écrire de fichier : la table du hook lui refuse l'écriture et limite son shell à la lecture.

#### Scenario: Lecture seule
- **WHEN** `agent_type` vaut `compliance-reviewer`, écrit un fichier ou lance `rm x`
- **THEN** le hook se termine avec le code 2 ; `git log` est permis

#### Scenario: Modèle du profil
- **WHEN** `compliance-reviewer` est généré avec `regulatedDomain` valant `RGPD`
- **THEN** son modèle nomme `RGPD`, demande une source par constat et rappelle qu'il ne remplace pas un juriste

#### Scenario: Modules absents
- **WHEN** `compliance-reviewer` est généré sans les modules `openspec` et `archgate`
- **THEN** son modèle ne mentionne ni `openspec` ni `archgate` et cite les documents du dépôt

### Requirement: Profil devops-engineer
`devops-engineer` SHALL lire l'état de la CI, des PR et des releases, et rendre des constats avec preuves ; la traçabilité issue, changement, PR et ADR reste à `qa-engineer`. Il MUST NOT écrire de fichier ni publier : les écritures passent par `project-lead`. La table du hook lui refuse l'écriture et limite son shell à la lecture.

#### Scenario: Lecture seule
- **WHEN** `agent_type` vaut `devops-engineer`, écrit un fichier ou lance `rm x`
- **THEN** le hook se termine avec le code 2 ; `gh pr checks 3` et `git log` sont permis

#### Scenario: Modules absents
- **WHEN** `devops-engineer` est généré sans les modules `github`, `release`, `openspec` et `archgate`
- **THEN** son modèle ne mentionne ni `gh`, ni release-please, ni `openspec`, ni `archgate`

### Requirement: Outils et droits des profils du lot 2b
`devops-engineer` et `compliance-reviewer` SHALL déclarer `Read, Glob, Grep, Bash` sans `Write`, `Edit`, `Agent` ni `Skill`. Leurs entrées de la table du hook SHALL n'accorder ni écriture, ni commande supplémentaire, ni lancement d'agent ou de skill.

#### Scenario: Lancements refusés
- **WHEN** `agent_type` vaut l'un de ces deux profils et lance un agent ou un skill
- **THEN** le hook se termine avec le code 2

### Requirement: Délégation de project-lead aux profils du lot 2b
La consigne de `project-lead` SHALL déléguer la lecture de la CI et de la livraison à `devops-engineer` et la relecture réglementaire à `compliance-reviewer`, seulement si ces profils existent dans `.claude/agents/`, et garder la traçabilité à `qa-engineer`.

#### Scenario: Consigne de délégation
- **WHEN** `project-lead` est généré
- **THEN** sa consigne cite les deux profils conditionnés à leur présence dans `.claude/agents/`

### Requirement: Exécution du parcours OpenSpec
Avec `agent-profiles`, `project-lead.md` SHALL déléguer `/opsx:apply` à `developer`, qui lance le skill d'apply, et lancer lui-même `openspec archive <id> --yes` à l'archivage, les specs vivantes étant interdites à `developer`. Il SHALL dire qu'aucun profil n'écrit les fichiers de gouvernance en tâche courante (l'utilisateur les modifie, ou une session sans `mainAgent`) et de lancer `developer` sans isolation en worktree.

#### Scenario: Apply et archivage
- **WHEN** `project-lead.md` est généré avec `openspec`
- **THEN** il confie `/opsx:apply` à `developer`, dit que celui-ci lance le skill, et cite `openspec archive <id> --yes` lancé par lui

#### Scenario: Gouvernance et worktree
- **WHEN** `project-lead.md` est généré
- **THEN** il cite les fichiers de gouvernance à faire modifier par l'utilisateur et l'absence d'isolation en worktree pour `developer`

### Requirement: Bornage de project-lead
La table `PROFILES` SHALL contenir `project-lead` : aucune écriture (`write` vide), shell limité à la lecture seule de `read-only-bash.mjs` et aux commandes de pilotage, agents limités aux profils de la table autres que lui-même, outils MCP classés, skills sans liste (`skillsOpen`). Un refus du shell SHALL inviter à déléguer à `developer` ou à demander à l'utilisateur.

#### Scenario: Entrée de table
- **WHEN** la table du hook est lue
- **THEN** elle contient `project-lead` avec `write` vide, `skillsOpen`, `namedAgents` sans `second-opinion` et une liste `agents` qui ne contient ni `project-lead` ni `general-purpose`

#### Scenario: Écriture refusée
- **WHEN** `agent_type` vaut `project-lead` et l'outil est `Write`, `Edit`, `MultiEdit` ou `NotebookEdit`, quel que soit le chemin
- **THEN** le hook se termine avec le code 2

#### Scenario: Écriture par le shell
- **WHEN** `project-lead` lance `rm x`, `Set-Content x y`, `git commit -m x` ou `git push`
- **THEN** le hook se termine avec le code 2 et le message invite à déléguer à `developer`

### Requirement: Commandes de pilotage de project-lead
`project-lead` SHALL pouvoir lancer, en plus de la lecture seule : `openspec archive <id> --yes`, `node .claude/hooks/quality-gate.mjs`, `node .bootstrap/run-checks.mjs`, `archgate review-context` avec les options de `qa-engineer`, `archgate session-context` avec `--max-entries <n>`, et `gh issue` ou `gh pr` avec `create`, `comment`, `edit`, `close`, `reopen`, `merge` ou `ready`.

#### Scenario: Pilotage permis
- **WHEN** `project-lead` lance `openspec archive 141-x --yes`, `gh pr merge 5 --squash`, `gh issue create --title "Titre simple" --body-file corps.md` ou `archgate session-context --max-entries 5`
- **THEN** le hook se termine avec le code 0

#### Scenario: Autre commande
- **WHEN** `project-lead` lance `gh api repos/x`, `gh release create v1` ou `openspec archive x`
- **THEN** le hook se termine avec le code 2

### Requirement: Refus dans les commandes gh de project-lead
Dans `gh issue` et `gh pr`, `project-lead` MUST NOT utiliser `--admin`, `--web`, `--repo`, `--delete-last`, `--body`, `--editor`, ni les options courtes `-w`, `-R`, `-b`, `-e` seules ou groupées. Une chaîne entre guillemets droits (lettres, chiffres, espaces, `,.:'’()_/#-`) n'est admise que comme valeur de `--title`, `-t` ou `--subject`. `--body-file` et `-F` n'admettent qu'un chemin relatif sans `..`. Chaînage, redirection et substitution sont refusés.

#### Scenario: Options refusées
- **WHEN** `project-lead` lance `gh pr merge 5 --admin`, `gh pr merge 5 --admin=true`, `gh pr create -dw`, `gh issue create --body "x"` ou `gh issue comment 5 --repo a/b`
- **THEN** le hook se termine avec le code 2

#### Scenario: Injection par une chaîne ou un chemin
- **WHEN** `project-lead` lance `gh issue create --title "a $(rm x)"`, un titre avec accent grave ou saut de ligne, `gh pr merge 5 --squash; Remove-Item x`, `gh issue create --body-file ../x` ou `gh issue create --body-file ~/.env`
- **THEN** le hook se termine avec le code 2

### Requirement: Classement des outils MCP
Pour un outil `mcp__<serveur>__<outil>` (partie finale prise après le dernier `__`), `profile-guard.mjs` SHALL refuser (code 2) un profil de la table, sauf si la partie finale, non vide, commence par `get`, `list`, `search`, `read`, `find`, `fetch`, `view`, `describe`, `show` ou `check` suivi de `_` ou de la fin, ou finit par `_read`, `_get`, `_list` ou `_search`, et ne contient aucun mot de `WRITE_WORDS` (`create`, `update`, `run`, `query`…).

#### Scenario: Outil de lecture
- **WHEN** `project-lead` appelle `mcp__plugin_github_github__get_file_contents`, `mcp__plugin_github_github__issue_read`, `mcp__plugin_github_github__list_issues` ou `mcp__claude_ai_Claude_Docs__read`
- **THEN** le hook se termine avec le code 0

#### Scenario: Outil d'écriture
- **WHEN** `project-lead` appelle `mcp__plugin_github_github__issue_write`, `mcp__plugin_github_github__merge_pull_request` ou `mcp__claude-in-chrome__navigate`
- **THEN** le hook se termine avec le code 2

#### Scenario: Préfixe ou suffixe de lecture trompeur
- **WHEN** `project-lead` appelle `mcp__plugin_github_github__mark_all_notifications_read`, `mcp__docs__find_and_replace`, `mcp__x__get_or_create_label`, `mcp__sql__run_query`, `mcp__x__getaway_x` ou `mcp__x__checkout_branch`
- **THEN** le hook se termine avec le code 2

#### Scenario: Nom mal formé
- **WHEN** `project-lead` appelle `mcp__x__`, `mcp__x` ou `mcp__x__list__create_item`
- **THEN** le hook se termine avec le code 2

#### Scenario: Agent hors de la table
- **WHEN** un agent absent de la table ou sans `agent_type` appelle `mcp__plugin_github_github__issue_write`
- **THEN** le hook se termine avec le code 0

### Requirement: Liste mcpAllow et message de refus
L'entrée d'un profil de la table SHALL pouvoir porter `mcpAllow`, liste de noms complets d'outils MCP permis, vide par défaut et propre à chaque entrée. Le refus d'un outil MCP SHALL nommer l'outil, citer `mcpAllow` et l'utilisateur, et citer `gh issue` et `gh pr` quand le nom de l'outil contient `github`.

#### Scenario: Outil autorisé par mcpAllow
- **WHEN** l'entrée de `project-lead` porte `mcpAllow: ["mcp__serveur__publish"]` et qu'il appelle cet outil
- **THEN** le hook se termine avec le code 0, et le même appel d'un autre profil de la table reste refusé

#### Scenario: Message d'orientation
- **WHEN** `project-lead` appelle `mcp__plugin_github_github__issue_write`
- **THEN** le hook se termine avec le code 2 et le message nomme l'outil, `mcpAllow`, l'utilisateur et `gh issue`

### Requirement: Skills à contexte isolé
Pour l'outil `Skill`, `profile-guard.mjs` SHALL refuser (code 2) un profil de la table dont le nom de skill, après retrait des blancs et d'un `/` initial, ne matche pas `^[\w-][\w.-]*(:[\w-][\w.-]*)?$`, ou dont le `SKILL.md` ou la commande déclare `context: fork` dans son en-tête, cherché dans le projet, la configuration de l'utilisateur et les plugins installés. Un skill introuvable est permis ; un fichier présent mais illisible ou une racine du projet inconnue est refusé.

#### Scenario: Skill de projet isolé
- **WHEN** `.claude/skills/forky/SKILL.md` déclare `context: fork` et que `project-lead` lance `forky` ou `/forky`
- **THEN** le hook se termine avec le code 2 et nomme le skill

#### Scenario: Skill ou commande de plugin isolé
- **WHEN** `installed_plugins.json` désigne un plugin `p` dont `skills/forky/SKILL.md` ou `commands/forky.md` déclare `context: fork` et que `project-lead` lance `p:forky`
- **THEN** le hook se termine avec le code 2

#### Scenario: Écritures de l'en-tête
- **WHEN** l'en-tête déclare `context: "fork"`, `context: fork   # isolé`, ou le fichier est en CRLF ou débute par un BOM
- **THEN** le hook se termine avec le code 2

#### Scenario: Profil à liste de skills
- **WHEN** `architect` lance `archgate:adr-author` et que ce skill déclare `context: fork`
- **THEN** le hook se termine avec le code 2

#### Scenario: Skill ordinaire, introuvable ou nom piégé
- **WHEN** `project-lead` lance un skill sans `context: fork` ou introuvable
- **THEN** le hook se termine avec le code 0 ; `../x`, `..` et un nom vide sont refusés avec le code 2
