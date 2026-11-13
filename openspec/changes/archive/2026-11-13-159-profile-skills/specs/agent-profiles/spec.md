## MODIFIED Requirements

### Requirement: Outils et frontmatter des profils
Chaque profil borné (`architect`, `qa-engineer`, `developer` et les profils optionnels) SHALL déclarer sa liste `tools` et MUST NOT déclarer de `hooks`. `architect`, `qa-engineer` et `developer` SHALL disposer de `Skill` sans `Agent`, `business-analyst` de `Skill`, les autres sans `Agent` ni `Skill`. `project-lead` MUST NOT déclarer de `tools` ni de `hooks` et SHALL déclarer `disallowedTools` : `Write, Edit, MultiEdit, NotebookEdit`.

#### Scenario: Outils et frontmatter
- **WHEN** les profils sont générés
- **THEN** aucun frontmatter ne contient `hooks`, `architect`, `qa-engineer` et `developer` ont `Skill` sans `Agent`, aucun autre profil borné n'a `Agent`, et `project-lead` n'a pas de ligne `tools` mais refuse `Write`, `Edit`, `MultiEdit` et `NotebookEdit`

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

### Requirement: Exécution du parcours OpenSpec
Avec `agent-profiles`, `project-lead.md` SHALL déléguer `/opsx:apply` à `developer`, qui lance le skill d'apply, et lancer lui-même `openspec archive <id> --yes` à l'archivage, les specs vivantes étant interdites à `developer`. Il SHALL dire qu'aucun profil n'écrit les fichiers de gouvernance en tâche courante (l'utilisateur les modifie, ou une session sans `mainAgent`) et de lancer `developer` sans isolation en worktree.

#### Scenario: Apply et archivage
- **WHEN** `project-lead.md` est généré avec `openspec`
- **THEN** il confie `/opsx:apply` à `developer`, dit que celui-ci lance le skill, et cite `openspec archive <id> --yes` lancé par lui

#### Scenario: Gouvernance et worktree
- **WHEN** `project-lead.md` est généré
- **THEN** il cite les fichiers de gouvernance à faire modifier par l'utilisateur et l'absence d'isolation en worktree pour `developer`
