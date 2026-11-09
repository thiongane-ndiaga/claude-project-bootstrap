---
name: pr-readiness-review
description: Check before opening or merging a PR that the issue, change, branch, PR and ADR chain is complete, the PR template is filled in and CI is green. Read-only: returns a link / status / fix table. Run by `qa-engineer`.
---

# PR check before the merge

Check described in `docs/workflow.md`. You modify nothing and use no `gh` command that writes.

- Current branch (`git branch --show-current`) in the format `<type>/<issue>-<slug>`.
@@module:dependabot
- Exception: a `dependabot/…` branch (title `ci(deps): …`) has neither an issue nor `Closes #N`.
@@end
@@module:openspec
- OpenSpec change `openspec/changes/<issue>-<slug>/` (or archived under `openspec/changes/archive/`) whose `proposal.md` starts with `Issue: #<issue>` and `ADR: …`.
@@end
@@module:archgate
- Each cited ADR exists (`archgate adr show <id>`).
@@end
- Commits in Conventional Commits format (`git log main..HEAD --oneline`).
- The PR if any (`gh pr view` and `gh pr checks`): Conventional Commits title, `Closes #<issue>` in the body, template checklist filled in, checks green.
- The quality check passes (same commands as `.claude/hooks/quality-gate.mjs`).
@@module:arc42
- If the change touches the architecture: impacted arc42 sections cited in the PR.
@@end
- Return a link / status (OK, missing, inconsistent) / proposed fix table.
