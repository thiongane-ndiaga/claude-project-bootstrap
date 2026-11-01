## MODIFIED Requirements

### Requirement: Réglages et ADR d'exemple
L'audit SHALL signaler comme écart un `agent` imposé dans `.claude/settings.json` ou `.claude/settings.local.json` du projet quand il vaut `archgate:developer`, ou quand il diffère de `mainAgent` consigné au manifeste, ou quand `mainAgent` est consigné sans `agent` dans `settings.json`. Il SHALL signaler la présence d'un ADR d'exemple `GEN-001` dans `.archgate/adrs/`.

#### Scenario: Agent imposé
- **WHEN** `.claude/settings.local.json` contient `"agent": "archgate:developer"`
- **THEN** le contrôle est un écart avec la correction de retirer la clé

#### Scenario: mainAgent cohérent
- **WHEN** le manifeste consigne `mainAgent` et `settings.json` déclare le même agent
- **THEN** le contrôle est ok et nomme l'agent principal

#### Scenario: Agent différent de mainAgent
- **WHEN** le manifeste consigne `mainAgent` et un fichier de réglages, `settings.local.json` compris, déclare un autre agent
- **THEN** le contrôle est un écart avec la correction de retirer la clé ou de mettre `mainAgent` à `null`

#### Scenario: mainAgent absent des réglages
- **WHEN** le manifeste consigne `mainAgent` et `settings.json` ne déclare aucun agent
- **THEN** le contrôle est un écart avec la correction de relancer `scaffold.mjs --update`
