## MODIFIED Requirements

### Requirement: Qui fait quoi
Avec le module `agent-profiles`, le `docs/workflow.md` généré SHALL contenir une section « Qui fait quoi » listant chaque agent généré dans `.claude/agents/`, une ligne par agent, avec son rôle dans les étapes et ses droits d'écriture. Un agent généré sans ligne, ou une ligne d'un agent non généré, MUST NOT exister.

#### Scenario: Profil optionnel choisi
- **WHEN** `profiles` contient `scout`
- **THEN** la table contient la ligne de `scout`

#### Scenario: Profil optionnel absent
- **WHEN** `profiles` ne contient pas `scout`
- **THEN** la table ne contient pas de ligne `scout`

#### Scenario: Sans agent-profiles
- **WHEN** le module `agent-profiles` n'est pas sélectionné
- **THEN** le document ne contient ni « Qui fait quoi », ni échelle d'arbitrage, ni journal des décisions

#### Scenario: Agents fixes absents
- **WHEN** `agent-profiles` est sélectionné sans `openspec`, `github`, `arc42` ni `archgate`
- **THEN** la table ne contient aucune ligne de `spec-reviewer`, `traceability-checker`, `arc42-keeper` ni `architecture-explorer`

#### Scenario: Agents historiques absents de la table
- **WHEN** `agent-profiles` est sélectionné avec tous les modules
- **THEN** la table ne contient aucune ligne de `spec-reviewer`, `traceability-checker`, `arc42-keeper` ni `architecture-explorer`, qui ne sont pas générés
