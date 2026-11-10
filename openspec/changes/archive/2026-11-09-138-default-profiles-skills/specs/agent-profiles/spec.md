## MODIFIED Requirements

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
`project-lead.md` SHALL exiger l'accord de l'utilisateur pour toute écriture visible à l'extérieur (niveau 5 de l'échelle) et porter l'échelle d'arbitrage et la répartition des rôles ; `project-lead` MUST NOT figurer dans la table `PROFILES` du hook. Ses garde-fous sont des consignes, doublées par `disallowedTools` dont l'effet sur l'agent principal n'est pas vérifié ; `Bash` reste permis.

#### Scenario: Pas de bornage de l'agent principal
- **WHEN** la table du hook est lue
- **THEN** elle ne contient pas `project-lead`

#### Scenario: Écritures visibles
- **WHEN** un projet est généré avec `github`
- **THEN** `project-lead.md` demande l'accord de l'utilisateur pour `gh issue create`, `gh pr create`, `gh pr merge` et les releases

#### Scenario: Limite consignée
- **WHEN** `docs/workflow.md` est généré avec `agent-profiles`
- **THEN** sa table des règles doublées cite `disallowedTools` pour « ne produit ni code ni spec » et dit que l'effet n'est pas vérifié

### Requirement: Outils et frontmatter des profils
Chaque profil borné (`architect`, `qa-engineer`, `developer` et les profils optionnels) SHALL déclarer sa liste `tools` et MUST NOT déclarer de `hooks`. `architect` et `qa-engineer` SHALL disposer de `Skill` sans `Agent`, `business-analyst` de `Skill`, les autres sans `Agent` ni `Skill`. `project-lead` MUST NOT déclarer de `tools` ni de `hooks` et SHALL déclarer `disallowedTools` : `Write, Edit, MultiEdit, NotebookEdit`.

#### Scenario: Outils et frontmatter
- **WHEN** les profils sont générés
- **THEN** aucun frontmatter ne contient `hooks`, `architect` et `qa-engineer` ont `Skill` sans `Agent`, aucun autre profil borné n'a `Agent`, et `project-lead` n'a pas de ligne `tools` mais refuse `Write`, `Edit`, `MultiEdit` et `NotebookEdit`

### Requirement: Bornage des skills
Pour l'outil `Skill`, `profile-guard.mjs` SHALL refuser (code 2) un profil de la table dont le skill n'est pas dans sa liste `skills` (comparaison du nom exact), ou dont la liste est vide ou absente. `architect` peut lancer `archgate:adr-author`, `adr-options-comparison` et `arc42-update` ; `qa-engineer` peut lancer `spec-review` et `pr-readiness-review`, pas `archgate:reviewer`, qui lance des agents `general-purpose`.

#### Scenario: Skill permis
- **WHEN** `architect` lance `archgate:adr-author`, `adr-options-comparison` ou `arc42-update`, ou `qa-engineer` lance `spec-review` ou `pr-readiness-review`
- **THEN** le hook se termine avec le code 0

#### Scenario: Skill non permis
- **WHEN** `qa-engineer` lance `archgate:reviewer`, `arc42-update` ou `/spec-review`, ou `architect` lance `archgate:onboard` ou `spec-review`
- **THEN** le hook se termine avec le code 2

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

### Requirement: Profil developer
`developer` SHALL être généré avec `agent-profiles` sans figurer dans `profiles`. Il SHALL implémenter le brief, faire un commit atomique par tâche, lancer les tests du projet, ne rien publier et rendre un travail relu par `qa-engineer`. Sans `business-analyst`, il SHALL rédiger et réviser le changement OpenSpec dans `openspec/changes/<id>/`. Son shell n'est pas borné et il MUST NOT disposer des outils `Agent` ni `Skill`.

#### Scenario: Profil généré
- **WHEN** `developer` est généré
- **THEN** son frontmatter n'a ni `Agent` ni `Skill` et le profil dit que `qa-engineer` relit son travail et que rien n'est publié par lui

#### Scenario: Profil par défaut
- **WHEN** un projet est généré avec `agent-profiles` sans clé `profiles`
- **THEN** `.claude/agents/developer.md` existe

#### Scenario: Rédaction des specs
- **WHEN** `developer` est généré avec `openspec`
- **THEN** il dit comment créer, rédiger et valider un changement et qu'il n'écrit que dans `openspec/changes/<id>/`

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

## ADDED Requirements

### Requirement: Exécution du parcours OpenSpec
Avec `agent-profiles`, `project-lead.md` SHALL déléguer `/opsx:apply` à `developer` et lancer lui-même `openspec archive <id> --yes` à l'archivage, les specs vivantes étant interdites à `developer`. Il SHALL dire qu'aucun profil n'écrit les fichiers de gouvernance en tâche courante (l'utilisateur les modifie, ou une session sans `mainAgent`) et de lancer `developer` sans isolation en worktree.

#### Scenario: Apply et archivage
- **WHEN** `project-lead.md` est généré avec `openspec`
- **THEN** il confie `/opsx:apply` à `developer` et cite `openspec archive <id> --yes` lancé par lui

#### Scenario: Gouvernance et worktree
- **WHEN** `project-lead.md` est généré
- **THEN** il cite les fichiers de gouvernance à faire modifier par l'utilisateur et l'absence d'isolation en worktree pour `developer`
