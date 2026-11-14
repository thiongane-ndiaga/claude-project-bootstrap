# Workflow du dépôt

Chaque couche a un rôle :
**issue** = le besoin,
**arc42** = le contexte et les contraintes,
**ADR** = les décisions,
**changement OpenSpec** = le comportement attendu,
**Claude Code** = l'exécution,
**PR + CI** = la validation,
**Release** = la livraison.

## Étapes

- **Issue** via un formulaire : *Fonctionnalité*, *Bug* ou *Décision d'architecture* (label posé par le template : `bug`, `enhancement` ou `adr`).
  Elle arrive dans le Project en *Todo* (auto-add) ; la carte passe en *In Progress* à la création de la branche, en *In Review* à l'ouverture de la PR.
- **ADR si requis** : issue de type décision, ou changement qui introduit ou remplace une technologie ou une dépendance, une contrainte transverse, un format de données, une interface externe, ou qui contredit un ADR. Exploration (profil `architect`, skill `adr-options-comparison`), puis `archgate adr create --title "…" --domain <domaine>`. Statut « Proposé » dans le corps, PR dédiée ; « Accepté » au merge.
- **Branche** `<type>/<N>-<slug>` (ex. `feat/12-password-reset`).
- **Exploration** (facultative) `/opsx:explore`, avant un changement : un dialogue pour réfléchir, comparer et lever les ambiguïtés, avec lecture du dépôt mais sans code. Elle ne décide rien et débouche sur une issue, un ADR ou `/opsx:propose`. Inutile quand l'issue est claire et le changement petit.
- **Changement OpenSpec** `/opsx:propose`, id `<N>-<slug>` → `openspec/changes/<N>-<slug>/`. `proposal.md` commence par `Issue: #N` et `ADR: …`. Revue par le profil `qa-engineer` (skill `spec-review`).
- **Changement sans comportement** (documentation, outillage) : `skip_specs: true` dans le `.openspec.yaml` du changement ; aucun delta de spec n'est alors attendu ni créé.
- **Révision** `/opsx:update` : après une revue ou une surprise, révise les artefacts de planification (proposition, specs, conception, tâches) et les garde cohérents entre eux, jamais le code.
- **Exécution** `/opsx:apply` ; commits atomiques en Conventional Commits (anglais).
- **Qui exécute** : `developer` implémente en lançant le skill `openspec-apply-change` (`/opsx:apply`) ; `project-lead` archive par `openspec archive <id> --yes`, car les specs vivantes sont interdites à `developer`.
- **Synchronisation** `/opsx:sync` : reporte les deltas de specs d'un changement vers les specs en vigueur sans l'archiver ; `/opsx:archive` le fait aussi à l'archivage.
- **Archivage** `/opsx:archive` **dans la PR, avant le merge** : les specs vivantes (`openspec/specs/`) sont à jour au moment du merge.
- Avec `agent-profiles`, `project-lead` archive par `openspec archive <id> --yes` : son hook de bornage refuse `/opsx:archive` et `/opsx:sync`, qui éditent et déplacent des fichiers.
- **PR** : titre Conventional Commit, corps avec `Closes #N`. Le titre est contrôlé par la CI (job `pr-title`). Profil `qa-engineer` (skill `pr-readiness-review`) avant de demander le merge.
- **Squash merge** : le titre de PR devient le commit sur `main` (réglage de squash du dépôt : titre seul, jamais de `Closes #N` dans un commit) ; l'issue se ferme.
- **PR de Dependabot** (`ci(deps): …`, branche `dependabot/…`) : seule exception à la branche `<type>/<issue>-<slug>` et à `Closes #N`. Relire le diff (SHA et commentaire de version), vérifier la CI, puis squash merge.
- **arc42** : la PR met à jour les sections impactées (profil `architect`, skill `arc42-update`) ; la section 9 ne fait que pointer vers les ADR.
- **Release** : release-please tient à jour une PR « chore(main): release X.Y.Z » (`CHANGELOG.md`, `.release-please-manifest.json`). La merger crée le tag `vX.Y.Z` et la GitHub Release. Pas de déploiement : le plugin est installé depuis ce dépôt (marketplace).

