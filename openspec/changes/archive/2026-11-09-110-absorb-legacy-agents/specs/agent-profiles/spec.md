## MODIFIED Requirements

### Requirement: Réutilisation d'Archgate et d'OpenSpec
Les profils SHALL citer, selon les modules actifs, ce qu'ils réutilisent : le skill `archgate:adr-author` pour `architect`, `archgate review-context --base --run-checks` et le skill `archgate:reviewer` pour `qa-engineer`. Ils lancent eux-mêmes les skills de leur table et demandent le reste à l'agent principal. Ils MUST NOT citer le skill `onboard` ni les agents `architecture-explorer`, `arc42-keeper`, `spec-reviewer` et `traceability-checker`. Une référence à un module absent MUST NOT apparaître.

#### Scenario: Module Archgate absent
- **WHEN** un projet est généré avec `agent-profiles` mais sans `archgate`, `openspec`, `github` ni `arc42`
- **THEN** les profils ne mentionnent aucun de ces modules ni leurs skills

### Requirement: Bornage des agents lançables
Pour les outils `Agent` et `Task`, `profile-guard.mjs` SHALL refuser (code 2) un profil de la table dont le `subagent_type` n'est pas dans sa liste `agents`, dont l'appel porte un `name` ou un `team_name`, ou dont la liste est vide ou absente. Aucun profil ne lance d'agent. Un `subagent_type` absent, vide ou nul vaut `general-purpose` et MUST être refusé.

#### Scenario: Agent permis
- **WHEN** un agent de la table dont la liste `agents` contient `x` lance `x`, y compris par l'outil `Task`
- **THEN** le hook se termine avec le code 0

#### Scenario: Agent non permis
- **WHEN** un profil lance `general-purpose`, un agent d'un plugin, un autre profil, lui-même ou un appel sans `subagent_type`
- **THEN** le hook se termine avec le code 2 et nomme l'agent refusé

#### Scenario: Agent nommé ou d'équipe
- **WHEN** un profil lance un agent avec un `name` ou un `team_name`
- **THEN** le hook se termine avec le code 2

#### Scenario: Architect et qa-engineer
- **WHEN** `architect` ou `qa-engineer` lance un agent, y compris par l'outil `Task`
- **THEN** le hook se termine avec le code 2

#### Scenario: Liste absente
- **WHEN** un agent de la table sans liste `agents` lance n'importe quel agent
- **THEN** le hook se termine avec le code 2

### Requirement: Valeurs de départ par agent
Les valeurs SHALL être, dans l'ordre `model`, `effort`, `maxTurns` : `architect` opus, high, 40 ; `qa-engineer` opus, high, 40 ; `second-opinion` opus, high, 30 ; `compliance-reviewer` opus, high, 30. Les agents sonnet et haiku ont leur exigence propre. Les valeurs SHALL être identiques en français et en anglais.

#### Scenario: Table des valeurs
- **WHEN** les agents sont générés avec `docLanguage: "fr"`
- **THEN** chacun porte le triplet de la table

#### Scenario: Version anglaise
- **WHEN** les agents sont générés avec `docLanguage: "en"`
- **THEN** chacun porte le même triplet

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

### Requirement: Valeurs de départ des agents sonnet et haiku
Les valeurs SHALL être, dans l'ordre `model`, `effort`, `maxTurns` : `developer` sonnet, high, 60 ; `business-analyst` sonnet, high, 40 ; `product-owner` sonnet, medium, 20 ; `acceptance-tester` sonnet, medium, 25 ; `devops-engineer` sonnet, medium, 25 ; `scout` haiku, medium, 20 ; et, sans `agent-profiles`, `arc42-keeper` sonnet, medium, 30 et `traceability-checker` sonnet, medium, 25.

#### Scenario: Table des valeurs sonnet et haiku
- **WHEN** les agents sont générés
- **THEN** chacun de ces agents porte son triplet

### Requirement: Profil devops-engineer
`devops-engineer` SHALL lire l'état de la CI, des PR et des releases, et rendre des constats avec preuves ; la traçabilité issue, changement, PR et ADR reste à `qa-engineer`. Il MUST NOT écrire de fichier ni publier : les écritures passent par `project-lead`. La table du hook lui refuse l'écriture et limite son shell à la lecture.

#### Scenario: Lecture seule
- **WHEN** `agent_type` vaut `devops-engineer`, écrit un fichier ou lance `rm x`
- **THEN** le hook se termine avec le code 2 ; `gh pr checks 3` et `git log` sont permis

#### Scenario: Modules absents
- **WHEN** `devops-engineer` est généré sans les modules `github`, `release`, `openspec` et `archgate`
- **THEN** son modèle ne mentionne ni `gh`, ni release-please, ni `openspec`, ni `archgate`

### Requirement: Délégation de project-lead aux profils du lot 2b
La consigne de `project-lead` SHALL déléguer la lecture de la CI et de la livraison à `devops-engineer` et la relecture réglementaire à `compliance-reviewer`, seulement si ces profils existent dans `.claude/agents/`, et garder la traçabilité à `qa-engineer`.

#### Scenario: Consigne de délégation
- **WHEN** `project-lead` est généré
- **THEN** sa consigne cite les deux profils conditionnés à leur présence dans `.claude/agents/`

## REMOVED Requirements

### Requirement: Bornes propres des agents lançables
**Reason**: Aucun profil ne lance plus d'agent ; la table du hook ne contient plus `arc42-keeper`, `spec-reviewer` ni `architecture-explorer`.
**Migration**: Les méthodes de ces agents sont dans `architect` et `qa-engineer` (capability `legacy-agents`).
