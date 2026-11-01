## ADDED Requirements

### Requirement: Question de phase 0 sur l'agent principal
Le module `agent-profiles` SHALL déclarer dans `module.json` une question de phase 0 demandant si `project-lead` devient l'agent principal des sessions du projet, en indiquant que le choix s'applique à toutes les sessions du clone et que la réponse par défaut est non. `scaffold.mjs --list-modules` MUST la lister avec le module.

#### Scenario: Question listée
- **WHEN** `scaffold.mjs --list-modules` est lancé
- **THEN** le module `agent-profiles` porte une question qui cite `mainAgent` et le défaut non

### Requirement: Traitement de la réponse par le skill
`SKILL.md` SHALL demander de poser cette question en phase 0 et de reporter une réponse positive dans `bootstrap.json` (`mainAgent: "project-lead"`). Il SHALL demander d'annoncer le choix en phase 1, avant toute écriture, avec les avertissements du dry-run.

#### Scenario: Annonce en phase 1
- **WHEN** l'utilisateur choisit `project-lead` comme agent principal
- **THEN** la phase 1 annonce que toutes les sessions du clone démarreront avec `project-lead` et reporte les avertissements du dry-run
