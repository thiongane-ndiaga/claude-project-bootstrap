## MODIFIED Requirements

### Requirement: Clé sans profil concerné
Quand la clé `advisor` vaut `true` sans profil de la famille sonnet ou haiku choisi (`product-owner`, `developer`, `business-analyst`, `acceptance-tester`, `scout`), `scaffold.mjs` SHALL porter un avertissement dans le rapport : aucun profil sonnet ou haiku ne reçoit la consigne et seule l'étape du « Nouveau poste » est générée.

#### Scenario: Aucun profil optionnel
- **WHEN** `advisor` vaut `true` sans `profiles`
- **THEN** le rapport porte l'avertissement et `docs/workflow.md` contient l'étape

#### Scenario: Seul second-opinion
- **WHEN** `advisor` vaut `true` avec `profiles` valant `["second-opinion"]`
- **THEN** le rapport porte l'avertissement

#### Scenario: Profils choisis
- **WHEN** `advisor` vaut `true` avec `profiles` contenant au moins un des cinq profils sonnet ou haiku
- **THEN** le rapport ne porte pas cet avertissement
