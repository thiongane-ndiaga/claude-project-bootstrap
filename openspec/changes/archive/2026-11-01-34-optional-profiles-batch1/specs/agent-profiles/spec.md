## MODIFIED Requirements

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

### Requirement: Bornage du shell par profil
Pour `Bash` et `PowerShell`, `profile-guard.mjs` SHALL autoriser un profil à exécuter les commandes de lecture seule acceptées par `read-only-bash.mjs` et les commandes supplémentaires que sa table lui accorde, et refuser toute autre commande (code 2), sauf pour `developer`, dont le shell n'est pas borné. Si `read-only-bash.mjs` est absent, la commande d'un profil borné SHALL être refusée.

#### Scenario: Lecture seule
- **WHEN** `agent_type` vaut `qa-engineer` et la commande est `git status`
- **THEN** le hook se termine avec le code 0

#### Scenario: Commande d'écriture
- **WHEN** `agent_type` vaut `architect` et la commande est `cat x` ou `git status && rm -rf x`
- **THEN** le hook se termine avec le code 2

### Requirement: Outils et frontmatter des profils
Chaque profil borné (`architect`, `qa-engineer` et les profils optionnels) SHALL déclarer sa liste `tools` dans son frontmatter et MUST NOT déclarer de `hooks`. `architect` SHALL disposer de `Agent` et `Skill`, `qa-engineer` de `Agent` sans `Skill`, `business-analyst` de `Skill`, `developer` et `product-owner` ni de `Agent` ni de `Skill` ; `product-owner` n'a ni `Write` ni `Edit`. `project-lead`, agent principal, MUST NOT déclarer de `tools` ni de `hooks`.

#### Scenario: Outils et frontmatter
- **WHEN** les profils sont générés
- **THEN** aucun frontmatter ne contient `hooks`, `architect` a `Agent` et `Skill`, `qa-engineer` a `Agent` sans `Skill`, `project-lead` n'a pas de ligne `tools` et aucun profil optionnel n'a `Agent`

## ADDED Requirements

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
