## MODIFIED Requirements

### Requirement: Consigne d'appel dans les profils sonnet et haiku
Avec la clé `advisor`, chaque profil dont le modèle par défaut est `sonnet` ou `haiku` SHALL contenir la consigne de consulter l'advisor aux points de décision de son rôle, en précisant que le profil décide de l'appeler, que rien ne l'impose, et qu'il poursuit sans lui s'il est indisponible. Les profils `opus` et `project-lead` MUST NOT la contenir.

#### Scenario: Profils concernés
- **WHEN** un projet est généré avec la clé `advisor` et les profils `product-owner` et `business-analyst`
- **THEN** ces deux profils et `developer`, toujours généré, contiennent la consigne

#### Scenario: Profils non concernés
- **WHEN** le même projet est généré
- **THEN** `architect`, `qa-engineer` et `project-lead` ne mentionnent pas l'advisor

#### Scenario: Version anglaise
- **WHEN** un projet est généré avec la clé `advisor` et `docLanguage: "en"`
- **THEN** la consigne des profils et l'étape du Nouveau poste sont rédigées en anglais avec les mêmes contenus

## REMOVED Requirements

### Requirement: Clé sans profil concerné
**Reason**: le module `advisor` exige `agent-profiles`, qui génère toujours `developer` (modèle sonnet) : un profil concerné existe toujours, l'avertissement ne peut plus se produire.
**Migration**: aucune ; le rapport ne porte plus cet avertissement.
