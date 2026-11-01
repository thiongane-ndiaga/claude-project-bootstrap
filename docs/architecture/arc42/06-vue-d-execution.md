# 6. Vue d'exécution

> Comportement dynamique : comment les briques collaborent dans les scénarios importants.

- Quels scénarios (cas d'usage critiques, démarrage, erreurs) faut-il illustrer ?
- Pour chacun : quelle séquence d'interactions entre briques ?

## Reprise après redémarrage

1. Le skill lance `scaffold.mjs --detect` : `resumable` indique qu'un état existe dans `.bootstrap/local/`.
2. `state.mjs resume` renvoie la prochaine étape et les incohérences ; `config --out` restitue `bootstrap.json` dans la nouvelle session.
3. Une étape marquée faite dont la preuve vérifiable manque est à refaire ; sans état, l'avancement est déduit des preuves.
4. Avant chaque étape, `step --status doing` ; avant chaque action globale, `effect` (commande, valeur précédente, annulation), puis `effect --done`.
5. `effects --undo` liste les annulations, la plus récente d'abord ; l'utilisateur les exécute lui-même.

Voir [ARCH-009](../adrs/ARCH-009-etat-de-reprise-et-journal-des-effets.md).

_Le reste de la section reste à rédiger._