## Qui fait quoi

Chaque agent généré dans `.claude/agents/` a une ligne. Les droits d'écriture sont ceux du hook `.claude/hooks/profile-guard.mjs` (table `PROFILES`) : un agent absent de la table n'est pas borné.

| Agent | Rôle dans les étapes | Écrit dans |
|---|---|---|
| `project-lead` | chef de projet orchestrateur (agent principal avec `mainAgent`) : brief, délégation, arbitrage, journal des décisions ; ne produit ni code ni spec | rien ; le hook lui refuse l'écriture, borne son shell au pilotage et ses agents aux profils |
| `architect` | décisions d'architecture, ADR, arc42 | `docs/architecture/` |
| `qa-engineer` | relecture du code et des specs, contrôle de traçabilité, tests, contrôles | `tests/`, `test/` |
| `product-owner` | besoin, priorités, critères d'acceptation | rien (lecture seule) |
| `developer` | code et commits | tout sauf les dossiers de gouvernance (`.archgate/`, `.bootstrap/`, `.claude/`, `.git/`, `.githooks/`, `.github/`, `docs/architecture/`, `openspec/specs/`, archives, `docs/workflow.md`) |
| `business-analyst` | changement OpenSpec (`/opsx:propose`, `/opsx:update`) | `openspec/changes/` |
| `acceptance-tester` | recette après la relecture de `qa-engineer` | rien (lecture seule) |
| `scout` | exploration factuelle du dépôt | rien (lecture seule) |
| `second-opinion` | contre-avis sur un brief neutre | rien (lecture seule) |
| `devops-engineer` | état de la CI, des PR et des releases | rien (lecture seule) |

## Échelle d'arbitrage

| Niveau | Situation | Qui tranche |
|---|---|---|
| 1 | La règle existe : ADR accepté, spec en vigueur, convention de `CLAUDE.md` | toi, en l'appliquant |
| 2 | Désaccord entre profils, mais une règle permet de conclure | toi, en citant la source |
| 3 | Désaccord sans règle applicable, risque modéré | toi, décision consignée ; en cas de doute, l'utilisateur ; contre-avis de `second-opinion` s'il existe |
| 4 | Décision structurante (stack, périmètre, sécurité) ou irréversible | l'utilisateur, après un ADR si nécessaire et le contre-avis de `second-opinion` s'il existe |
| 5 | Toute écriture visible à l'extérieur | l'utilisateur, toujours |

Le « toi » est le chef de projet. La source de vérité est ce qui est écrit dans le dépôt, pas les échanges ; deux tours de confrontation au plus avant d'arbitrer ; une ligne de trace de l'arbitrage dans la livraison (PR ou commit).

## Journal des décisions

Une décision structurante est consignée dans un ADR.
Une décision courante est consignée dans le message de livraison (PR ou commit).

## Conventions de traçabilité

| Élément | Format | Exemple |
|---|---|---|
| Issue | `#N` | `#12` |
| Corps de PR | `Closes #N` | |
| Changement OpenSpec | `openspec/changes/N-<slug>/` | `12-password-reset` |
| Changement archivé (issue fermée) | `openspec/changes/archive/<AAAA-MM-JJ>-N-<slug>/` | `2027-01-15-12-password-reset` |
| Branche | `<type>/N-<slug>` | `feat/12-password-reset` |
| Commit / titre de PR | `<type>(<scope>): <description>` | `feat(auth): add password reset` |
| ADR | `<PREFIXE>-NNN-<slug>.md` dans `docs/architecture/adrs/` | `ARCH-006-…` |

