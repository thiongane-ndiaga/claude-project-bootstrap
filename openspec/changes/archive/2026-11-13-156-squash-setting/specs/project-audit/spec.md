## ADDED Requirements

### Requirement: Réglage de squash dans l'audit
Sur l'option `--forge`, l'audit SHALL rendre le contrôle `migration-0004-squash-title-only` `ok` quand le squash garde le titre de la PR seul, et un écart sinon. La correction SHALL citer la commande `gh api -X PATCH` de l'action en plus de `migrate.mjs`, parce que `migrate.mjs` ne rejoue pas une migration déjà consignée au manifeste.

#### Scenario: Réglage conforme
- **WHEN** l'audit est lancé avec `--forge` sur un dépôt réglé sur `PR_TITLE` et `BLANK`
- **THEN** le contrôle `migration-0004-squash-title-only` est `ok`

#### Scenario: Écart de squash
- **WHEN** le dépôt est réglé sur `COMMIT_MESSAGES`
- **THEN** le contrôle est un écart qui nomme le réglage et dont la correction contient la commande `PATCH` du dépôt visé

#### Scenario: Migration consignée puis réglage modifié
- **WHEN** la migration est consignée au manifeste et que le réglage du dépôt est revenu à `COMMIT_MESSAGES`
- **THEN** le contrôle est un écart dont la correction directe fonctionne
