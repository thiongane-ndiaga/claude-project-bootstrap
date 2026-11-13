## MODIFIED Requirements

### Requirement: Descripteur de module
`module.json` SHALL déclarer `description` (obligatoire), et facultativement `requires`, `requiresAny`, `default`, `conflicts`, `questions` et `files`. Chaque entrée de `files` SHALL avoir un `path` et facultativement `when`, `merge` et `owned`. Un champ inconnu MUST être refusé. Les `questions` sont posées à la phase 0, sans schéma de configuration propre au module.

#### Scenario: Champ inconnu
- **WHEN** un descripteur contient une clé inconnue
- **THEN** `scaffold.mjs` s'arrête avec le code 1 en nommant le descripteur et la clé

#### Scenario: Description absente
- **WHEN** un descripteur n'a pas de `description`
- **THEN** `scaffold.mjs` s'arrête avec le code 1 en nommant le descripteur

## ADDED Requirements

### Requirement: Dépendance alternative
`requiresAny` SHALL être une liste non vide de modules dont un au moins est sélectionné. Le chargement SHALL la refuser (code 1, descripteur nommé) vide, avec un nom inconnu, avec le module lui-même, avec un module aussi cité dans `conflicts` ou avec un pseudo-module. `--list-modules` (JSON et tableau) l'affiche.

#### Scenario: Aucun module de la liste
- **WHEN** un module à `requiresAny: ["a", "b"]` est sélectionné sans `a` ni `b`
- **THEN** la génération est refusée avec le code 1 en nommant le module et la liste

#### Scenario: Un module de la liste suffit
- **WHEN** le module est sélectionné avec `b` seulement
- **THEN** la génération n'est pas refusée pour cette dépendance

#### Scenario: Liste invalide
- **WHEN** `requiresAny` est vide ou cite un module inconnu
- **THEN** le chargement échoue en nommant le descripteur

### Requirement: Condition forge
Le pseudo-module `forge` SHALL être actif quand `github` ou `gitlab` est sélectionné et utilisable dans `when` et dans les blocs. Un chemin utile aux deux forges SHALL avoir un seul propriétaire avec `when: ["forge"]`.

#### Scenario: Fichier commun aux deux forges
- **WHEN** un projet est généré avec `github`, puis avec `gitlab`
- **THEN** un fichier déclaré par `core` avec `when: ["forge"]` existe dans les deux, et pas sans forge
