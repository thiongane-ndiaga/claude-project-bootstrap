# agent-profiles Specification

## Purpose
Définir le module optionnel `agent-profiles` : les profils `architect`, `qa-engineer`, `project-lead` et les profils optionnels choisis par la clé `profiles`, générés dans `.claude/agents/`, et le hook unique `profile-guard.mjs` qui borne leurs écritures et leurs commandes de shell selon `agent_type`, en sous-agent comme en équipe.

## Requirements

### Requirement: Module agent-profiles
Le catalogue SHALL contenir un module `agent-profiles` qui requiert `claude` et vaut `default: false`. Sélectionné, il SHALL générer `.claude/agents/architect.md`, `.claude/agents/qa-engineer.md`, `.claude/agents/project-lead.md`, les profils optionnels choisis par `profiles` et `.claude/hooks/profile-guard.mjs`, en français ou en anglais selon `docLanguage`. Non sélectionné, aucun de ces fichiers ni la déclaration de hook correspondante MUST NOT être généré.

#### Scenario: Module sélectionné
- **WHEN** un projet est généré avec `agent-profiles`
- **THEN** les trois profils et le hook existent et `claude` est présent

#### Scenario: Module absent
- **WHEN** un projet est généré sans `agent-profiles`
- **THEN** aucun profil, aucun `profile-guard.mjs` et aucun hook `PreToolUse` de bornage ne sont générés

#### Scenario: Langue anglaise
- **WHEN** un projet est généré avec `docLanguage: "en"`
- **THEN** les profils sont rédigés en anglais et ont les mêmes outils que les profils français

### Requirement: Déclaration du hook de bornage
Avec `agent-profiles`, `.claude/settings.json` SHALL déclarer un hook `PreToolUse` de type `command` appelant `profile-guard.mjs` pour les outils `Write`, `Edit`, `MultiEdit`, `NotebookEdit`, `Bash`, `PowerShell`, `Agent`, `Task` (ancien nom de `Agent`) et `Skill`. Il MUST NOT déclarer de réglage `agent` sauf si la clé `mainAgent` est présente. La fusion avec des réglages existants MUST conserver les hooks du projet.

#### Scenario: Déclaration dans settings.json
- **WHEN** `settings.json` est généré avec `agent-profiles` sans `mainAgent`
- **THEN** il contient un hook `PreToolUse` vers `profile-guard.mjs` pour les neuf outils et pas de clé `agent`

