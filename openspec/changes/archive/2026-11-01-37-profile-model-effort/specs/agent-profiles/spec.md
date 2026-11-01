## ADDED Requirements

### Requirement: Modèle, effort et tours maximum des agents
Chaque agent généré qui déclare une liste `tools` SHALL déclarer `model`, `effort` et `maxTurns`. `project-lead`, agent principal, MUST NOT déclarer ces champs : il suit la session.

#### Scenario: Valeurs déclarées
- **WHEN** tous les modules et les profils optionnels sont générés
- **THEN** `architect`, `qa-engineer`, `product-owner`, `developer`, `business-analyst`, `arc42-keeper`, `spec-reviewer`, `architecture-explorer` et `traceability-checker` déclarent `model`, `effort` et `maxTurns`

#### Scenario: Agent principal
- **WHEN** `project-lead` est généré
- **THEN** son frontmatter ne contient ni `model`, ni `effort`, ni `maxTurns`

### Requirement: Valeurs de départ par agent
Les valeurs SHALL être, dans l'ordre `model`, `effort`, `maxTurns` : `architect` opus, high, 40 ; `qa-engineer` opus, high, 40 ; `spec-reviewer` opus, high, 30 ; `architecture-explorer` opus, high, 40 ; `developer` sonnet, high, 60 ; `business-analyst` sonnet, high, 40 ; `product-owner` sonnet, medium, 20 ; `arc42-keeper` sonnet, medium, 30 ; `traceability-checker` sonnet, medium, 25. Elles SHALL être identiques en français et en anglais.

#### Scenario: Table des valeurs
- **WHEN** les agents sont générés avec `docLanguage: "fr"`
- **THEN** chacun porte le triplet de la table

#### Scenario: Version anglaise
- **WHEN** les agents sont générés avec `docLanguage: "en"`
- **THEN** chacun porte le même triplet

### Requirement: Valeurs fixes sans clé de configuration
Le générateur SHALL écrire ces valeurs telles quelles et MUST NOT lire de clé de configuration pour les modifier. L'utilisateur les modifie dans le frontmatter ou les surcharge par `CLAUDE_CODE_EFFORT_LEVEL`, `CLAUDE_CODE_SUBAGENT_MODEL` ou le paramètre d'appel.

#### Scenario: Aucune clé
- **WHEN** `scaffold.mjs` reçoit une clé `effort`, `model` ou `maxTurns` dans la configuration
- **THEN** elle n'a aucun effet : les agents générés sont identiques, octet pour octet, à ceux d'une génération sans elle

### Requirement: Cohérence avec la consigne de l'advisor
La règle de présence de la consigne de l'advisor SHALL continuer de se fonder sur `model:` : le bloc reste présent exactement dans les profils du module `agent-profiles` dont le modèle est de la famille `sonnet` ou `haiku`.

#### Scenario: Valeurs de départ
- **WHEN** les agents sont générés avec la clé `advisor`
- **THEN** la consigne figure dans `product-owner`, `developer` et `business-analyst` et dans aucun autre agent
