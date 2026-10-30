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
- **Issue** via un formulaire : *Fonctionnalité*, *Bug* ou *Décision d'architecture* (label `type:*` posé par le template).
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

@@module:github
Claude Code utilise `gh` en lecture sans demander ; `gh issue create`, `gh pr create`, `gh pr merge`, `gh release create` demandent toujours une approbation.
@@end

## Nouveau poste (Windows natif ou Linux)

- Prérequis : Node.js ≥ 20.19 et git.
@@module:github
- [gh](https://cli.github.com), puis `gh auth login -h github.com -s project`.
@@end
@@module:openspec
- OpenSpec à la version épinglée du projet : `npm install -g @fission-ai/openspec@{{OPENSPEC_VERSION}}`.
@@end
@@module:archgate
- Archgate à la version épinglée du projet : `npm install -g archgate@{{ARCHGATE_VERSION}}`.
@@end
@@module:githooks
- Dans le clone : `git config core.hooksPath .githooks`.
@@end
@@module:archgate-plugin
- Plugin Archgate : `archgate login`, puis `claude plugin marketplace add https://plugins.archgate.dev/archgate.git` et `claude plugin install archgate@archgate --scope local`. Retirer tout `"agent": "archgate:developer"` ajouté à `.claude/settings.local.json`.
@@end
@@module:agent-teams
- Agent teams : `"env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }` dans `.claude/settings.local.json`. Affichage in-process par défaut ; split panes seulement sous tmux (`"teammateMode": "auto"` dans `~/.claude/settings.json`).
@@end
@@module:claude
- Vérifier : `node .claude/hooks/quality-gate.mjs` renvoie 0.
@@end

Ne jamais partager un même clone entre Windows et WSL.
