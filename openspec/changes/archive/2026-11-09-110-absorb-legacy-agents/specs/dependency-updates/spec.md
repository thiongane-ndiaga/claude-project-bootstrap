## MODIFIED Requirements

### Requirement: Exception de traçabilité des PR de Dependabot
Quand le module `dependabot` est choisi, `docs/workflow.md`, l'ADR de conventions (ARCH-005) et l'agent qui contrôle la traçabilité (`traceability-checker`, ou `qa-engineer` avec `agent-profiles`) générés SHALL indiquer que les PR de Dependabot (branche `dependabot/…`, titre `ci(deps): …`) n'ont ni branche `<type>/<issue>-<slug>` ni `Closes #N`.

#### Scenario: Module choisi
- **WHEN** un projet est généré avec les modules `github`, `claude`, `archgate` et `dependabot`
- **THEN** ces trois fichiers mentionnent l'exception

#### Scenario: Module choisi avec agent-profiles
- **WHEN** un projet est généré avec ces modules et `agent-profiles`
- **THEN** `docs/workflow.md`, ARCH-005 et `qa-engineer.md` mentionnent l'exception

#### Scenario: Module absent
- **WHEN** le module `dependabot` n'est pas choisi
- **THEN** aucun de ces fichiers ne mentionne Dependabot
