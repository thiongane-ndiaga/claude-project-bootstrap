## MODIFIED Requirements

### Requirement: Actions épinglées
L'audit SHALL vérifier qu'une même action porte le même SHA dans `ci.yml` et `release.yml`, et, sauf si le module `dependabot` est actif, comparer ces SHA à ceux de `config.actions` du manifeste. Quand le module `dependabot` est actif, les SHA des workflows avancent avec ses PR : l'audit MUST NOT signaler l'écart avec le manifeste.

#### Scenario: Action différente entre deux workflows
- **WHEN** une action a un SHA dans `ci.yml` et un autre dans `release.yml`
- **THEN** le contrôle est un écart qui nomme l'action

#### Scenario: SHA différent du manifeste, sans Dependabot
- **WHEN** le module `dependabot` est absent et le SHA d'une action diffère de `config.actions`
- **THEN** le contrôle est un écart

#### Scenario: SHA différent du manifeste, avec Dependabot
- **WHEN** le module `dependabot` est actif et les SHA des workflows diffèrent de `config.actions` mais restent cohérents entre eux
- **THEN** le contrôle ne signale aucun écart