Types : `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`, `perf`, `style`, `revert`.
Avant 1.0.0 : `feat` → patch, `feat!` → minor.

## Contrôles

| Où | Quoi | Bloquant |
|---|---|---|
| Hook Claude `TaskCompleted` (agent teams) | `node .claude/hooks/quality-gate.mjs` = `openspec validate --all --strict --no-interactive` + `archgate check` + commandes de `.bootstrap/checks.json` | oui (tâche non close) |
| `.githooks/pre-push` (activé par `git config core.hooksPath .githooks`, une fois par clone) | même contrôle | oui (push annulé) |
| CI `ci.yml` | même contrôle sur Linux, Windows et macOS + titre de PR (`scripts/check-pr-title.mjs`) | oui : la protection de `main` exige ces checks |
| PR de release-please | la CI attend une approbation (*Approve and run*) car déclenchée par le bot `github-actions` | — |

### Commandes du projet (tests, linter, types, build)

Les commandes propres à la stack se déclarent **à un seul endroit**, `.bootstrap/checks.json`, et sont exécutées par `.bootstrap/run-checks.mjs`, lu par le contrôle qualité local (donc le hook `TaskCompleted` et le `pre-push`) et par la CI :

```json
{ "name": "tests", "command": "node tests/scaffold.test.mjs" }
```

- `os` (facultatif) restreint la commande à certains systèmes ; `blocking: false` la signale sans bloquer.
- `ciOs` fixe les systèmes de la matrice de la CI (noms de runners GitHub).
- Pour les commandes qui exigent une chaîne d'outils (langage, dépendances), ajouter l'étape d'installation dans `.github/actions/project-setup/action.yml` (action propre au projet, appelée par `ci.yml` avant l'étape « Commandes du projet ») : `ci.yml` reste géré par le plugin.
- Ce fichier est propre au projet : une mise à jour du plugin ne l'écrase pas (`owned` dans le catalogue).

Claude Code utilise `gh` en lecture sans demander ; `gh issue create`, `gh pr create`, `gh pr merge`, `gh release create` demandent toujours une approbation.

## Double encodage des règles

Une règle écrite dans `CLAUDE.md` n'est une consigne que tant que rien ne l'empêche. Chaque règle est ici avec son garde-fou (hook, permission, CI, règle Archgate) ou la mention « consigne seulement ». Toute nouvelle règle de `CLAUDE.md` reçoit sa ligne. Les contrôles et leur force (événement `TaskCompleted`, `pre-push`, CI) sont dans le tableau « Contrôles ».

| Règle | Garde-fou |
|---|---|
| Tout changement de comportement passe par un changement OpenSpec. | consigne seulement |
| Ne jamais éditer `.claude/skills/openspec-*` ni `.claude/commands/opsx/` (régénérés par `openspec update`). | consigne seulement pour l'agent principal |
| Ne jamais éditer `rules.d.ts` (régénéré par Archgate). | consigne seulement pour l'agent principal |
| ADR : `archgate adr create --title "…" --domain <domaine>`, puis vérifier que `rules:` dans le frontmatter correspond à la présence d'un `.rules.ts`. | règle de l'ADR ARCH-003 (`docs/architecture/adrs/ARCH-003-emplacement-et-format-des-adr.rules.ts`), exécutée par `archgate check` |
| Avant de déclarer une tâche terminée : `node .claude/hooks/quality-gate.mjs`. | `.claude/hooks/quality-gate.mjs`, lancé par l'événement `TaskCompleted` (agent teams seulement) |
| Les commandes `gh` qui écrivent (issue/pr/release create, merge) demandent toujours l'accord de l'utilisateur. | `.claude/settings.json` : ces commandes sont absentes de `allow`, donc demandées (ni en mode bypass, ni face à un `allow` posé par l'utilisateur) |
| Le titre d'une PR est un Conventional Commit. | `scripts/check-pr-title.mjs`, lancé par `.github/workflows/ci.yml` |
| Un profil n'écrit que dans son périmètre ; `developer` jamais sous `.claude/`, `docs/architecture/` (dont `rules.d.ts`) ni `openspec/specs/`, `architect` écrit dans `docs/architecture/`. | `.claude/hooks/profile-guard.mjs` |
| Un profil sans shell libre ne lance aucune commande `gh` d'écriture. | `.claude/hooks/read-only-bash.mjs`, appelé par `.claude/hooks/profile-guard.mjs` (sauf `developer`, au shell non borné, et `project-lead`, dont les commandes `gh issue` et `gh pr` d'écriture sont bornées par le hook) |
| Un profil n'appelle qu'un outil MCP de lecture (ou listé dans `mcpAllow`) et aucun skill à `context: fork`. | `.claude/hooks/profile-guard.mjs` (entrée `mcp__.*`) |
| Qui écrit ne relit pas : ce qu'écrivent les autres profils est relu par `qa-engineer`. | consigne seulement |
| `project-lead` ne produit ni code ni spec. | `.claude/agents/project-lead.md` (`disallowedTools`), `.claude/hooks/profile-guard.mjs` (écritures et shell) et consigne |

