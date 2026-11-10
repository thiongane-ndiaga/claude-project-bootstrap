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

- Les droits d'outils d'un profil viennent de la liste `tools` de son frontmatter, dont `Skill` (`architect`, `qa-engineer`). Seul `project-lead` lance des agents (les profils de la table) ; aucun autre profil n'a d'agent lançable ([ARCH-016](../adrs/ARCH-016-les-profils-absorbent-les-agents-historiques.md), qui amende ARCH-011 §6 et [ARCH-012](../adrs/ARCH-012-agents-skills-et-commandes-lancables-par-un-profil.md)) : les méthodes sont des skills de projet, `adr-options-comparison` et `arc42-update` pour `architect`, `spec-review` et `pr-readiness-review` pour `qa-engineer`. Les skills qu'un profil peut lancer sont ceux de la table `PROFILES` ; tout le reste est refusé, sauf pour `project-lead` (skills non bornés). Ce qu'un profil ne peut pas lancer, il le demande à l'agent principal.
- Les écritures, les commandes de shell, les agents, les skills et les outils MCP sont bornés par un seul hook, déclaré par deux entrées `PreToolUse` de `.claude/settings.json` (outils nommés : écriture, shell, `Agent`, l'ancien nom `Task` et `Skill` ; et `mcp__.*`), car il voit l'agent principal, les sous-agents et les teammates, ce que ne font ni le hook de frontmatter ni les règles `permissions`. Il lit `agent_type` et applique la table `PROFILES`. Pas de hook de frontmatter dans les profils générés.
- Refus par défaut : pour un profil de la table, une entrée incomplète, un chemin absent, une racine inconnue ou une erreur interne donnent le code 2 ; pour les agents et skills lançables, tout ce que la table n'autorise pas est refusé ([ARCH-012](../adrs/ARCH-012-agents-skills-et-commandes-lancables-par-un-profil.md)). Un `agent_type` absent de la table (autre agent) n'est pas borné, y compris un ancien agent (`arc42-keeper`, `spec-reviewer`, etc.) resté dans un projet : la table ne le contient plus et son éventuel hook de frontmatter est le seul garde-fou qui lui reste. L'agent principal `project-lead` est dans la table.
- Convention de nommage : un teammate porte le nom de son profil (`qa-engineer`), car `agent_type` vaut le nom du teammate ; un teammate nommé autrement n'est pas borné. Le hook borne aussi les skills d'un teammate par nom de profil (`architect` : `arc42-update` accepté, `spec-review` refusé).
- Commandes supplémentaires d'un profil : motifs ancrés sur la commande entière, sans séparateur ni redirection ; la lecture seule est déléguée à `read-only-bash.mjs`.
- Agent principal borné : `project-lead` est l'agent principal quand `mainAgent` est présent ; l'entrée du hook porte `agent_type: "project-lead"` pour l'agent principal défini par le réglage `agent`, et `project-lead` est dans la table `PROFILES` ([ARCH-013](../adrs/ARCH-013-chef-de-projet-comme-agent-principal-active-par-mainagent.md), décision 1).
  - Écritures refusées, doublées par `disallowedTools` (`Write`, `Edit`, `MultiEdit`, `NotebookEdit`) dans son frontmatter, qui s'applique à l'agent principal.
  - Shell réduit à la lecture seule et à une liste fermée de commandes de pilotage : `openspec archive <id> --yes`, `node .claude/hooks/quality-gate.mjs`, `node .bootstrap/run-checks.mjs`, `archgate review-context` et `session-context`, `gh issue|pr create|comment|edit|close|reopen|merge|ready`. Sont refusés `--admin`, `--web`, `--repo`, `--delete-last`, `--body` et `--editor` ; une chaîne entre guillemets droits n'est admise qu'après `--title`, `-t` ou `--subject` ; `--body-file` prend un chemin relatif sans `..`.
  - Agents réduits aux profils de la table (liste `agents`) ; un teammate est permis si son `name` égale son `subagent_type` (option `namedAgents`, hors `second-opinion`). `archgate:reviewer` n'est lancé par personne, ses agents `general-purpose` étant refusés ([ARCH-012](../adrs/ARCH-012-agents-skills-et-commandes-lancables-par-un-profil.md), décisions 2 à 4).
  - Skills non bornés par nom (`skillsOpen`), sauf ceux à nom invalide ou à `context: fork`, refusés comme pour tout profil de la table ; sa consigne lui interdit `/opsx:apply`, `/opsx:archive` et `/opsx:sync` : il archive par `openspec archive <id> --yes`.
  - Seul profil à recevoir les outils MCP de la session ; ils sont bornés comme pour tout profil de la table (voir ci-dessous).
  - Ses autres garde-fous (délégation, arbitrage, accord pour les écritures visibles, absence de code et de spec) sont des consignes de son prompt. Les ADR sont des bloquants (niveau 1 de l'échelle d'arbitrage) ; la validation et la rédaction d'ADR d'Archgate sont réparties entre `qa-engineer` (valider) et `architect` (décider, rédiger), `project-lead` lançant `lessons-learned` que le hook interdit à `architect`.
- Outils MCP : pour un profil de la table, un outil MCP n'est permis que s'il est de lecture ou listé dans `mcpAllow` de l'entrée du profil (défaut fermé). Est de lecture l'outil dont la partie finale du nom, après le dernier `__`, est `get`, `list`, `search`, `read`, `find`, `fetch`, `view`, `describe`, `show` ou `check`, seul ou suivi de `_`, ou finit par `_read`, `_get`, `_list` ou `_search`, sans mot d'écriture de `WRITE_WORDS` (par exemple `create`, `update`, `run`, `query`, `or`). Le refus oriente vers `mcpAllow`, l'utilisateur et, pour GitHub, `gh issue|pr`. Les profils à liste `tools` n'ont aucun outil MCP ; seul `project-lead` reçoit ceux de la session ([ARCH-011](../adrs/ARCH-011-profils-d-agents-bornes-par-un-hook-unique.md), décision 7).
- Skills à contexte isolé : les outils d'un skill `context: fork` portent `agent_type: "general-purpose"`, hors de la table. Le hook refuse donc à tout profil de la table un skill à nom invalide ou dont l'en-tête déclare `context: fork`, cherché dans le projet, la configuration de l'utilisateur et les plugins installés ; un skill introuvable est permis, un skill illisible est refusé ([ARCH-012](../adrs/ARCH-012-agents-skills-et-commandes-lancables-par-un-profil.md)).
- Précédence : le réglage `agent` du `.claude/settings.json` du projet l'emporte sur l'agent `archgate:developer` imposé par le plugin Archgate ; les deux modules se combinent sans conflit.
- Autres profils ([ARCH-014](../adrs/ARCH-014-profils-optionnels-choisis-par-la-cle-profiles.md)) : `product-owner`, `acceptance-tester`, `scout`, `second-opinion`, `devops-engineer` et `compliance-reviewer` n'écrivent nulle part et ne lancent ni agent ni skill (`second-opinion` n'a pas de shell, et est lancé en sous-agent sur un brief neutre), `business-analyst` n'écrit que dans `openspec/changes/`. `developer`, profil par défaut, écrit partout sauf dans une liste d'exclusion (dossiers et fichiers de gouvernance, dont `.claude/`, `.git/`, `docs/architecture/`, `openspec/specs/`, `CLAUDE.md`). La comparaison ignore la casse et les points et espaces finals d'un segment. Une liste d'exclusion est plus faible qu'une liste d'autorisation : elle doit suivre les nouveaux dossiers de gouvernance.
- Chemin réel : pour tous les profils de la table, le hook compare le chemin réel de l'écriture (liens, jonctions, noms courts 8.3, casse réelle), refuse un segment contenant `:` (flux NTFS) et un chemin hors du projet.
- Shell de `developer` non borné : la pile n'étant pas choisie, aucune commande de build ou de test n'est connue. Le bornage des dossiers de gouvernance ne vaut que pour les outils d'écriture ; la ligne de commande peut y écrire, et le prompt du profil interdit de publier.
- Portée : garde-fou contre l'erreur d'un agent, pas un bac à sable. La relecture humaine des changements reste la garantie.

