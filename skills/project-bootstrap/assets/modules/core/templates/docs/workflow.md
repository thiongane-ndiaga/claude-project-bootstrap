# Workflow du dépôt

Chaque couche a un rôle :
@@module:github
**issue** = le besoin,
@@end
@@module:arc42
**arc42** = le contexte et les contraintes,
@@end
@@module:archgate
**ADR** = les décisions,
@@end
@@module:openspec
**changement OpenSpec** = le comportement attendu,
@@end
**Claude Code** = l'exécution,
@@module:github
**PR + CI** = la validation,
@@end
@@module:release
**Release** = la livraison.
@@end

## Étapes

@@module:github
- **Issue** via un formulaire : *Fonctionnalité*, *Bug* ou *Décision d'architecture* (label posé par le template : `bug`, `enhancement` ou `adr`).
@@end
@@module:projects
  Elle arrive dans le Project en *Todo* (auto-add) ; la carte passe en *In Progress* à la création de la branche, en *In Review* à l'ouverture de la PR.
@@end
@@module:archgate
- **ADR si requis** : issue de type décision, ou changement qui introduit ou remplace une technologie ou une dépendance, une contrainte transverse, un format de données, une interface externe, ou qui contredit un ADR. Exploration (agent `architecture-explorer`, éventuellement en équipe), puis `archgate adr create --title "…" --domain <domaine>`. Statut « Proposé » dans le corps, PR dédiée ; « Accepté » au merge.
@@end
- **Branche** `<type>/<N>-<slug>` (ex. `feat/12-password-reset`).
@@module:openspec
- **Changement OpenSpec** `/opsx:propose`, id `<N>-<slug>` → `openspec/changes/<N>-<slug>/`. `proposal.md` commence par `Issue: #N` et `ADR: …`. Revue par l'agent `spec-reviewer`.
- **Exécution** `/opsx:apply` ; commits atomiques en Conventional Commits (anglais).
- **Archivage** `/opsx:archive` **dans la PR, avant le merge** : les specs vivantes (`openspec/specs/`) sont à jour au moment du merge.
@@end
@@module:github
- **PR** : titre Conventional Commit, corps avec `Closes #N`. Agent `traceability-checker` avant de demander le merge.
- **Squash merge** : le titre de PR devient le commit sur `main` ; l'issue se ferme.
@@module:dependabot
- **PR de Dependabot** (`ci(deps): …`, branche `dependabot/…`) : seule exception à la branche `<type>/<issue>-<slug>` et à `Closes #N`. Relire le diff (SHA et commentaire de version), vérifier la CI, puis squash merge.
@@end
@@end
@@module:arc42
- **arc42** : la PR met à jour les sections impactées (agent `arc42-keeper`) ; la section 9 ne fait que pointer vers les ADR.
@@end
@@module:release
- **Release** : release-please tient à jour une PR « chore(main): release X.Y.Z » (`CHANGELOG.md`, `.release-please-manifest.json`). La merger crée le tag `vX.Y.Z` et la GitHub Release. Le déploiement est hors périmètre (futur ADR).
@@end

## Conventions de traçabilité

| Élément | Format | Exemple |
|---|---|---|
@@module:github
| Issue | `#N` | `#12` |
| Corps de PR | `Closes #N` | |
@@end
@@module:openspec
| Changement OpenSpec | `openspec/changes/N-<slug>/` | `12-password-reset` |
| Changement archivé (issue fermée) | `openspec/changes/archive/<AAAA-MM-JJ>-N-<slug>/` | `2027-01-15-12-password-reset` |
@@end
| Branche | `<type>/N-<slug>` | `feat/12-password-reset` |
| Commit / titre de PR | `<type>(<scope>): <description>` | `feat(auth): add password reset` |
@@module:archgate
| ADR | `<PREFIXE>-NNN-<slug>.md` dans `docs/architecture/adrs/` | `ARCH-006-…` |
@@end

Types : `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`, `perf`, `style`, `revert`.
@@module:release
Avant 1.0.0 : `feat` → patch, `feat!` → minor.
@@end

## Contrôles

| Où | Quoi | Bloquant |
|---|---|---|
@@module:claude
| Hook Claude `TaskCompleted` (agent teams) | `node .claude/hooks/quality-gate.mjs` | oui (tâche non close) |
@@end
@@module:githooks
| `.githooks/pre-push` (activé par `git config core.hooksPath .githooks`, une fois par clone) | même contrôle | oui (push annulé) |
@@end
@@module:github
| CI `ci.yml` | même contrôle + titre de PR (`scripts/check-pr-title.mjs`) | {{CI_BLOCKING_NOTE}} |
@@end
@@module:release
| PR de release-please | la CI attend une approbation (*Approve and run*) car déclenchée par le bot `github-actions` | — |
@@end

### Commandes du projet (tests, linter, types, build)

Les commandes propres à la stack se déclarent **à un seul endroit**, `.bootstrap/checks.json`, et sont exécutées par `.bootstrap/run-checks.mjs`, lu par le contrôle qualité local (donc le hook `TaskCompleted` et le `pre-push`) et par la CI :

```json
{ "name": "tests", "command": "npm test", "os": ["linux", "windows", "macos"], "blocking": true }
```