## Nouveau poste (Windows natif ou Linux)

Les étapes marquées « optionnel » ne sont pas nécessaires au fonctionnement du dépôt.

1. **Prérequis** : Node.js ≥ 20.19 et git.
   Installer aussi [gh](https://cli.github.com), puis `gh auth login -h github.com -s project`.
1. **CLI aux versions épinglées du projet**
   (ce sont celles de `.github/workflows/ci.yml`)
   - OpenSpec : `npm install -g @fission-ai/openspec@1.16.0`
   - Archgate : `npm install -g archgate@0.61.0`
   - Si le préfixe npm n'est pas inscriptible (`npm config get prefix`, typiquement `/usr` sous Linux), ajouter `--prefix ~/.local` après avoir vérifié que `~/.local/bin` est dans le `PATH`. Pas de `sudo`.
1. **Télémétrie** (optionnel) :
   - `openspec config set telemetry.enabled false`
   - `archgate telemetry disable`
1. **Hooks git** : dans le clone, `git config core.hooksPath .githooks`.
1. **Plugin Archgate** (optionnel) : `archgate login`, puis `claude plugin marketplace add https://plugins.archgate.dev/archgate.git` et `claude plugin install archgate@archgate --scope local`. Retirer tout `"agent": "archgate:developer"` ajouté à `.claude/settings.local.json`.
1. **Agent teams** (optionnel) : `"env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }` dans `.claude/settings.local.json`. Affichage in-process par défaut ; split panes seulement sous tmux (`"teammateMode": "auto"` dans `~/.claude/settings.json`).
1. **Advisor** (optionnel, expérimental, payant) : réglage utilisateur, jamais écrit par le plugin. Dans Claude Code : `/advisor <modèle>` (par exemple `/advisor opus`), ou `"advisorModel"` dans les réglages. Le modèle doit être au moins aussi capable que le modèle principal, sinon il n'est pas attaché. Non disponible sur Bedrock, Google Cloud ni Foundry. `/advisor` sans argument ouvre le sélecteur et indique ce qui est disponible. C'est Claude qui décide de l'appeler : aucun réglage ne l'impose ni ne le plafonne. Coût : ses tokens s'ajoutent à ceux du modèle principal et chaque sous-agent en hérite. **Ne pas définir `DISABLE_TELEMETRY`** pour Claude Code : avec lui, comme avec `DO_NOT_TRACK`, `DISABLE_GROWTHBOOK` ou `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, l'advisor reste désactivé (la télémétrie d'OpenSpec et d'Archgate est un autre réglage).
1. **Vérifier** : `node .claude/hooks/quality-gate.mjs` renvoie 0.

Ne jamais partager un même clone entre Windows et WSL.
