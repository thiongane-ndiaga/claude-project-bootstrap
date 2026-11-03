## MODIFIED Requirements

### Requirement: Consigne d'appel dans les profils sonnet et haiku
Avec la clé `advisor`, chaque profil dont le modèle par défaut est `sonnet` ou `haiku` SHALL contenir la consigne de consulter l'advisor aux points de décision de son rôle, en précisant que le profil décide de l'appeler, que rien ne l'impose, et qu'il poursuit sans lui s'il est indisponible. Les profils `opus` et `project-lead` MUST NOT la contenir.

#### Scenario: Profils concernés
- **WHEN** un projet est généré avec la clé `advisor` et les profils `product-owner`, `developer` et `business-analyst`
- **THEN** ces trois profils contiennent la consigne

#### Scenario: Profils non concernés
- **WHEN** le même projet est généré
- **THEN** `architect`, `qa-engineer` et `project-lead` ne mentionnent pas l'advisor

#### Scenario: Version anglaise
- **WHEN** un projet est généré avec la clé `advisor` et `docLanguage: "en"`
- **THEN** la consigne des profils et l'étape du Nouveau poste sont rédigées en anglais avec les mêmes contenus

### Requirement: Clé sans profil concerné
Quand la clé `advisor` vaut `true` sans profil de la famille sonnet ou haiku choisi (`product-owner`, `developer`, `business-analyst`, `acceptance-tester`, `devops-engineer`, `scout`), `scaffold.mjs` SHALL porter un avertissement dans le rapport : aucun profil sonnet ou haiku ne reçoit la consigne et seule l'étape du « Nouveau poste » est générée.

#### Scenario: Aucun profil optionnel
- **WHEN** `advisor` vaut `true` sans `profiles`
- **THEN** le rapport porte l'avertissement et `docs/workflow.md` contient l'étape

#### Scenario: Seul second-opinion
- **WHEN** `advisor` vaut `true` avec `profiles` valant `["second-opinion"]`
- **THEN** le rapport porte l'avertissement

#### Scenario: Profils opus seulement
- **WHEN** `advisor` vaut `true` avec `profiles` valant `["compliance-reviewer"]` et un domaine déclaré
- **THEN** le rapport porte l'avertissement

#### Scenario: Profils choisis
- **WHEN** `advisor` vaut `true` avec `profiles` contenant au moins un des six profils sonnet ou haiku
- **THEN** le rapport ne porte pas cet avertissement
