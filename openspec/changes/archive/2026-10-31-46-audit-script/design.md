## Context

Le plugin a trois scripts exécutables sur un projet (`scaffold.mjs`, `migrate.mjs`, `resolve-versions.mjs`), en modules ES sans dépendance. `scaffold.mjs --detect` et `--update --dry-run` donnent l'état du manifeste et des fichiers (la sortie 3, conflits, est un résultat normal); `migrate.mjs` exporte `runMigrations`, dont les `plan()` lisent l'état réel de la forge. Le quality-gate généré lance les CLI npm avec `spawnSync(commande, { shell: true })` et des arguments constants, parce que `openspec` est un raccourci `.cmd` sous Windows. `openspec doctor --json` et `archgate doctor --json` existent. Vérifié sur les vraies CLI : `openspec doctor --json` sort en 0 même en erreur (statut `error` dans le JSON) et remonte les dossiers parents; `archgate check` écrit `rules.d.ts` (ignoré par git) et un cache dans `~/.archgate`. Voir proposal.md pour la motivation et le commentaire de #46 pour les décisions du propriétaire.

## Goals / Non-Goals

**Goals:**
- Un rapport fiable et lisible des écarts connus, avec la correction proposée, sans effet de bord propre à l'audit.
- Réutiliser les outils existants plutôt que refaire leurs vérifications.
- Un script testable sans CLI externe ni réseau.

**Non-Goals:**
- Réparer; vérifier la cible d'« Auto-add » (non exposée par l'API); contrôler la taille de `CLAUDE.md` et des skills (`/doctor`).

## Decisions

**D1. `runAudit(options)` et un exécuteur injectable.** `runAudit({ target, forge, workstation, repo, project, owner, exec, home })` renvoie `{ results, summary }`; la ligne de commande n'est qu'une couche fine (options, affichage, code de sortie). Garde d'exécution directe avec `realpathSync` des deux côtés (comme `run-checks.mjs`; la comparaison de `path.resolve` casse avec les liens symboliques sous macOS). `exec(commande, args, options)` renvoie `{ status, stdout, stderr, error }` : implémentation réelle par `spawnSync`, **sans shell** pour `git`, `gh` et `node` (`process.execPath`), **avec** `shell: true` et arguments constants pour `openspec`, `archgate` et `npm`. Le dossier cible ne passe que par `cwd` ou `git -C`; `gh` est lancé avec `cwd` = dossier temporaire du système. L'environnement des CLI du projet contient `OPENSPEC_TELEMETRY=0`.

**D2. Résultats.** Un contrôle renvoie un ou plusieurs `{ id, statut, message, correction }`. Une exception devient `non-verifiable` avec le message. Avant d'appeler une CLI, l'audit la sonde (`<cli> --version`); un échec de lancement, le statut 127 (`sh`) ou 9009 (`cmd.exe`) donnent `non-verifiable` « CLI absente ». Un délai d'attente par commande donne `non-verifiable`.

**D3. Effets de bord et comparaison d'état.** L'audit n'utilise pas `git status` (qui rafraîchit l'index) : il lit `git ls-files -s`, `git ls-tree`, `git config`. Seuls effets tolérés des CLI appelées : `docs/architecture/rules.d.ts`, `.archgate/rules.d.ts` (ignorés par git) et `~/.archgate/cache/*.json`. Le test de non-modification compare les empreintes des fichiers suivis (`git ls-files`) et de `.git/index` avant et après, avec des CLI simulées; l'essai réel de la tâche 3.2 compare de même.

**D4. Manifeste et mise à jour : `node scaffold.mjs --update --dry-run` en processus enfant** (`process.execPath`). Lecture du rapport JSON : sont des écarts `created`, `updated`, `reconciled`, `conflicts` non vides et `baseInvalid` non vide; ne sont pas des écarts `merged` (fichiers partagés dont le projet a pu retirer une ligne), `retired` (signalé en information) et `manifest: "updated"` (l'empreinte des fichiers `kept` change sans qu'il y ait de mise à jour). Sortie 3 = résultat normal, 1 = erreur de l'outil (`non-verifiable`). Manifeste illisible = écart. Version : comparée à `.claude-plugin/plugin.json` du plugin exécuté.

