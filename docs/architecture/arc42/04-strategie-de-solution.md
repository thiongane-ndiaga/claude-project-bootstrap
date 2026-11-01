# 4. Stratégie de solution

> Les décisions fondatrices qui orientent l'architecture, chacune justifiée par un ADR.

- Quels choix technologiques structurants ont été faits (lien vers l'ADR de chacun) ?
- Quelle décomposition de haut niveau ?
- Comment chaque objectif de qualité de la section 1.2 est-il atteint ?

## Installation des CLI d'outillage

Les projets générés appellent `openspec` et `archgate` par leur nom. Le mode d'installation (`cliInstall` : `global` par défaut, `user`, `local` en opt-in) est choisi à la phase 0 et consigné au manifeste ; seul `local` ajoute un `package.json` (versions exactes). Voir [ARCH-007](../adrs/ARCH-007-installation-des-cli-d-outillage.md).

_Le reste de la section reste à rédiger._
