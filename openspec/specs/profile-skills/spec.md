# profile-skills Specification

## Purpose
Porter les méthodes des profils dans quatre skills de projet générées avec agent-profiles (comparaison d'options, mise à jour d'arc42, revue de spec, contrôle de la PR), lancées par architect et qa-engineer.

## Requirements

### Requirement: Skills de projet générées
Avec `agent-profiles`, le module SHALL générer `.claude/skills/<nom>/SKILL.md` pour `adr-options-comparison` avec `archgate`, `arc42-update` avec `arc42`, `spec-review` avec `openspec` et `pr-readiness-review` avec `github`, en français ou en anglais. Sans `agent-profiles`, aucune MUST NOT être générée.

#### Scenario: Tous les modules
- **WHEN** un projet est généré avec `agent-profiles`, `archgate`, `arc42`, `openspec` et `github`
- **THEN** les quatre fichiers `SKILL.md` existent

#### Scenario: Module absent
- **WHEN** un projet est généré avec `agent-profiles` sans `github`
- **THEN** `pr-readiness-review` n'est pas générée et les trois autres le sont selon leurs modules

#### Scenario: Sans agent-profiles
- **WHEN** un projet est généré sans `agent-profiles`
- **THEN** aucune des quatre skills n'est générée

### Requirement: Format des skills
Chaque `SKILL.md` SHALL avoir un frontmatter `name` égal au nom de son dossier et `description` disant quand l'utiliser et quel profil la lance. Il MUST NOT contenir `context`, `hooks`, `allowed-tools` ni de consigne de lancer un agent.

#### Scenario: Frontmatter
- **WHEN** les quatre skills sont générées, en français et en anglais
- **THEN** chacune a `name` égal à son dossier, une `description` qui nomme `architect` ou `qa-engineer`, et ni `context`, ni `hooks`, ni `allowed-tools`, ni `Agent`

### Requirement: Méthodes conservées
`adr-options-comparison` SHALL exiger au moins deux options, des critères, une source par affirmation (« non vérifié » sinon), un tableau critères × options, une recommandation et les questions ouvertes. `arc42-update` SHALL limiter la mise à jour aux sections impactées, résumer avec un lien, laisser la section 9 en pointeur, ne rien inventer et rendre les sections modifiées.

#### Scenario: Skills d'architecture
- **WHEN** `adr-options-comparison` et `arc42-update` sont générées avec leurs modules
- **THEN** chacune contient tous les éléments ci-dessus

### Requirement: Méthodes conservées de qa-engineer
`spec-review` SHALL lire l'issue (avec `github`) et les ADR (avec `archgate`), chercher les exigences non couvertes, les scénarios manquants, les contradictions, le hors-périmètre absent et les tâches non vérifiables, et classer les constats (bloquant, à corriger, suggestion). `pr-readiness-review` SHALL contrôler la chaîne issue, changement, branche, PR, ADR, le modèle de PR et la CI sans commande `gh` qui écrit, et rendre un tableau maillon, statut, correction.

#### Scenario: Skills de qualité
- **WHEN** `spec-review` et `pr-readiness-review` sont générées avec tous les modules
- **THEN** chacune contient tous les éléments ci-dessus et aucune commande `gh` d'écriture

#### Scenario: Exception Dependabot
- **WHEN** `pr-readiness-review` est générée avec `dependabot`
- **THEN** elle indique qu'une branche `dependabot/…` n'a ni issue ni `Closes #N`

### Requirement: Lancement par les profils
Le corps de `architect` SHALL dire de lancer `adr-options-comparison` avant un ADR et `arc42-update` après un ADR accepté ou un changement archivé ; celui de `qa-engineer` `spec-review` avant `/opsx:apply` et `pr-readiness-review` avant le merge. Chaque mention SHALL être conditionnée au module de la skill, et le frontmatter MUST NOT utiliser le champ `skills`.

#### Scenario: Corps des profils
- **WHEN** `architect` et `qa-engineer` sont générés avec tous les modules
- **THEN** chacun cite ses skills et leur moment, sans champ `skills` au frontmatter

#### Scenario: Module absent
- **WHEN** `qa-engineer` est généré sans `openspec`
- **THEN** il ne cite pas `spec-review`

#### Scenario: Changement archivé
- **WHEN** `project-lead.md` est généré avec `arc42`
- **THEN** il demande à `architect` de mettre arc42 à jour après un ADR accepté ou un changement archivé

### Requirement: Workflow généré
Avec `agent-profiles`, `docs/workflow.md` SHALL nommer, aux étapes ADR, changement OpenSpec, exécution, PR et arc42, la skill et le profil qui la lance, contenir une ligne `developer` sans condition de `profiles`, décrire `project-lead` comme orchestrateur et porter la règle « ne produit ni code ni spec » dans sa table des règles doublées.

#### Scenario: Étapes
- **WHEN** un projet est généré avec `agent-profiles` et tous les modules
- **THEN** `docs/workflow.md` cite les quatre skills, une ligne `developer`, `developer` à l'étape d'exécution et `disallowedTools` dans la table des règles doublées

### Requirement: Mise à jour d'un projet existant
`scaffold.mjs --update` sur un projet généré avec `agent-profiles` avant ce changement SHALL ajouter `developer.md` et les skills, fusionner à trois voies les profils modifiés par le projet, conserver un fichier existant hors manifeste, et MUST NOT retirer de fichier d'`agent-profiles`.

#### Scenario: Projet existant
- **WHEN** `--update` est lancé sur un projet généré sans `developer.md` ni skills
- **THEN** ces fichiers sont créés et aucun fichier d'`agent-profiles` n'est signalé dans `retired`

#### Scenario: Profil modifié par le projet
- **WHEN** `architect.md` a été modifié par le projet avant `--update`
- **THEN** la fusion à trois voies conserve la modification ou signale un conflit, sans écraser le fichier

#### Scenario: Fichier hors manifeste
- **WHEN** `.claude/skills/spec-review/SKILL.md` existe déjà hors du manifeste
- **THEN** il est conservé et signalé, pas écrasé

### Requirement: Noms de blocs connus
Un test SHALL refuser, dans les modèles du plugin, un bloc `@@module:` dont aucun nom n'est un module du catalogue ni un pseudo-module.

#### Scenario: Nom inconnu
- **WHEN** un modèle contient `@@module:profile-developer`
- **THEN** le test échoue en nommant le fichier et le bloc

### Requirement: Projets sans agent-profiles inchangés
Sans `agent-profiles`, la génération MUST NOT changer pour les modules existants : les instantanés des combinaisons sans ce module restent identiques.

#### Scenario: Instantanés
- **WHEN** les instantanés sans `agent-profiles` sont régénérés
- **THEN** ils sont identiques aux précédents