Voir [ARCH-011](../adrs/ARCH-011-profils-d-agents-bornes-par-un-hook-unique.md) (mécanisme de bornage), [ARCH-012](../adrs/ARCH-012-agents-skills-et-commandes-lancables-par-un-profil.md) (agents, skills et droits par profil) [ARCH-013](../adrs/ARCH-013-chef-de-projet-comme-agent-principal-active-par-mainagent.md) (agent principal `project-lead`), [ARCH-014](../adrs/ARCH-014-profils-optionnels-choisis-par-la-cle-profiles.md) (profils optionnels, liste d'exclusion, chemin réel) et [ARCH-016](../adrs/ARCH-016-les-profils-absorbent-les-agents-historiques.md) (plus d'agent lançable).

## Réglages payants ou expérimentaux de l'utilisateur

Le plugin n'écrit pas dans un projet généré un réglage payant ou expérimental de l'utilisateur (par exemple `advisorModel`) ; il le documente. Seule exception encadrée : `settings.local.json`, avec l'accord de l'utilisateur. Voir [ARCH-015](../adrs/ARCH-015-le-plugin-n-ecrit-pas-de-reglage-payant-ou-experimental.md).

## Modèle, effort et bornes des agents générés

- Chaque agent généré porte `model`, `effort` et `maxTurns` en valeurs fixes dans son frontmatter ; le projet les édite, ou les surcharge par l'environnement (`CLAUDE_CODE_SUBAGENT_MODEL`, `CLAUDE_CODE_EFFORT_LEVEL`). Le coût de ces valeurs est documenté dans ARCH-015 et `pitfalls.md`.
- `maxTurns` est une borne de coût : un sous-agent arrêté par la limite rend une sortie partielle (comportement de Claude Code, non vérifié ici) ; sa reprise par un teammate n'est pas constatée.
- Une surcharge de modèle peut laisser la consigne de l'advisor sur un profil devenu `opus`, et un niveau `effort` peut ne pas exister sur le modèle de remplacement (non vérifié).
- Contrôle automatique : le frontmatter de tous les agents générés n'utilise que les champs documentés des agents de projet (un champ inconnu est ignoré en silence), avec `effort` et `maxTurns` valides et un nom de fichier égal à `name`.

