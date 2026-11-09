## MODIFIED Requirements

### Requirement: Garde-fous de project-lead
`project-lead.md` SHALL exiger l'accord de l'utilisateur pour toute écriture visible à l'extérieur (niveau 5 de l'échelle) et porter l'échelle d'arbitrage et la répartition des rôles ; `project-lead` MUST NOT figurer dans la table `PROFILES` du hook : l'agent principal reste sous le contrôle de l'utilisateur et ses garde-fous sont des consignes de son prompt.

#### Scenario: Pas de bornage de l'agent principal
- **WHEN** la table du hook est lue
- **THEN** elle ne contient pas `project-lead`

#### Scenario: Écritures visibles
- **WHEN** un projet est généré avec `github`
- **THEN** `project-lead.md` demande l'accord de l'utilisateur pour `gh issue create`, `gh pr create`, `gh pr merge` et les releases
