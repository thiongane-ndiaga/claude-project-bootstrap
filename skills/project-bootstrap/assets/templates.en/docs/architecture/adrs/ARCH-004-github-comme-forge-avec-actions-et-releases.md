---
id: ARCH-004
title: GitHub as the forge, with Actions and Releases
domain: architecture
rules: true
---

# GitHub as the forge, with Actions and Releases

## Status

Proposed.

## Context

The project needs the whole cycle — ticket, tracking, review, CI, delivery — on the GitHub Free plan of a personal account. The repository is {{VISIBILITY_LABEL}}. Conditions checked on {{DATE}} on docs.github.com:
@@module:visibility-private
- in private, the Free plan offers neither protected branches nor rulesets;
- Actions has a limited monthly compute credit ({{ACTIONS_CREDIT_NOTE}}), usage being blocked beyond it without a payment method.
@@end
@@module:visibility-public
- in public, protected branches and rulesets are available on the Free plan;
- standard GitHub-hosted runners are free.
@@end

## Decision

- **GitHub** is the forge: Issues (YAML forms), pull requests with squash merge, Actions.
@@module:projects
- **Projects**: columns Todo, In Progress, In Review, Done; native automations (auto-add, item closed and PR merged → Done).
@@end
- **CI** (`.github/workflows/ci.yml`): {{CI_OS_TEXT}}.
@@module:release
- **Release** (`.github/workflows/release.yml`) through `googleapis/release-please-action` (Apache-2.0).
@@end
- Open source third-party actions only, **pinned to a commit SHA** (local `./…` actions excepted).
- No automation that consumes API tokens in CI without explicit agreement.
@@module:visibility-private
- Without branch protection, blocking is local: `.githooks/pre-push` runs the same check as the CI.
@@end
@@module:visibility-public
- The `main` branch is protected: the CI is a required check before merge.
@@end
- Claude Code goes through the `gh` CLI: reading is pre-approved, writing requires approval.

## Do's and Don'ts

### Do

@@module:githooks
- Enable `git config core.hooksPath .githooks` in each clone.
@@end
- Only merge a PR whose CI is green.

### Don't

@@module:visibility-private
- Do not add a Windows or macOS runner to the CI while the repository is private.
@@end
- Do not reference an action by a moving tag (`@v4`).

## Consequences

### Positive

- Complete cycle at no cost.
- Native traceability: `Closes #N`.

### Negative

@@module:visibility-private
- A merge with a red CI is not blocked on the server side.
@@end
@@module:release
- The CI of the release-please PR requires manual approval (run triggered by the bot).
@@end
- The Free plan conditions may change.

### Risks

- Change of the Free plan conditions: recheck on docs.github.com before adding any CI.

## Compliance and Enforcement

`ARCH-004-github-comme-forge-avec-actions-et-releases.rules.ts` checks the presence of the templates (`.github/ISSUE_TEMPLATE/`, `pull_request_template.md`), of the workflows, and that each `uses:` is pinned to a SHA.

## References

- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://github.com/github/docs : `data/reusables/gated-features/protected-branches.md`, `repo-rules.md`
@@module:release
- https://github.com/googleapis/release-please-action
@@end