Voir [ARCH-015](../adrs/ARCH-015-le-plugin-n-ecrit-pas-de-reglage-payant-ou-experimental.md).

## Double encodage des règles

- Le `docs/workflow.md` généré (modèles `skills/project-bootstrap/assets/modules/core/templates{,.en}/docs/workflow.md`) porte une table « Double encodage des règles » : une ligne par puce de `## Règles` du `CLAUDE.md` généré, par règle de `project-lead` et par garde-fou de profil, avec son garde-fou (hook, permission de `.claude/settings.json`, CI, règle Archgate) ou « consigne seulement ». La règle « ne produit ni code ni spec » de `project-lead` y a sa ligne : consigne de son prompt doublée par `disallowedTools`, effet non vérifié.
- Un test (`tests/scaffold.test.mjs`) exige qu'une règle de `CLAUDE.md` ait sa ligne et que les fichiers cités existent. Il ne vérifie pas l'effet du garde-fou : une ligne dit où il est censé se trouver, pas qu'il bloque.
- Le même document décrit « Qui fait quoi » (une ligne par agent généré, droits repris à la main de la table `PROFILES` de `profile-guard.mjs`, donc à tenir alignés avec elle), l'échelle d'arbitrage (copie testée de celle de `project-lead`) et le journal des décisions.

Source : changement OpenSpec `38-workflow-who-does-what` (issue #38) ; pas d'ADR.

## Persistance après compaction

- Le `CLAUDE.md` racine est relu depuis le disque après une compaction ; les règles à frontmatter `paths:` et les `CLAUDE.md` de sous-dossier ne le sont pas. Le plugin n'en génère aucun, ce qu'un test fige sur la sélection complète ; les fichiers créés par les CLI d'outillage sont hors de ce contrôle.
- Le corps d'un skill est tronqué à 5 000 jetons, début conservé. Dans le `SKILL.md` du plugin, les étapes critiques sont en tête, ce que vérifie un test de position.
- La survie du corps de l'agent principal n'étant pas établie, l'échelle d'arbitrage existe en trois copies comparées par un test : `project-lead.md`, `CLAUDE.md` et `docs/workflow.md`.
- Le hook `compact-recall` (module optionnel) ne lit que le disque et git : branche courante et tâches faites par changement OpenSpec en cours ; il ne bloque jamais la session.
- Non vérifié : une compaction réelle, et le déclenchement de `SessionStart` pour un teammate (#114).

Source : changement OpenSpec `39-compaction-persistence` (issue #39). Voir [ARCH-013](../adrs/ARCH-013-chef-de-projet-comme-agent-principal-active-par-mainagent.md) (règles critiques doublées) et [ARCH-010](../adrs/ARCH-010-modules-auto-decrits.md) (permissions et hooks de `settings.json` par module).

_Le reste de la section reste à rédiger._
