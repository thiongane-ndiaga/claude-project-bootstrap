# 8. Concepts transverses

> Règles et solutions qui s'appliquent à plusieurs briques.

- Modèle de domaine : quels concepts métier et quelles règles transverses ?
- Persistance, sécurité, gestion des erreurs, journalisation, internationalisation, tests : quelle approche pour chacun ?
- Quelles de ces règles sont vérifiées automatiquement par `archgate check` ?

## Résolution des CLI d'outillage

Les appels `openspec` et `archgate` sont identiques dans tous les modes ; jamais de `npx` dans les fichiers générés. En `local`, `node_modules/.bin` est placé dans le `PATH` par le hook qualité, la CI et l'audit (construit avec `path.delimiter`, clé `PATH` retrouvée sans tenir compte de la casse). Un hook `SessionStart` (`session-path.mjs`) l'ajoute aussi au `PATH` de l'outil Bash des sessions Claude Code via `CLAUDE_ENV_FILE` (ligne en syntaxe Bash, séparateur `:`) : `claude` suffit. L'outil PowerShell et le terminal personnel ne reçoivent pas ce `PATH` : `npm run claude` ou `npx`. Aucun `sudo` n'est proposé. Voir [ARCH-007](../adrs/ARCH-007-installation-des-cli-d-outillage.md).

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

## Bornage des agents par profil

- Les droits d'outils d'un profil viennent de la liste `tools` de son frontmatter. Aucun profil n'a l'outil `Agent` ni `Skill` : un agent lancé par un profil porterait un autre `agent_type` et échapperait au bornage, et un skill peut lancer des agents. Le profil demande à l'agent principal.
- Les écritures et les commandes de shell sont bornées par un seul hook `PreToolUse` de `.claude/settings.json`, car il voit l'agent principal, les sous-agents et les teammates, ce que ne font ni le hook de frontmatter ni les règles `permissions`. Il lit `agent_type` et applique la table `PROFILES`. Pas de hook de frontmatter dans les profils générés.
- Refus par défaut : pour un profil de la table, une entrée incomplète, un chemin absent, une racine inconnue ou une erreur interne donnent le code 2. Un `agent_type` absent de la table (agent principal, autre agent) n'est pas borné.
- Convention de nommage : un teammate porte le nom de son profil (`qa-engineer`), car `agent_type` vaut le nom du teammate ; un teammate nommé autrement n'est pas borné.
- Commandes supplémentaires d'un profil : motifs ancrés sur la commande entière, sans séparateur ni redirection ; la lecture seule est déléguée à `read-only-bash.mjs`.
- Portée : garde-fou contre l'erreur d'un agent, pas un bac à sable. La relecture humaine des changements reste la garantie.

Voir [ARCH-011](../adrs/ARCH-011-profils-d-agents-bornes-par-un-hook-unique.md).

_Le reste de la section reste à rédiger._
