## ADDED Requirements

### Requirement: Qui fait quoi
Avec le module `agent-profiles`, le `docs/workflow.md` généré SHALL contenir une section « Qui fait quoi » listant chaque agent généré dans `.claude/agents/`, une ligne par agent, avec son rôle dans les étapes et ses droits d'écriture. Un agent généré sans ligne, ou une ligne d'un agent non généré, MUST NOT exister. Sans `agent-profiles`, les agents fixes générés par `claude` ne sont pas documentés.

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

### Requirement: Échelle d'arbitrage et journal des décisions
Avec `agent-profiles`, le document SHALL contenir l'échelle d'arbitrage à cinq niveaux, ses lignes reprises mot pour mot de `project-lead`, et le journal des décisions : un ADR pour le structurant (mention omise sans le module `archgate`), le message de livraison pour le courant. Les deux langues MUST respecter cette égalité avec le `project-lead` de leur langue.

#### Scenario: Échelle identique
- **WHEN** un projet est généré avec `agent-profiles`, en français puis en anglais
- **THEN** les cinq lignes de l'échelle de `workflow.md` égalent celles de `project-lead.md` de la même langue

### Requirement: Table de double encodage
Le document SHALL contenir, dès qu'une règle y figure, une table « Double encodage » : une ligne par puce de la section `## Règles` du `CLAUDE.md` généré, par règle de `project-lead` (« qui écrit ne relit pas ») et par garde-fou de profil, avec le texte de la règle et son garde-fou ou la mention « consigne seulement » (« instruction only » en anglais). Sans règle applicable, la section MUST NOT apparaître.

#### Scenario: Règle sans garde-fou
- **WHEN** `archgate` est sélectionné sans `agent-profiles`
- **THEN** la ligne de la règle sur `rules.d.ts` porte « consigne seulement » et ne cite aucun fichier

#### Scenario: Règle bornée pour les profils
- **WHEN** `agent-profiles` est sélectionné
- **THEN** une ligne distincte cite `.claude/hooks/profile-guard.mjs` pour le périmètre d'écriture des profils

#### Scenario: Puce de CLAUDE.md sans ligne
- **WHEN** une puce de `## Règles` du `CLAUDE.md` généré n'a pas de ligne dans la table
- **THEN** le test échoue en nommant la puce

#### Scenario: Module core seul
- **WHEN** seul `core` est sélectionné
- **THEN** le document ne contient pas la section

### Requirement: Fichiers cités par la table de double encodage
Une cellule de garde-fou SHALL nommer ses fichiers par leur chemin complet depuis la racine ; chacun MUST exister dans le projet généré.

#### Scenario: Garde-fou cité
- **WHEN** une ligne cite `scripts/check-pr-title.mjs`
- **THEN** ce fichier existe dans le projet généré

### Requirement: Commandes OpenSpec documentées
Avec le module `openspec`, les étapes du document SHALL décrire `/opsx:explore` (qui, quand, ce qu'il produit), `/opsx:update` (révision des artefacts, jamais du code), `/opsx:sync` et le marqueur `skip_specs: true` de `.openspec.yaml` pour un changement sans comportement.

#### Scenario: Module openspec sélectionné
- **WHEN** un projet est généré avec `openspec`
- **THEN** le document cite `/opsx:explore`, `/opsx:update`, `/opsx:sync` et `skip_specs: true`

#### Scenario: Sans openspec
- **WHEN** `openspec` n'est pas sélectionné
- **THEN** le document ne cite ni `/opsx:explore`, ni `/opsx:update`, ni `/opsx:sync`, ni `skip_specs`