- `os` (facultatif) restreint la commande à certains systèmes ; `blocking: false` la signale sans bloquer.
- `ciOs` fixe les systèmes de la matrice de la CI (noms de runners GitHub).
- Pour les commandes qui exigent une chaîne d'outils (langage, dépendances), ajouter l'étape d'installation dans `.github/actions/project-setup/action.yml` (action propre au projet, appelée par `ci.yml` avant l'étape « Commandes du projet ») : `ci.yml` reste géré par le plugin.
- Ce fichier est propre au projet : une mise à jour du plugin ne doit pas l'écraser.

@@module:github
Claude Code utilise `gh` en lecture sans demander ; `gh issue create`, `gh pr create`, `gh pr merge`, `gh release create` demandent toujours une approbation.
@@end

## Nouveau poste (Windows natif ou Linux)

@@module:openspec|archgate|archgate-plugin|agent-teams|advisor
Les étapes marquées « optionnel » ne sont pas nécessaires au fonctionnement du dépôt.
@@end

1. **Prérequis** : Node.js ≥ 20.19 et git.
@@module:github
   Installer aussi [gh](https://cli.github.com), puis `gh auth login -h github.com -s project`.
@@end
@@module:openspec|archgate
1. **CLI aux versions épinglées du projet**
@@module:cli-npm-global
@@module:github
   (ce sont celles de `.github/workflows/ci.yml`)
@@end
@@end
@@module:cli-npm-global
@@module:openspec
@@module:cli-default
   - OpenSpec : `npm install -g @fission-ai/openspec@{{OPENSPEC_VERSION}}`
@@end
@@module:cli-user
   - OpenSpec : `npm install -g --prefix ~/.local @fission-ai/openspec@{{OPENSPEC_VERSION}}`
@@end
@@end
@@module:archgate
@@module:cli-default
   - Archgate : `npm install -g archgate@{{ARCHGATE_VERSION}}`
@@end
@@module:cli-user
   - Archgate : `npm install -g --prefix ~/.local archgate@{{ARCHGATE_VERSION}}`
@@end
@@end
@@end
@@module:cli-default
   - Si le préfixe npm n'est pas inscriptible (`npm config get prefix`, typiquement `/usr` sous Linux), ajouter `--prefix ~/.local` après avoir vérifié que `~/.local/bin` est dans le `PATH`. Pas de `sudo`.
@@end
@@module:cli-user
   - Mode d'installation : préfixe utilisateur (`cliInstall: user`). Vérifier que `~/.local/bin` est dans le `PATH`. Sous Windows ce mode équivaut au mode global : le préfixe npm y est déjà propre à l'utilisateur, retirer `--prefix ~/.local`. Le `--prefix` n'est pas mémorisé : le répéter à chaque mise à jour des CLI. Pas de `sudo`.
@@end
@@module:cli-local
   - Mode d'installation : local au dépôt (`cliInstall: local`). Les CLI sont dans les `devDependencies` de `package.json` (versions de `package-lock.json`) : `npm ci`, sans installation globale.
   - Les skills `/opsx:*` appellent `openspec` par son nom. Le hook de session `session-path.mjs` ajoute `node_modules/.bin` au `PATH` de l'outil Bash de Claude Code, et `quality-gate.mjs` comme la CI font de même : `claude` suffit. L'outil PowerShell et ton terminal personnel ne reçoivent pas ce `PATH` : lance alors `npm run claude` (options après `--`) ou préfixe la commande par `npx` (`npx openspec list`).
   - Mettre à jour une CLI : `npm install --save-dev --save-exact <paquet>@<version>`, puis committer `package.json` et `package-lock.json`.
@@end
1. **Télémétrie** (optionnel) :
@@module:openspec
   - `openspec config set telemetry.enabled false`
@@end
@@module:archgate
   - `archgate telemetry disable`
@@end
@@end
@@module:githooks
1. **Hooks git** : dans le clone, `git config core.hooksPath .githooks`.
@@end
@@module:archgate-plugin
1. **Plugin Archgate** (optionnel) : `archgate login`, puis `claude plugin marketplace add https://plugins.archgate.dev/archgate.git` et `claude plugin install archgate@archgate --scope local`. Retirer tout `"agent": "archgate:developer"` ajouté à `.claude/settings.local.json`.
@@end
@@module:agent-teams
1. **Agent teams** (optionnel) : `"env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }` dans `.claude/settings.local.json`. Affichage in-process par défaut ; split panes seulement sous tmux (`"teammateMode": "auto"` dans `~/.claude/settings.json`).
@@end
@@module:advisor
1. **Advisor** (optionnel, expérimental, payant) : réglage utilisateur, jamais écrit par le plugin. Dans Claude Code : `/advisor <modèle>` (par exemple `/advisor opus`), ou `"advisorModel"` dans les réglages. Le modèle doit être au moins aussi capable que le modèle principal, sinon il n'est pas attaché. Non disponible sur Bedrock, Google Cloud ni Foundry. `/advisor` sans argument ouvre le sélecteur et indique ce qui est disponible. C'est Claude qui décide de l'appeler : aucun réglage ne l'impose ni ne le plafonne. Coût : ses tokens s'ajoutent à ceux du modèle principal et chaque sous-agent en hérite. **Ne pas définir `DISABLE_TELEMETRY`** pour Claude Code : avec lui, comme avec `DO_NOT_TRACK`, `DISABLE_GROWTHBOOK` ou `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, l'advisor reste désactivé (la télémétrie d'OpenSpec et d'Archgate est un autre réglage).
@@end
@@module:claude
1. **Vérifier** : `node .claude/hooks/quality-gate.mjs` renvoie 0.
@@end

Ne jamais partager un même clone entre Windows et WSL.
