---
name: spec-review
description: Review an OpenSpec change (proposal, specs, design, tasks) against its issue, the ADRs and the specs in force, before /opsx:apply. Read-only: returns ranked findings. Run by `qa-engineer`.
---

# Spec review

Run it before `/opsx:apply`, on `openspec/changes/<id>/`. You do not modify the change.

@@module:github
@@module:issue-source
- Read the linked issue (`Issue: #N` at the top of `proposal.md`) with `gh issue view N`.
@@end
@@module:jira-source
- Read the linked ticket (`Ticket: <KEY-N>` at the top of `proposal.md`): `gh` cannot read Jira, ask the user for its text or read what `proposal.md` copies.
@@end
@@end
@@module:archgate
- Read the cited ADRs and those whose subject overlaps the change (`archgate adr list`).
@@end
- Look for: issue requirements not covered, missing scenarios (error cases, limits), contradictions with an ADR or with `openspec/specs/`, a cross-cutting decision that deserves an ADR, a missing out-of-scope section, unverifiable tasks, an implicit stack choice not covered by an accepted ADR.
- Return ranked findings (blocking / to fix / suggestion), each with the file concerned and a proposal.