#### Scenario: Réglages existants
- **WHEN** `settings.json` contient déjà un hook `PreToolUse` du projet
- **THEN** il subsiste à côté de celui de `profile-guard.mjs`

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
Pour un profil de la table, une entrée incomplète ou une erreur interne du hook (chemin d'écriture absent, racine du projet inconnue, exception) SHALL se terminer avec le code 2 et non avec un code qui laisse l'outil s'exécuter. Une entrée illisible, dont le profil est inconnu, SHALL se terminer avec le code 0.

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
Chaque profil borné (`architect`, `qa-engineer` et les profils optionnels) SHALL déclarer sa liste `tools` dans son frontmatter et MUST NOT déclarer de `hooks`. `architect` SHALL disposer de `Agent` et `Skill`, `qa-engineer` de `Agent` sans `Skill`, `business-analyst` de `Skill`, `developer` et `product-owner` ni de `Agent` ni de `Skill` ; `product-owner` n'a ni `Write` ni `Edit`. `project-lead`, agent principal, MUST NOT déclarer de `tools` ni de `hooks`.

#### Scenario: Outils et frontmatter
- **WHEN** les profils sont générés
- **THEN** aucun frontmatter ne contient `hooks`, `architect` a `Agent` et `Skill`, `qa-engineer` a `Agent` sans `Skill`, `project-lead` n'a pas de ligne `tools` et aucun profil optionnel n'a `Agent`

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

### Requirement: Profil project-lead
`project-lead.md` SHALL contenir la consigne de délégation (`architect`, `qa-engineer`, puis `developer` et `business-analyst` seulement s'ils existent dans `.claude/agents/`, sinon le chef de projet écrit lui-même le code et les specs), le brief borné (objectif, fichiers de référence, critères de fin, contraintes, non-objectifs), l'échelle d'arbitrage à cinq niveaux et la règle « qui écrit ne relit pas ».

#### Scenario: Contenu de la définition
- **WHEN** `project-lead.md` est généré
- **THEN** il contient les sections de délégation, de brief borné et d'échelle à cinq niveaux, et la règle de relecture

### Requirement: Garde-fous de project-lead
`project-lead.md` SHALL exiger l'accord de l'utilisateur pour toute écriture visible à l'extérieur (niveau 5 de l'échelle) et porter lui-même l'échelle d'arbitrage et la répartition des rôles, pour qu'ils survivent à la compaction ; et `project-lead` MUST NOT figurer dans la table `PROFILES` du hook : l'agent principal reste sous le contrôle de l'utilisateur et ses garde-fous sont des consignes de son prompt.

#### Scenario: Pas de bornage de l'agent principal
- **WHEN** la table du hook est lue
- **THEN** elle ne contient pas `project-lead`

#### Scenario: Écritures visibles
- **WHEN** un projet est généré avec `github`
- **THEN** `project-lead.md` demande l'accord de l'utilisateur pour `gh issue create`, `gh pr create`, `gh pr merge` et les releases

### Requirement: Parcours de project-lead selon les modules
Les blocs de `project-lead.md` qui citent `archgate`, `archgate-plugin`, `openspec` ou `github` SHALL n'apparaître que si ces modules sont actifs. Avec `openspec`, il SHALL décrire `/opsx:explore` (mené en dialogue, sans décision ni code), `/opsx:update` et la lecture de l'avancement par `openspec status --json` et `list --json`. Avec `archgate`, il SHALL joindre les briefings d'ADR au brief et traiter les ADR comme des bloquants.

#### Scenario: Modules absents
- **WHEN** un projet est généré avec `agent-profiles` sans `archgate`, `openspec`, `github` ni `arc42`
- **THEN** `project-lead.md` ne mentionne aucun de ces modules ni leurs commandes

#### Scenario: Modules présents
- **WHEN** un projet est généré avec `openspec` et `archgate`
- **THEN** `project-lead.md` décrit `/opsx:explore`, `/opsx:update`, `openspec status --json` et les briefings d'ADR

### Requirement: Lancements demandés par les profils
Avec `archgate-plugin`, `project-lead` SHALL lancer `archgate:lessons-learned` en fin de tâche et `archgate:reviewer` quand `qa-engineer` le demande, et confier à `architect` les ADR qui en ressortent. Il SHALL traiter les demandes de lancement (agent, skill) que les profils lui adressent, en les lançant ou en refusant explicitement.

#### Scenario: Skills d'Archgate
- **WHEN** un projet est généré avec `archgate-plugin`
- **THEN** `project-lead.md` demande de lancer `archgate:lessons-learned` et `archgate:reviewer`

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
La configuration SHALL accepter une clé facultative `profiles`, liste de noms parmi `business-analyst`, `developer` et `product-owner`. Seuls les profils listés SHALL être générés dans `.claude/agents/` ; absente, aucun profil optionnel. Un nom inconnu, une valeur qui n'est pas une liste, ou la clé sans le module `agent-profiles` MUST faire échouer `scaffold.mjs` (code 1, aucun fichier écrit), de même que `business-analyst` sans le module `openspec`.

#### Scenario: Clé absente
- **WHEN** `profiles` est absent
- **THEN** aucun profil optionnel n'est généré et le manifeste ne contient pas `profiles`

#### Scenario: Profils listés
- **WHEN** `profiles` vaut `["product-owner", "developer", "business-analyst", "developer"]`
- **THEN** les trois profils sont générés et le manifeste consigne la liste triée sans doublon

#### Scenario: Refus
- **WHEN** `profiles` contient un nom inconnu, n'est pas une liste, est donné sans `agent-profiles`, ou liste `business-analyst` sans `openspec`
- **THEN** `scaffold.mjs` s'arrête avec le code 1 sans écrire de fichier

### Requirement: Désactivation et héritage de profiles
`profiles: []` ou `profiles: null` SHALL désactiver la clé : elle n'est ni héritée du manifeste ni consignée. Les fichiers des profils qui ne sont plus produits sont signalés dans `retired` et retirés du manifeste, mais laissés sur le disque. `--update` sans `profiles` dans la configuration SHALL conserver la liste du manifeste.

#### Scenario: Héritage
- **WHEN** `--update` est lancé sans `profiles` sur un projet dont le manifeste consigne la liste
- **THEN** la liste est conservée

#### Scenario: Désactivation
- **WHEN** `--update` est lancé avec `profiles: []` ou `profiles: null`
- **THEN** le manifeste ne consigne plus `profiles`, les trois fichiers sont signalés dans `retired` et restent sur le disque

#### Scenario: Retrait d'une dépendance hérite d'une liste
- **WHEN** `--update` retire `openspec` ou `agent-profiles` alors que le manifeste consigne `business-analyst` ou `profiles` sans `profiles: []`
- **THEN** `scaffold.mjs` s'arrête avec le code 1

### Requirement: Profil product-owner
`product-owner` SHALL structurer le besoin (qui, quoi, pourquoi, valeur), rendre un brouillon d'issue avec des critères d'acceptation vérifiables, contester la couverture du besoin par les specs, et remonter les décisions d'architecture et de périmètre au chef de projet. Il MUST NOT écrire de fichier : la table du hook lui refuse l'écriture et limite son shell à la lecture.

#### Scenario: Lecture seule
- **WHEN** `agent_type` vaut `product-owner`, écrit un fichier ou lance `rm x`
- **THEN** le hook se termine avec le code 2 ; `git log` et `gh issue view` sont permis

### Requirement: Profil developer
`developer` SHALL implémenter le brief, faire un commit atomique par tâche, lancer les tests du projet, ne rien publier (push, issue, PR, release) et rendre un travail relu par `qa-engineer`. Son shell n'est pas borné et il MUST NOT disposer des outils `Agent` ni `Skill`.

#### Scenario: Profil généré
- **WHEN** `developer` est généré
- **THEN** son frontmatter n'a ni `Agent` ni `Skill` et le profil dit que `qa-engineer` relit son travail et que rien n'est publié par lui

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
Le module `agent-profiles` SHALL déclarer, en plus de la question sur l'agent principal, une question de phase 0 sur les profils optionnels à générer (clé `profiles`), qui cite les trois profils, la dépendance de `business-analyst` à `openspec` et le défaut : aucun.

#### Scenario: Question listée
- **WHEN** `scaffold.mjs --list-modules` est lancé
- **THEN** le module `agent-profiles` porte deux questions, dont une citant `profiles` et le défaut aucun

### Requirement: Traitement de la réponse sur les profils par le skill
`SKILL.md` SHALL demander de poser la question sur les profils en phase 0, d'expliquer le rôle de chaque profil (dont le shell non borné de `developer`) et de reporter la liste choisie dans `bootstrap.json` (`profiles`). Il SHALL demander d'annoncer en phase 1 les profils choisis et l'absence de bornage du shell de `developer`.

#### Scenario: Annonce en phase 1
- **WHEN** l'utilisateur choisit `developer`
- **THEN** la phase 1 annonce les profils générés et que le shell de `developer` n'est pas borné