**D5. Hooks git.** Racine git : `git -C <cible> rev-parse --show-toplevel` doit égaler la cible (réelle), sinon `non-verifiable`. Mode dans l'index (`git ls-files -s`) **et** dans le dernier commit (`git ls-tree HEAD`) : un 100755 non commité reste un écart pour les autres clones. Bit sur disque par `fs.statSync` hors Windows. `core.hooksPath` par `git config --get`.

**D6. Formulaires et labels.** Pour chaque formulaire, lecture de la clé `labels` sous trois formes : liste entre crochets, liste YAML en bloc, chaîne séparée par des virgules. Une clé présente mais non reconnue donne `non-verifiable`. Comparaison avec `labels.json` en minuscules; le même ensemble sert à `--forge` face aux labels réels (`gh api repos/<repo>/labels`).

**D7. Versions des CLI et actions.** `OPENSPEC_VERSION` et `ARCHGATE_VERSION` extraites de `ci.yml`, comparées à `config.versions` du manifeste et à `openspec --version` / `archgate --version`. Pour les actions, les SHA des lignes `uses:` de `ci.yml` et `release.yml` sont comparés à `config.actions` (`checkout`, `setupNode`, `releasePlease`) et entre les deux fichiers pour une même action. Un seul résultat par outil ou action, qui nomme les valeurs divergentes.

**D8. Outils du projet.** `archgate check`, `openspec validate --all --strict --no-interactive` et `openspec doctor --json` pour les modules actifs. Le code de sortie non nul est un écart avec le début de la sortie. Pour `openspec doctor`, lecture du JSON : `root.healthy === false` ou un `status[].severity === "error"` est un écart; si `root.path` (réel) n'est pas la cible, le résultat est `non-verifiable` (la commande remonte vers un dépôt parent).

**D9. Réglages et ADR d'exemple.** Lecture de `.claude/settings.json` et `.claude/settings.local.json` : `agent === "archgate:developer"` est un écart. Présence de `.archgate/adrs/GEN-001*` est un écart (ADR d'exemple créé par `archgate init`).

**D10. Protection de `main` (--forge).** Attendus : le nom affiché (`name:` du job, sinon sa clé) de tous les jobs de tous les workflows de `.github/workflows/`, les matrices développées quand elles sont littérales ou pilotées par `ciOs` de `.bootstrap/checks.json` (`checks (<système>)`). Contextes exigés lus par `gh api repos/<repo>/branches/main/protection` **et** `repos/<repo>/rules/branches/main` (rulesets, qui donnent 404 sur la première route). Un contexte attaché à une autre application que GitHub Actions (`app_id`) est `non-verifiable`; un contexte exigé absent des attendus est un écart; 404 ou 403 = `non-verifiable` (dépôt privé en plan gratuit).

**D11. Migrations (--forge).** L'audit importe les migrations du dossier `migrations/` et appelle `plan()` de **chaque migration applicable au projet** (modules requis présents), qu'elle soit consignée ou non : le consigné ne dit pas que l'état de la forge est resté conforme. Le `gh` fourni refuse toute écriture : méthode autre que GET (`-X`), `-f`/`-F` sans `-X GET` hors `graphql`, requête `graphql` contenant `mutation`. Une migration qui propose des actions est un écart qui les liste, notes comprises. Le dépôt vient de `--repo` ou du remote `origin` (même extraction que `migrate.mjs`), validé par `^[\w.-]+/[\w.-]+$`; introuvable = `non-verifiable`.

**D12. Automatisations du Project (--forge).** Requête GraphQL avec variables (`-f owner=… -F number=…`) : `repositoryOwner(login: $owner) { ... on ProjectV2Owner { projectV2(number: $number) { workflows(first: 50) { nodes { name enabled } } } } }`. « Auto-add to project », « Item closed » et « Pull request merged » doivent être activées; la cible d'« Auto-add » n'étant pas exposée, le message renvoie à la vérification manuelle (⋯ → Workflows). Sans `--project` et `--owner` : `non-verifiable`.

