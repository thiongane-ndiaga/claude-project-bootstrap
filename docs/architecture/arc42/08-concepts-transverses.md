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

- Les droits d'outils d'un profil viennent de la liste `tools` de son frontmatter, dont `Agent` (`architect`, `qa-engineer`) et `Skill` (`architect`). Les agents et skills qu'un profil peut lancer sont ceux de la table `PROFILES` ; tout le reste est refusé, et la restriction `Agent(<types>)` du frontmatter ne borne pas un sous-agent ([ARCH-012](../adrs/ARCH-012-agents-skills-et-commandes-lancables-par-un-profil.md)). Les agents lançables (`arc42-keeper`, `spec-reviewer`, `architecture-explorer`) ont leurs propres bornes dans la table du hook et ne dépendent plus de leur hook de frontmatter. Ce qu'un profil ne peut pas lancer, il le demande à l'agent principal.
- Les écritures, les commandes de shell, les agents et les skills sont bornés par un seul hook `PreToolUse` de `.claude/settings.json` (outils d'écriture, shell, `Agent`, l'ancien nom `Task` et `Skill`), car il voit l'agent principal, les sous-agents et les teammates, ce que ne font ni le hook de frontmatter ni les règles `permissions`. Il lit `agent_type` et applique la table `PROFILES`. Pas de hook de frontmatter dans les profils générés.
- Refus par défaut : pour un profil de la table, une entrée incomplète, un chemin absent, une racine inconnue ou une erreur interne donnent le code 2 ; pour les agents et skills lançables, tout ce que la table n'autorise pas est refusé ([ARCH-012](../adrs/ARCH-012-agents-skills-et-commandes-lancables-par-un-profil.md)). Un `agent_type` absent de la table (agent principal, autre agent) n'est pas borné.
- Convention de nommage : un teammate porte le nom de son profil (`qa-engineer`), car `agent_type` vaut le nom du teammate ; un teammate nommé autrement n'est pas borné.
- Commandes supplémentaires d'un profil : motifs ancrés sur la commande entière, sans séparateur ni redirection ; la lecture seule est déléguée à `read-only-bash.mjs`.
- Agent principal non borné : `project-lead` est l'agent principal quand `mainAgent` est présent ; l'entrée du hook ne porte pas d'`agent_type` pour lui, il n'est donc pas dans la table. Ses garde-fous (délégation, arbitrage, accord pour les écritures visibles) sont des consignes de son prompt, pas des mécanismes. Les ADR sont des bloquants (niveau 1 de l'échelle d'arbitrage) ; la validation et la rédaction d'ADR d'Archgate sont réparties entre `qa-engineer` (valider) et `architect` (décider, rédiger), `project-lead` lançant `lessons-learned` que le hook interdit à `architect`.
- Précédence : le réglage `agent` du `.claude/settings.json` du projet l'emporte sur l'agent `archgate:developer` imposé par le plugin Archgate ; les deux modules se combinent sans conflit.
- Profils optionnels ([ARCH-014](../adrs/ARCH-014-profils-optionnels-choisis-par-la-cle-profiles.md)) : `product-owner` n'écrit nulle part, `business-analyst` n'écrit que dans `openspec/changes/`, `developer` écrit partout sauf dans une liste d'exclusion (dossiers et fichiers de gouvernance, dont `.claude/`, `.git/`, `docs/architecture/`, `openspec/specs/`, `CLAUDE.md`). La comparaison ignore la casse et les points et espaces finals d'un segment. Une liste d'exclusion est plus faible qu'une liste d'autorisation : elle doit suivre les nouveaux dossiers de gouvernance.
- Chemin réel : pour tous les profils de la table, le hook compare le chemin réel de l'écriture (liens, jonctions, noms courts 8.3, casse réelle), refuse un segment contenant `:` (flux NTFS) et un chemin hors du projet.
- Shell de `developer` non borné : la pile n'étant pas choisie, aucune commande de build ou de test n'est connue. Le bornage des dossiers de gouvernance ne vaut que pour les outils d'écriture ; la ligne de commande peut y écrire, et le prompt du profil interdit de publier.
- Portée : garde-fou contre l'erreur d'un agent, pas un bac à sable. La relecture humaine des changements reste la garantie.

Voir [ARCH-011](../adrs/ARCH-011-profils-d-agents-bornes-par-un-hook-unique.md) (mécanisme de bornage), [ARCH-012](../adrs/ARCH-012-agents-skills-et-commandes-lancables-par-un-profil.md) (agents, skills et droits par profil) [ARCH-013](../adrs/ARCH-013-chef-de-projet-comme-agent-principal-active-par-mainagent.md) (agent principal `project-lead`) et [ARCH-014](../adrs/ARCH-014-profils-optionnels-choisis-par-la-cle-profiles.md) (profils optionnels, liste d'exclusion, chemin réel).

## Réglages payants ou expérimentaux de l'utilisateur

Le plugin n'écrit pas dans un projet généré un réglage payant ou expérimental de l'utilisateur (par exemple `advisorModel`) ; il le documente. Seule exception encadrée : `settings.local.json`, avec l'accord de l'utilisateur. Voir [ARCH-015](../adrs/ARCH-015-le-plugin-n-ecrit-pas-de-reglage-payant-ou-experimental.md).

_Le reste de la section reste à rédiger._
