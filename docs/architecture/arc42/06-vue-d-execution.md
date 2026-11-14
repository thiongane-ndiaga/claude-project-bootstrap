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

## Mise à jour d'un projet déjà généré (phase 5)

1. Le skill lance `scaffold.mjs --detect` : `updateAvailable` compare la version du manifeste à celle du plugin, et `available` liste les modules et profils du catalogue que le manifeste n'a pas choisis.
2. Avant toute simulation, le skill propose ces nouveautés en questions de quatre options au plus, sans en omettre : modules (avec leurs `requires`, jamais deux modules incompatibles), questions des modules retenus, puis profils. Il complète une copie de `config` du manifeste.
3. Il simule avec `--update --dry-run --diff`, ou avec `--config` sur la copie complétée quand une nouveauté est retenue, puis présente les fichiers créés, mis à jour, fusionnés et en conflit.
4. Après accord, il applique, puis renvoie aux migrations : ajouter `agent-profiles` à un ancien projet retire des agents historiques ([ARCH-016](../adrs/ARCH-016-les-profils-absorbent-les-agents-historiques.md)).

Le manifeste ne consigne pas les refus : un module décliné est reproposé à chaque mise à jour. Voir [ARCH-010](../adrs/ARCH-010-modules-auto-decrits.md).

_Le reste de la section reste à rédiger._
