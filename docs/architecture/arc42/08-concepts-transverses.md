# 8. Concepts transverses

> Règles et solutions qui s'appliquent à plusieurs briques.

- Modèle de domaine : quels concepts métier et quelles règles transverses ?
- Persistance, sécurité, gestion des erreurs, journalisation, internationalisation, tests : quelle approche pour chacun ?
- Quelles de ces règles sont vérifiées automatiquement par `archgate check` ?

## Résolution des CLI d'outillage

Les appels `openspec` et `archgate` sont identiques dans tous les modes ; jamais de `npx` dans les fichiers générés. En `local`, `node_modules/.bin` est placé dans le `PATH` (construit avec `path.delimiter`, clé `PATH` retrouvée sans tenir compte de la casse) par le hook, la CI et l'audit, et les sessions Claude Code démarrent avec `npm run claude`. Aucun `sudo` n'est proposé. Voir [ARCH-007](../adrs/ARCH-007-installation-des-cli-d-outillage.md).

_Le reste de la section reste à rédiger._
