# Spec Delta

## MODIFIED Requirements

### Requirement: Manifeste et mise à jour en attente
L'audit SHALL signaler comme écart un manifeste illisible, une version du plugin différente de celle du plugin exécuté, une mise à jour en attente (fichiers à créer, remplacer, fusionner proprement ou en conflit selon `scaffold.mjs --update --dry-run`) et une base de fusion invalide, dont la correction dépend de la cause. La sortie 3 de ce rapport est normale. Les fusions de fichiers partagés, les fichiers retirés et la mise à jour du seul manifeste ne sont pas des écarts.

#### Scenario: Version du manifeste en retard
- **WHEN** le manifeste indique une version du plugin différente de celle du plugin exécuté
- **THEN** le contrôle est un écart avec la correction `scaffold.mjs --update`

#### Scenario: Fusion propre en attente
- **WHEN** la simulation de mise à jour rapporte un fichier à fusionner proprement
- **THEN** le contrôle est un écart

#### Scenario: Base de fusion altérée
- **WHEN** la base d'un fichier ne correspond plus à l'empreinte du manifeste et que son modèle a changé
- **THEN** le contrôle des bases est un écart

#### Scenario: Manifeste illisible
- **WHEN** le manifeste n'est pas un JSON valide
- **THEN** le contrôle est un écart

#### Scenario: Projet sans manifeste
- **WHEN** le projet n'a pas de manifeste
- **THEN** les contrôles qui en dépendent sont `non-verifiable` et renvoient vers `scaffold.mjs --adopt`

## ADDED Requirements

### Requirement: Correction de l'écart des bases
Pour chaque base invalide rapportée par la simulation de mise à jour, l'audit SHALL choisir la correction d'après le statut de l'entrée du manifeste. Hors `kept` : restaurer la version de la base dont l'empreinte égale `generated`. `kept` ou entrée absente : citer les deux causes (base altérée, manifeste dérivé) et renvoyer à `references/versioning.md`, section « Manifeste dérivé par une version antérieure ». Il MUST NOT conseiller de supprimer une base.

#### Scenario: Base altérée à la main
- **WHEN** la simulation rapporte un fichier à la fois en conflit et en base invalide, et que l'entrée du manifeste a le statut `created`
- **THEN** les contrôles `mise-a-jour` et `bases` sont des écarts, le message de `bases` nomme le fichier, et sa correction conseille de restaurer `.bootstrap/base/<fichier>.base` à la version de l'historique git dont l'empreinte égale `generated`, avec le repli sans git (`--diff`, fusion à la main, `--adopt`)

#### Scenario: Manifeste dérivé
- **WHEN** la simulation rapporte une base invalide pour un fichier dont l'entrée du manifeste a le statut `kept`
- **THEN** la correction cite la base altérée et le manifeste dérivé par une version antérieure du plugin, nomme `references/versioning.md` et la section « Manifeste dérivé par une version antérieure », propose le repli sans git (`--diff`, fusion à la main, `--adopt`), et ne conseille pas de supprimer la base

#### Scenario: Entrée absente du manifeste
- **WHEN** la simulation rapporte une base invalide pour un fichier sans entrée dans le manifeste
- **THEN** la correction est celle d'une entrée `kept`

#### Scenario: Bases de natures différentes
- **WHEN** la simulation rapporte deux bases invalides, l'une d'une entrée `created`, l'autre d'une entrée `kept`
- **THEN** l'audit rend un seul écart `bases`, dont la correction comporte une clause par cause, séparées par ` | `, chacune nommant son fichier

#### Scenario: Aucune suppression conseillée
- **WHEN** la simulation rapporte une base invalide, quel que soit le statut de l'entrée
- **THEN** la correction ne conseille ni de supprimer la base, ni d'attendre que le prochain `--update` la reconstitue

#### Scenario: Modèle inchangé
- **WHEN** la simulation ne rapporte aucune base invalide, par exemple parce que le modèle d'un fichier à base altérée n'a pas changé
- **THEN** le contrôle `bases` est `ok`

#### Scenario: Sortie de l'audit
- **WHEN** l'audit s'exécute avec `--json` ou en sortie lisible sur un projet à base invalide
- **THEN** le résultat `bases` porte la correction dans son champ `correction` et la sortie lisible l'affiche sur la ligne `correction :`
