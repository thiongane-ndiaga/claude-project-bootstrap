# 8. Concepts transverses

> Règles et solutions qui s'appliquent à plusieurs briques.

- Modèle de domaine : quels concepts métier et quelles règles transverses ?
- Persistance, sécurité, gestion des erreurs, journalisation, internationalisation, tests : quelle approche pour chacun ?
- Quelles de ces règles sont vérifiées automatiquement par `archgate check` ?

## Résolution des CLI d'outillage

Les appels `openspec` et `archgate` sont identiques dans tous les modes ; jamais de `npx` dans les fichiers générés. En `local`, `node_modules/.bin` est placé dans le `PATH` (construit avec `path.delimiter`, clé `PATH` retrouvée sans tenir compte de la casse) par le hook, la CI et l'audit, et les sessions Claude Code démarrent avec `npm run claude`. Aucun `sudo` n'est proposé. Voir [ARCH-007](../adrs/ARCH-007-installation-des-cli-d-outillage.md).

## Internationalisation de la documentation générée

- L'arborescence est le contrat : les noms de fichiers sont identiques dans toutes les langues, y compris les slugs français d'arc42 et des ADR.
- Le vocabulaire du statut d'un ADR suit la langue du projet (`## Statut` / `## Status`, `Accepté` / `Accepted`) ; la règle ARCH-003 de chaque langue accepte le sien.
- Parité contrôlée par les tests : mêmes marqueurs `@@module` et paramètres `{{…}}`, mêmes squelettes de code (chaînes et commentaires retirés), règles `.rules.ts` comparées sans chaînes, commentaires ni regex. Un modèle sans version traduite ne contient aucune lettre accentuée.
- La génération est reproductible par langue, donc valable comme base de fusion de `--update` ([ARCH-006](../adrs/ARCH-006-strategie-de-mise-a-jour-des-fichiers-generes.md)).

Voir [ARCH-008](../adrs/ARCH-008-modeles-de-documentation-par-langue.md).

## Propriété des fichiers par module

- Un fichier appartient au module qui le déclare ; `when` ne liste que les modules supplémentaires nécessaires. Les ADR d'outillage ARCH-001 à ARCH-005 appartiennent à `archgate`, les formulaires d'issues à `github`, les fichiers transverses à `core`.
- `.claude/settings.json`, `package.json`, `.bootstrap/manifest.json`, `.bootstrap/base/**`, `.bootstrap/local/**` et `.git/**` sont réservés au générateur : un module ne peut pas les déclarer.
- Les liens symboliques ne sont pas suivis dans un dossier de module.
- Un fichier est généré si son module propriétaire et tous ses `when` sont actifs ; les instantanés de la matrice le vérifient.

Voir [ARCH-010](../adrs/ARCH-010-modules-auto-decrits.md).

## Reprise et traçabilité des effets

- L'état et le journal sont propres à la machine : `.bootstrap/local/` s'ignore seul, même avant la génération des fichiers du projet ; le manifeste `.bootstrap/manifest.json` reste versionné.
- L'état ne contient que les clés du schéma de `bootstrap.json` et les statuts des étapes, jamais de jeton.
- La reprise ne croit pas l'état aveuglément : une étape faite sans preuve vérifiable est à refaire.
- Le journal est écrit avant l'action et porte la valeur précédente ; une annulation qui retirerait un élément déjà présent avant l'action n'est pas proposée sans mise en garde.
- Le format est versionné : une version inconnue est refusée, pas convertie.

Voir [ARCH-009](../adrs/ARCH-009-etat-de-reprise-et-journal-des-effets.md).

_Le reste de la section reste à rédiger._
