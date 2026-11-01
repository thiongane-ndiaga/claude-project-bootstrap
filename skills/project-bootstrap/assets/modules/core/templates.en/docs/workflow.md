# Repository workflow

Each layer has a role:
@@module:github
**issue** = the need,
@@end
@@module:arc42
**arc42** = the context and constraints,
@@end
@@module:archgate
**ADR** = the decisions,
@@end
@@module:openspec
**OpenSpec change** = the expected behavior,
@@end
**Claude Code** = the execution,
@@module:github
**PR + CI** = the validation,
@@end
@@module:release
**Release** = the delivery.
@@end

## Steps

@@module:github
- **Issue** through a form: *Feature*, *Bug* or *Architecture decision* (label set by the template: `bug`, `enhancement` or `adr`).
@@end
@@module:projects
  It lands in the Project in *Todo* (auto-add); the card moves to *In Progress* when the branch is created, to *In Review* when the PR is opened.
@@end
@@module:archgate
- **ADR if required**: a decision issue, or a change that introduces or replaces a technology or a dependency, a cross-cutting constraint, a data format, an external interface, or that contradicts an ADR. Exploration (`architecture-explorer` agent, possibly in a team), then `archgate adr create --title "…" --domain <domain>`. Status "Proposed" in the body, dedicated PR; "Accepted" at merge.
@@end
- **Branch** `<type>/<N>-<slug>` (e.g. `feat/12-password-reset`).
@@module:openspec
- **OpenSpec change** `/opsx:propose`, id `<N>-<slug>` → `openspec/changes/<N>-<slug>/`. `proposal.md` starts with `Issue: #N` and `ADR: …`. Review by the `spec-reviewer` agent.
- **Execution** `/opsx:apply`; atomic commits in Conventional Commits (English).
- **Archiving** `/opsx:archive` **in the PR, before the merge**: the living specs (`openspec/specs/`) are up to date at merge time.
@@end
@@module:github
- **PR**: Conventional Commit title, body with `Closes #N`. `traceability-checker` agent before asking for the merge.
- **Squash merge**: the PR title becomes the commit on `main`; the issue closes.
@@module:dependabot
- **Dependabot PR** (`ci(deps): …`, branch `dependabot/…`): the only exception to the `<type>/<issue>-<slug>` branch and to `Closes #N`. Review the diff (SHA and version comment), check the CI, then squash merge.
@@end
@@end
@@module:arc42
- **arc42**: the PR updates the impacted sections (`arc42-keeper` agent); section 9 only points to the ADRs.
@@end
@@module:release
- **Release**: release-please keeps a "chore(main): release X.Y.Z" PR up to date (`CHANGELOG.md`, `.release-please-manifest.json`). Merging it creates the `vX.Y.Z` tag and the GitHub Release. Deployment is out of scope (future ADR).
@@end

## Traceability conventions

