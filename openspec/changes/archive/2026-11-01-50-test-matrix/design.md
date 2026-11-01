## Context

`tests/scaffold.test.mjs` (254 assertions, plus de 1100 lignes) vérifie des comportements précis du générateur et ne génère que 7 combinaisons de modules. Le catalogue `assets/modules.json` décrit 11 modules avec `requires` et `default`. `scaffold.mjs` accepte `--config` et `--target`, écrit le manifeste (version du plugin, `config.date` figée depuis #81) et les bases de fusion; `audit.mjs` (#46) exporte `realExec` et `runAudit`. La CI installe OpenSpec et Archgate avant les commandes de `.bootstrap/checks.json` et fixe `CI=true`. Voir proposal.md pour la motivation et le commentaire de #50 pour les décisions du propriétaire.

## Goals / Non-Goals

**Goals:**
- Couvrir toute la matrice des modules et détecter tout changement de modèle involontaire.
- Valider la sortie du générateur avec les outils qu'elle utilise.
- Rester rapide et identique sur Linux, Windows et macOS.

**Non-Goals:**
- Modifier le générateur ou les modèles; évaluer le skill en CI.

## Decisions

**D1. Un second fichier, `tests/matrix.test.mjs`.** Le fichier existant est déjà long; la matrice a ses propres aides. Elle est lancée par une seconde commande de `.bootstrap/checks.json`, donc partout où tournent les tests (hook, `pre-push`, CI sur trois systèmes). Même convention de sortie que l'existant (`ok` / `FAIL`, code 1 si un échec).

**D2. Les combinaisons sont déduites du catalogue, pas listées à la main** : `core` seul; pour chaque autre module, lui plus la fermeture de ses `requires`; la sélection par défaut; la même avec `stack` choisie; la sélection complète; la sélection complète en public (les blocs `visibility-public`, comme `CI_OS_JSON`, n'existent qu'en public). Le nombre attendu est calculé (modules hors `core` + 5), jamais figé. Un module ajouté au catalogue produit sa combinaison, donc son instantané manquant fait échouer le test; un instantané qui ne correspond plus à aucune combinaison (module retiré ou renommé) fait échouer aussi.

**D3. Configuration déterministe.** Visibilité privée (publique pour la variante), `date`, versions des CLI, SHA et tags des actions fixés par des constantes de test, **indépendantes** des versions épinglées par la CI du dépôt. Le manifeste est listé sans empreinte : il porte la version du plugin.

**D4. Instantané = `{ "<chemin>": "<sha256>" | null }` trié par chemin**, dans `tests/snapshots/<combinaison>.json`, noms de fichiers en anglais (`default`, `default-stack`, `full`, `full-public`, puis un par module). Les empreintes portent sur les octets (le générateur écrit toujours en LF), tri par code d'unité UTF-16 sans `localeCompare` : identiques sur les trois systèmes. `.bootstrap/base/` est exclu (copies dérivées, contrôlées par un invariant). Un instantané manquant ou différent fait échouer avec les fichiers ajoutés, retirés ou modifiés et la commande `UPDATE_SNAPSHOTS=1 node tests/matrix.test.mjs`. Avec cette variable, les instantanés sont réécrits et les orphelins supprimés, mais les invariants restent contrôlés; la variable est **refusée quand `CI` est défini** (elle masquerait une régression si elle fuyait dans l'environnement de la CI, du hook ou du `pre-push`).

**D5. Invariants vérifiés sur chaque combinaison**, par lecture des fichiers générés : pas de `{{[A-Z0-9_]+}}` (même motif que le générateur; les `${{ matrix.os }}` de GitHub Actions n'y correspondent pas) ni de `@@module:` / `@@end`; JSON valides pour les `*.json`; fichiers du manifeste présents; clés sans antislash; aucun `\r\n`; base égale au fichier et présente pour tout fichier qui n'est ni fusionné (catalogue `merge`, réglages Claude) ni `owned`; seconde génération dans un autre dossier identique, manifeste compris; `scaffold --update --dry-run` immédiat avec les listes `created`, `updated`, `merged`, `reconciled`, `adopted`, `retired`, `baseInvalid`, `conflicts` vides et sans clé `manifest`. Les aides d'invariants et d'instantanés sont elles-mêmes testées (un faux dossier doit déclencher chaque problème).

**D6. Validation par les vraies CLI sur les sélections par défaut et complète.** Le projet est généré avec les **versions des CLI installées** (sondées par `--version`), pour que l'audit n'y voie pas d'écart; les instantanés, eux, gardent leurs constantes (D3). Dépôt git temporaire indépendant du poste : identité fixée, `commit.gpgsign=false`, `core.hooksPath` vide pendant l'initialisation et `--no-verify`, `pre-push` rendu exécutable puis `git update-index --chmod=+x` (nécessaire sous Windows où `core.fileMode` est faux), `core.hooksPath` réglé ensuite. Puis `openspec init --tools claude --language fr --no-animation`; `git diff --name-only` vide (l'initialisation ne modifie aucun fichier suivi : seuls `openspec/`, `.claude/skills/` et `.claude/commands/` apparaissent); `openspec validate --all --strict --no-interactive` (il répond « No items found » sur un projet sans changement : la valeur du contrôle est dans `init`, `doctor` et l'audit); `openspec doctor --json` sans erreur et dont la racine, comparée par `realpathSync.native` (nom court 8.3 sous Windows), est le projet; `archgate check`; `runAudit` avec zéro écart et, quand les deux CLI sont présentes, zéro contrôle non vérifiable. **Chaque CLI est traitée séparément** : absente, ses vérifications sont ignorées avec un message qui la nomme (hors CI) ou font échouer le test (`CI` défini).

**D7. Évaluation du skill.** `claude plugin eval` lance de vrais agents sur le compte de l'utilisateur, avec des juges LLM et une limite de débit partagée : écartée en CI (non déterministe, payante, identifiants à fournir). Un essai local est conduit une fois, plafonné par `--max-cost-usd`; son résultat est consigné dans `CONTRIBUTING` (décision et raison).

## Risks / Trade-offs

- [Chaque changement de modèle exige de régénérer les instantanés] → voulu : la différence est visible en revue; l'échec donne la commande.
- [Empreintes différentes selon le système] → octets bruts, tri explicite, bit exécutable hors empreinte; vérifié par la CI sur les trois systèmes.
- [Durée] → mesurée à une dizaine de secondes en local sous Windows (environ 45 lancements de Node et deux séries de CLI); signalée dans `CONTRIBUTING` car le hook `TaskCompleted` et le `pre-push` l'exécutent aussi.
- [`openspec validate` quasi vide sur un projet sans changement] → compensé par `init`, `doctor`, `archgate check` et l'audit.
- [Réseau et télémétrie] → `OPENSPEC_TELEMETRY=0` dans l'environnement des enfants (hérité de `realExec`); aucune télémétrie d'Archgate contrôlée ici.
- [Flakiness des CLI réelles] → un seul essai, sans réseau; un échec est un vrai problème de la sortie du générateur.