**D13. Poste de travail (--workstation).** Node ≥ 20.19 par `process.versions.node`; `git --version`; `gh auth status -h github.com` (stdout et stderr lus; sans ligne de scopes, `non-verifiable`) pour le scope `project` si le module `projects` est actif; préfixe npm : `npm config get prefix`, puis test d'écriture de `<prefix>/lib/node_modules` s'il existe (hors Windows). Plugin Archgate : `<CLAUDE_CONFIG_DIR ou ~/.claude>/plugins/installed_plugins.json`, entrées `archgate@archgate` de portée `user`, dont le `settings.json` de l'`installPath` contient une clé `agent`. `--workstation` peut contacter la forge (`gh auth status`) mais reste en lecture seule; le `home` est injectable.

**D14. Sortie et code de sortie.** Une ligne par contrôle (`ok`, `ECART`, `?`), les corrections des écarts, puis le compte par statut; si tous les contrôles sont `non-verifiable`, le résumé dit qu'aucun contrôle n'a pu être effectué. `--json` écrit l'objet complet. Codes : 0 sans écart, 1 avec au moins un écart, 2 pour une erreur d'usage (différent de `scaffold` et `migrate`, qui n'ont pas de notion de rapport : assumé).

**D15. Table « piège → contrôle »** (`pitfalls.md` et #46), suivie ligne à ligne par les tests :

| Piège | Contrôle ou exclusion |
|---|---|
| bit exécutable de `pre-push` non enregistré | D5 |
| `core.hooksPath` non réglé | D5 |
| `rules: false` à tort dans un ADR | D8 (`archgate check`, règle `adr-format`) |
| `agent` imposé par `archgate init` ou le plugin | D9 (projet), D13 (portée utilisateur) |
| ADR d'exemple `GEN-001` | D9 |
| versions des CLI qui divergent poste / CI / manifeste | D7 |
| mise à jour du plugin en attente, base invalide | D4 |
| formulaire qui pose un label absent | D6 (modèle), D10 (forge) |
| protection de `main` et noms de checks | D10 |
| permission des Actions pour release-please | D11 (migration `0001`) |
| automatisations du Project désactivées | D12 |
| « Auto-add » qui cible un autre dépôt | exclu : non exposé par l'API, renvoi à la vérification manuelle |
| préfixe npm `/usr` non inscriptible | D13 |
| plugin Archgate en portée utilisateur | D13 |
| `gh` absent du PATH, token sans scope `project` | D13 |
| `archgate login` sans credential helper | exclu : état de la machine hors projet, déjà couvert par `archgate doctor` |
| dépôt privé en plan gratuit sans protection | D10 (`non-verifiable` motivé) |
| permission du classificateur, redémarrage des agents | exclus : comportement de Claude Code, non vérifiable depuis un projet |

## Risks / Trade-offs

- [Faux positifs sur des projets légitimement adaptés] → l'audit se limite à des incohérences, pas à des écarts au modèle; fichiers adoptés, `merged`, `retired` et `manifest: updated` ne sont pas des écarts.
- [Pièges qui dépendent d'une version d'outil] → un outil absent, plus récent ou à la sortie inattendue donne `non-verifiable`.
- [Auditer exécute l'outillage du projet] : `archgate check` charge les `.rules.ts`, et sous Windows `cmd.exe` cherche d'abord `openspec.cmd` / `archgate.cmd` dans le dossier courant, c'est-à-dire la cible. → l'audit ne convient qu'à un dépôt de confiance (écrit dans le skill et le message d'usage); `git` et `gh` ne s'exécutent pas dans la cible. Si une politique d'exécution de l'outillage d'un dépôt audité devient nécessaire, elle relèvera d'un ADR.
- [Effets de bord des CLI appelées] → listés (D3), télémétrie coupée, jamais un fichier suivi par git.
- [Dérive entre le script et les modèles] → les formats lus (`labels`, variables de `ci.yml`, noms de jobs) sont ceux des modèles, couverts par des tests qui génèrent un vrai projet.
- [Temps d'exécution] → délai d'attente par commande, `non-verifiable` au dépassement.
