---
name: pr-readiness-review
description: Check before opening or merging a PR that the issue, change, branch, PR and ADR chain is complete, the PR template is filled in and CI is green. Read-only: returns a link / status / fix table. Run by `qa-engineer`.
---

# PR check before the merge

Check described in `docs/workflow.md`. You modify nothing and use no `gh` command that writes.

@@module:issue-source
- Current branch (`git branch --show-current`) in the format `<type>/<issue>-<slug>`.
@@end
@@module:jira-source
- Current branch (`git branch --show-current`) in the format `<type>/<KEY-N>-<slug>`.
@@end
@@module:dependabot
@@module:issue-source
- Exception: a `dependabot/…` branch (title `ci(deps): …`) has neither an issue nor `Closes #N`.
@@end
@@module:jira-source
- Exception: a `dependabot/…` branch (title `ci(deps): …`) has neither an issue nor `Refs <KEY-N>`.
@@end
@@end
@@module:openspec
@@module:issue-source
- OpenSpec change `openspec/changes/<issue>-<slug>/` (or archived under `openspec/changes/archive/`) whose `proposal.md` starts with `Issue: #<issue>` and `ADR: …`.
@@end
@@module:jira-source
- OpenSpec change `openspec/changes/<key-n>-<slug>/` (or archived under `openspec/changes/archive/`) whose `proposal.md` starts with `Ticket: <KEY-N>` and `ADR: …`.
@@end
@@end
@@module:archgate
- Each cited ADR exists (`archgate adr show <id>`).
@@end
- Commits in Conventional Commits format (`git log main..HEAD --oneline`).
@@module:issue-source
- The PR if any (`gh pr view` and `gh pr checks`): Conventional Commits title, `Closes #<issue>` in the body, template checklist filled in, checks green.
@@end
@@module:jira-source
- The PR if any (`gh pr view` and `gh pr checks`): Conventional Commits title, `Refs <KEY-N>` in the body, template checklist filled in, checks green.
@@end
- The quality check passes (same commands as `.claude/hooks/quality-gate.mjs`).
@@module:arc42
- If the change touches the architecture: impacted arc42 sections cited in the PR.
@@end
- Return a link / status (OK, missing, inconsistent) / proposed fix table.