| Item | Format | Example |
|---|---|---|
@@module:github
| Issue | `#N` | `#12` |
| PR body | `Closes #N` | |
@@end
@@module:openspec
| OpenSpec change | `openspec/changes/N-<slug>/` | `12-password-reset` |
| Archived change (issue closed) | `openspec/changes/archive/<YYYY-MM-DD>-N-<slug>/` | `2027-01-15-12-password-reset` |
@@end
| Branch | `<type>/N-<slug>` | `feat/12-password-reset` |
| Commit / PR title | `<type>(<scope>): <description>` | `feat(auth): add password reset` |
@@module:archgate
| ADR | `<PREFIX>-NNN-<slug>.md` in `docs/architecture/adrs/` | `ARCH-006-…` |
@@end

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`, `perf`, `style`, `revert`.
@@module:release
Before 1.0.0: `feat` → patch, `feat!` → minor.
@@end

## Checks

| Where | What | Blocking |
|---|---|---|
@@module:claude
| Claude `TaskCompleted` hook (agent teams) | `node .claude/hooks/quality-gate.mjs` | yes (task not closed) |
@@end
@@module:githooks
| `.githooks/pre-push` (enabled by `git config core.hooksPath .githooks`, once per clone) | same check | yes (push cancelled) |
@@end
@@module:github
| CI `ci.yml` | same check + PR title (`scripts/check-pr-title.mjs`) | {{CI_BLOCKING_NOTE}} |
@@end
@@module:release
| release-please PR | the CI waits for an approval (*Approve and run*) because it is triggered by the `github-actions` bot | — |
@@end

### Project commands (tests, linter, types, build)

Commands specific to the stack are declared **in a single place**, `.bootstrap/checks.json`, and run by `.bootstrap/run-checks.mjs`, read by the local quality check (hence the `TaskCompleted` hook and the `pre-push`) and by the CI:

```json
{ "name": "tests", "command": "npm test", "os": ["linux", "windows", "macos"], "blocking": true }
```

- `os` (optional) restricts the command to some systems; `blocking: false` reports it without blocking.
- `ciOs` sets the systems of the CI matrix (GitHub runner names).
- For commands that need a toolchain (language, dependencies), add the installation step in `.github/actions/project-setup/action.yml` (project-owned action, called by `ci.yml` before the "Project commands" step): `ci.yml` stays managed by the plugin.
- This file belongs to the project: a plugin update must not overwrite it.

@@module:github
Claude Code uses `gh` for reading without asking; `gh issue create`, `gh pr create`, `gh pr merge`, `gh release create` always ask for approval.
@@end

## New workstation (native Windows or Linux)

@@module:openspec|archgate|archgate-plugin|agent-teams|advisor-on
Steps marked "optional" are not needed for the repository to work.
@@end

1. **Prerequisites**: Node.js ≥ 20.19 and git.
@@module:github
   Also install [gh](https://cli.github.com), then `gh auth login -h github.com -s project`.
@@end
@@module:openspec|archgate
1. **CLIs at the project's pinned versions**
@@module:cli-npm-global
@@module:github
   (these are the ones in `.github/workflows/ci.yml`)
@@end
@@end
@@module:cli-npm-global
@@module:openspec
@@module:cli-default
   - OpenSpec: `npm install -g @fission-ai/openspec@{{OPENSPEC_VERSION}}`
@@end
@@module:cli-user
   - OpenSpec: `npm install -g --prefix ~/.local @fission-ai/openspec@{{OPENSPEC_VERSION}}`
@@end
@@end
@@module:archgate
@@module:cli-default
   - Archgate: `npm install -g archgate@{{ARCHGATE_VERSION}}`
@@end
@@module:cli-user
   - Archgate: `npm install -g --prefix ~/.local archgate@{{ARCHGATE_VERSION}}`
@@end
@@end
@@end
@@module:cli-default
   - If the npm prefix is not writable (`npm config get prefix`, typically `/usr` on Linux), add `--prefix ~/.local` after checking that `~/.local/bin` is in the `PATH`. No `sudo`.
@@end
@@module:cli-user
   - Installation mode: user prefix (`cliInstall: user`). Check that `~/.local/bin` is in the `PATH`. On Windows this mode is equivalent to the global mode: the npm prefix is already specific to the user, remove `--prefix ~/.local`. The `--prefix` is not remembered: repeat it at each CLI update. No `sudo`.
@@end
@@module:cli-local
   - Installation mode: local to the repository (`cliInstall: local`). The CLIs are in the `devDependencies` of `package.json` (versions from `package-lock.json`): `npm ci`, no global installation.
   - The `/opsx:*` skills call `openspec` by its name. The `session-path.mjs` session hook adds `node_modules/.bin` to the `PATH` of Claude Code's Bash tool, and `quality-gate.mjs` and the CI do the same: a plain `claude` is enough. The PowerShell tool and your own terminal do not receive this `PATH`: use `npm run claude` (options after `--`) or prefix the command with `npx` (`npx openspec list`).
   - Update a CLI: `npm install --save-dev --save-exact <package>@<version>`, then commit `package.json` and `package-lock.json`.
@@end
1. **Telemetry** (optional):
@@module:openspec
   - `openspec config set telemetry.enabled false`
@@end
@@module:archgate
   - `archgate telemetry disable`
@@end
@@end
@@module:githooks
1. **Git hooks**: in the clone, `git config core.hooksPath .githooks`.
@@end
@@module:archgate-plugin
1. **Archgate plugin** (optional): `archgate login`, then `claude plugin marketplace add https://plugins.archgate.dev/archgate.git` and `claude plugin install archgate@archgate --scope local`. Remove any `"agent": "archgate:developer"` added to `.claude/settings.local.json`.
@@end
@@module:agent-teams
1. **Agent teams** (optional): `"env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }` in `.claude/settings.local.json`. In-process display by default; split panes only under tmux (`"teammateMode": "auto"` in `~/.claude/settings.json`).
@@end
@@module:advisor-on
1. **Advisor** (optional, experimental, paid): a user setting, never written by the plugin. In Claude Code: `/advisor <model>` (for example `/advisor opus`), or `"advisorModel"` in the settings. The model must be at least as capable as the main model, otherwise it is not attached. Not available on Bedrock, Google Cloud or Foundry. `/advisor` without an argument opens the picker and shows what is available. Claude decides when to call it: no setting forces or caps it. Cost: its tokens add to the main model's and every subagent inherits it. **Do not set `DISABLE_TELEMETRY`** for Claude Code: with it, as with `DO_NOT_TRACK`, `DISABLE_GROWTHBOOK` or `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, the advisor stays off (OpenSpec and Archgate telemetry is a different setting).
@@end
@@module:claude
1. **Check**: `node .claude/hooks/quality-gate.mjs` returns 0.
@@end

Never share a single clone between Windows and WSL.
