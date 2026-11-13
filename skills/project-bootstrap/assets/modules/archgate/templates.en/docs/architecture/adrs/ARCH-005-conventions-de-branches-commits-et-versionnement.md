---
id: ARCH-005
title: Branch, commit and versioning conventions
domain: architecture
rules: false
---

# Branch, commit and versioning conventions

## Status

Proposed.

## Context

The issue ↔ branch ↔ change ↔ PR links must be findable without tools, and the history must stay readable.
@@module:release
The changelog and the versions are derived from this history (ARCH-004).
@@end
Identifiers are in English; the documentation is in the project's language.

## Decision

@@module:issue-source
- **Branch**: `<type>/<issue>-<slug>`, in English, from `main`.
@@end
@@module:jira-source
- **Branch**: `<type>/<KEY-N>-<slug>`, in English, from `main`.
@@end
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org) in English; types `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`, `perf`, `style`, `revert`.
@@module:issue-source
- **PR**: title in the same format, because it becomes the squash commit on `main`; body with `Closes #N`.
@@end
@@module:jira-source
- **PR**: title in the same format, because it becomes the squash commit on `main`; body with `Refs <KEY-N>`.
@@end
@@module:dependabot
@@module:issue-source
- **Exception**: Dependabot PRs (branch `dependabot/…`, title `ci(deps): …`) have neither an issue nor `Closes #N`.
@@end
@@module:jira-source
- **Exception**: Dependabot PRs (branch `dependabot/…`, title `ci(deps): …`) have neither an issue nor `Refs <KEY-N>`.
@@end
@@end
@@module:github
- **Squash**: the repository keeps only the PR title as the squash commit (`squash_merge_commit_title=PR_TITLE`, `squash_merge_commit_message=BLANK`). No `Closes #N` in a commit: release-please would copy it into its release PR, which GitHub would count as a second closing PR.
@@end
@@module:release
- **Versioning**: [SemVer](https://semver.org), computed by release-please from the commits. Before 1.0.0, `feat` bumps the patch and a breaking change (`!`) the minor; first version `0.0.1`.
- **Tags**: `vX.Y.Z`, created by release-please when its release PR is merged; changelog in `CHANGELOG.md`.
@@end

## Do's and Don'ts

### Do

- One commit per logical step.
- Mention `Refs #N` in the body of intermediate commits.

### Don't

@@module:release
- Do not create a tag or a release by hand.
- Do not edit `CHANGELOG.md` or `.release-please-manifest.json`.
@@end
@@module:github
- Do not write `Closes #N` in a commit message (it goes in the PR body).
@@end
- Do not commit directly to `main`.

## Consequences

### Positive

- Readable history, links findable with a simple search.
@@module:release
- Automatic changelog and versions.

### Negative

- Only `feat` and `fix` commits appear in the changelog.
@@end

### Risks

- A malformed PR title skews the history: checked in the CI by `scripts/check-pr-title.mjs`.

## Compliance and Enforcement

@@module:github
The `pr-title` job of `ci.yml` checks the PR title. No Archgate rule: git history is not repository data that `archgate check` can read reliably.
@@end
@@module:gitlab
The `PR title` stage of the `Jenkinsfile` checks the PR title (`scripts/check-pr-title.mjs`). No Archgate rule: git history is not repository data that `archgate check` can read reliably.
@@end

## References

- https://www.conventionalcommits.org
- https://semver.org
