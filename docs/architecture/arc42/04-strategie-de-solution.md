# 4. Stratégie de solution

> Les décisions fondatrices qui orientent l'architecture, chacune justifiée par un ADR.

- Quels choix technologiques structurants ont été faits (lien vers l'ADR de chacun) ?
- Quelle décomposition de haut niveau ?
- Comment chaque objectif de qualité de la section 1.2 est-il atteint ?

## Installation des CLI d'outillage

Les projets générés appellent `openspec` et `archgate` par leur nom. Le mode d'installation (`cliInstall` : `global` par défaut, `user`, `local` en opt-in) est choisi à la phase 0 et consigné au manifeste ; seul `local` ajoute un `package.json` (versions exactes). Voir [ARCH-007](../adrs/ARCH-007-installation-des-cli-d-outillage.md).

## Langue de la documentation générée

Les modèles de référence sont en français (`assets/templates/`) ; une langue ajoute un dossier `assets/templates.<code>/` qui ne contient que les fichiers ayant du texte, le reste est lu dans `assets/templates/`. La langue est choisie par la clé `docLanguage` (défaut `fr`) et le skill ne traduit plus. Voir [ARCH-008](../adrs/ARCH-008-modeles-de-documentation-par-langue.md).

_Le reste de la section reste à rédiger._
