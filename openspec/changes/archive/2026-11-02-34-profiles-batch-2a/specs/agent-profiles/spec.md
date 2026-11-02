## MODIFIED Requirements

### Requirement: Clé profiles
La configuration SHALL accepter une clé facultative `profiles`, liste de noms parmi `acceptance-tester`, `business-analyst`, `developer`, `product-owner`, `scout` et `second-opinion`. Seuls les profils listés SHALL être générés dans `.claude/agents/` ; absente, aucun profil optionnel. Un nom inconnu, une valeur qui n'est pas une liste, ou la clé sans le module `agent-profiles` MUST faire échouer `scaffold.mjs` (code 1, aucun fichier écrit), de même que `business-analyst` sans le module `openspec`.

#### Scenario: Clé absente
- **WHEN** `profiles` est absent
- **THEN** aucun profil optionnel n'est généré et le manifeste ne contient pas `profiles`

#### Scenario: Profils listés
- **WHEN** `profiles` vaut `["product-owner", "developer", "business-analyst", "developer"]`
- **THEN** les trois profils sont générés et le manifeste consigne la liste triée sans doublon

#### Scenario: Nouveaux profils
- **WHEN** `profiles` vaut `["second-opinion", "scout", "acceptance-tester"]`
- **THEN** les trois profils sont générés et le manifeste consigne la liste triée

#### Scenario: Refus
- **WHEN** `profiles` contient un nom inconnu, n'est pas une liste, est donné sans `agent-profiles`, ou liste `business-analyst` sans `openspec`
- **THEN** `scaffold.mjs` s'arrête avec le code 1 sans écrire de fichier

### Requirement: Question de phase 0 sur les profils optionnels
Le module `agent-profiles` SHALL déclarer, en plus de la question sur l'agent principal, une question de phase 0 sur les profils optionnels à générer (clé `profiles`), qui cite les six profils, la dépendance de `business-analyst` à `openspec` et le défaut : aucun.

#### Scenario: Question listée
- **WHEN** `scaffold.mjs --list-modules` est lancé
- **THEN** le module `agent-profiles` porte deux questions, dont une citant `profiles`, les six noms et le défaut aucun

### Requirement: Outils et frontmatter des profils
Chaque profil borné (`architect`, `qa-engineer` et les profils optionnels) SHALL déclarer sa liste `tools` dans son frontmatter et MUST NOT déclarer de `hooks`. `architect` SHALL disposer de `Agent` et `Skill`, `qa-engineer` de `Agent` sans `Skill`, `business-analyst` de `Skill`, `developer`, `product-owner`, `acceptance-tester` et `scout` ni de `Agent` ni de `Skill` ; `product-owner`, `acceptance-tester` et `scout` n'ont ni `Write` ni `Edit` ; `second-opinion` n'a ni `Bash`, ni `Write`, ni `Edit`, ni `Agent`, ni `Skill`. `project-lead`, agent principal, MUST NOT déclarer de `tools` ni de `hooks`.

#### Scenario: Outils et frontmatter
- **WHEN** les profils sont générés
- **THEN** aucun frontmatter ne contient `hooks`, `architect` a `Agent` et `Skill`, `qa-engineer` a `Agent` sans `Skill`, `project-lead` n'a pas de ligne `tools` et aucun profil optionnel n'a `Agent`

#### Scenario: Profils en lecture seule
- **WHEN** `acceptance-tester`, `scout` et `second-opinion` sont générés
- **THEN** `acceptance-tester` et `scout` ont `Read, Glob, Grep, Bash`, `second-opinion` a `Read, Glob, Grep, WebSearch, WebFetch`, et aucun n'a `Write`, `Edit`, `Agent` ni `Skill`

### Requirement: Profil project-lead
`project-lead.md` SHALL contenir la consigne de délégation (`architect`, `qa-engineer`, puis `developer` et `business-analyst` seulement s'ils existent dans `.claude/agents/`, sinon le chef de projet écrit lui-même le code et les specs), le brief borné (objectif, fichiers de référence, critères de fin, contraintes, non-objectifs), l'échelle d'arbitrage à cinq niveaux et la règle « qui écrit ne relit pas ». Pour `acceptance-tester`, `scout` et `second-opinion`, la consigne SHALL déléguer la recette après la relecture de `qa-engineer`, l'exploration factuelle et le contre-avis des niveaux 3 et 4 de l'échelle, seulement si ces profils existent dans `.claude/agents/`, et SHALL demander un brief neutre pour `second-opinion`.

#### Scenario: Contenu de la définition
- **WHEN** `project-lead.md` est généré
- **THEN** il contient les sections de délégation, de brief borné et d'échelle à cinq niveaux, et la règle de relecture

#### Scenario: Profils du lot 2a
- **WHEN** `project-lead.md` est généré
- **THEN** sa consigne cite `acceptance-tester`, `scout` et `second-opinion` conditionnés à leur présence dans `.claude/agents/`, et la neutralité du brief de `second-opinion`

### Requirement: Modèle, effort et tours maximum des agents
Chaque agent généré qui déclare une liste `tools` SHALL déclarer `model`, `effort` et `maxTurns`. `project-lead`, agent principal, MUST NOT déclarer ces champs : il suit la session.

#### Scenario: Valeurs déclarées
- **WHEN** tous les modules et les profils optionnels sont générés
- **THEN** chaque agent à liste `tools` (les profils, `arc42-keeper`, `spec-reviewer`, `architecture-explorer` et `traceability-checker`) déclare `model`, `effort` et `maxTurns`

#### Scenario: Agent principal
- **WHEN** `project-lead` est généré
- **THEN** son frontmatter ne contient ni `model`, ni `effort`, ni `maxTurns`

### Requirement: Valeurs de départ par agent
Les valeurs SHALL être, dans l'ordre `model`, `effort`, `maxTurns` : `architect` opus, high, 40 ; `qa-engineer` opus, high, 40 ; `spec-reviewer` opus, high, 30 ; `architecture-explorer` opus, high, 40 ; `second-opinion` opus, high, 30 ; `developer` sonnet, high, 60 ; `business-analyst` sonnet, high, 40 ; `product-owner` sonnet, medium, 20 ; `acceptance-tester` sonnet, medium, 25 ; `arc42-keeper` sonnet, medium, 30 ; `traceability-checker` sonnet, medium, 25 ; `scout` haiku, medium, 20. Elles SHALL être identiques en français et en anglais.

#### Scenario: Table des valeurs
- **WHEN** les agents sont générés avec `docLanguage: "fr"`
- **THEN** chacun porte le triplet de la table

#### Scenario: Version anglaise
- **WHEN** les agents sont générés avec `docLanguage: "en"`
- **THEN** chacun porte le même triplet

### Requirement: Cohérence avec la consigne de l'advisor
La règle de présence de la consigne de l'advisor SHALL continuer de se fonder sur `model:` : le bloc reste présent exactement dans les profils du module `agent-profiles` dont le modèle est de la famille `sonnet` ou `haiku`.

#### Scenario: Valeurs de départ
- **WHEN** les agents sont générés avec la clé `advisor` et tous les profils optionnels
- **THEN** la consigne figure dans `product-owner`, `developer`, `business-analyst`, `acceptance-tester` et `scout`, et dans aucun autre agent

## ADDED Requirements

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
