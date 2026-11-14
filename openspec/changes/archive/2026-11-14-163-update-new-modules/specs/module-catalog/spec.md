## ADDED Requirements

### Requirement: Modules et profils proposables à la mise à jour
`scaffold.mjs --detect` et le rapport de `--update` SHALL, pour un projet dont le manifeste est lisible, rapporter `available` : `modules` (modules du catalogue hors `core`, absents du manifeste et sans incompatibilité avec un module du manifeste, avec les champs de `--list-modules`) et `profiles` (profils optionnels absents de `profiles`, dans l'ordre du catalogue, seulement si `agent-profiles` figure au manifeste). Un manifeste illisible ou sans liste de modules MUST NOT donner de `available`.

#### Scenario: Manifeste ancien
- **WHEN** `--detect` est lancé sur un projet dont le manifeste n'a ni `dependabot` ni le profil `scout`
- **THEN** `available.modules` contient `dependabot` avec ses champs et `available.profiles` contient `scout`

#### Scenario: Module incompatible
- **WHEN** le manifeste liste `github`
- **THEN** `available.modules` ne contient pas `gitlab`, qui déclare `github` incompatible

#### Scenario: Rien de nouveau
- **WHEN** le manifeste liste tous les modules compatibles avec lui et tous les profils
- **THEN** `available.modules` et `available.profiles` sont vides

#### Scenario: Sans agent-profiles
- **WHEN** le manifeste ne liste pas `agent-profiles`
- **THEN** `available.profiles` est vide et `agent-profiles` figure dans `available.modules`

#### Scenario: Manifeste illisible
- **WHEN** `--detect` est lancé sur un manifeste illisible
- **THEN** la sortie n'a pas de `available`

### Requirement: Questions de mise à jour
`SKILL.md` SHALL demander, à la phase 5, avant la simulation, les modules de `available.modules`, les questions déclarées des modules retenus, puis les profils de `available.profiles`, en questions de quatre options au plus sans omettre aucune entrée proposable, et simuler avec une copie de `config` complétée. La règle des quatre options vaut aussi à la phase 0. Les refus ne sont pas consignés.

#### Scenario: Configuration complétée
- **WHEN** `--detect` est lancé, puis `--config` reçoit la copie de `config` du manifeste complétée de `dependabot` et du profil `scout`, avec `--dry-run`
- **THEN** la simulation sort en code 0 et rapporte les fichiers du module et du profil comme créés
