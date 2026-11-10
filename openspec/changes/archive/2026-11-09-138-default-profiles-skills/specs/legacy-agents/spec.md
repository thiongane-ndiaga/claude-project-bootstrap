## MODIFIED Requirements

### Requirement: Méthodes absorbées par architect
Avec `agent-profiles`, la méthode de comparaison d'options et les règles de mise à jour d'arc42 SHALL vivre dans les skills `adr-options-comparison` (module `archgate`) et `arc42-update` (module `arc42`), que `architect` cite. `architect` MUST NOT citer `architecture-explorer` ni `arc42-keeper`.

#### Scenario: Profil architect
- **WHEN** `architect` est généré avec `archgate` et `arc42`
- **THEN** il cite les skills `adr-options-comparison` et `arc42-update` et aucun des deux anciens noms

#### Scenario: Module arc42 absent
- **WHEN** `architect` est généré sans `arc42`
- **THEN** il ne mentionne ni arc42 ni `arc42-update`

### Requirement: Méthodes absorbées par qa-engineer
Avec `agent-profiles`, la revue de spec et le contrôle de la PR avant le merge SHALL vivre dans les skills `spec-review` (module `openspec`) et `pr-readiness-review` (module `github`), que `qa-engineer` cite ; les mentions d'ADR, d'arc42 et de Dependabot SHALL être conditionnées à leurs modules. `qa-engineer` MUST NOT citer `spec-reviewer` ni `traceability-checker`.

#### Scenario: Profil qa-engineer
- **WHEN** `qa-engineer` est généré avec `openspec` et `github`
- **THEN** il cite les skills `spec-review` et `pr-readiness-review` et aucun des deux anciens noms

#### Scenario: Exception Dependabot
- **WHEN** `pr-readiness-review` est généré avec `dependabot`
- **THEN** elle indique que les PR de Dependabot n'ont ni branche `<type>/<issue>-<slug>` ni `Closes #N`

### Requirement: Outils de architect et qa-engineer
`architect` et `qa-engineer` MUST NOT déclarer l'outil `Agent` dans leur frontmatter et MUST NOT contenir de phrase les autorisant à lancer des agents ; ils SHALL déclarer `Skill` pour leurs skills.

#### Scenario: Frontmatter
- **WHEN** `architect` et `qa-engineer` sont générés, en français et en anglais
- **THEN** leur liste `tools` contient `Skill` et ne contient pas `Agent`
