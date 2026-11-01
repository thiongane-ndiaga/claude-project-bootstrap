---
id: ARCH-001
title: Architecture documentation with arc42 and ADRs
domain: architecture
rules: true
---

# Architecture documentation with arc42 and ADRs

## Status

Proposed.

## Context

The project starts without a chosen stack and is developed alone, with AI agents that need explicit, readable constraints. Upcoming architecture choices (stack, persistence, deployment) must be justified and easy to find, and the documentation must stay light.

## Decision

- The architecture documentation follows the **arc42** template, one markdown file per section, under `docs/architecture/arc42/` (12 sections, numbered `01` to `12`).
- Decisions are recorded as **ADRs** managed with Archgate (see ARCH-003). Section 9 of arc42 only points to them.
- arc42 summarizes and refers, without copying ADRs or OpenSpec specs.

## Do's and Don'ts

### Do

- Update the impacted sections in the PR that accepts an ADR or archives a change (`arc42-keeper` agent).
- Leave a guiding question in place as long as no reliable information answers it.

### Don't

- Do not list the ADRs in section 9.
- Do not invent content to fill a section.

## Consequences

### Positive

- A known, stable structure, easy to browse for a human and for an agent.
- The why (ADR) is kept apart from the what (OpenSpec).

### Negative

- Twelve files to maintain, several of which will stay empty until the stack is chosen.

### Risks

- Drift between arc42 and the code: mitigated by the PR checklist and the `arc42-keeper` agent.

## Compliance and Enforcement

`ARCH-001-documentation-d-architecture-arc42-et-adr.rules.ts` checks the presence of the 12 sections, their numbered level-1 title and the link from section 9 to `docs/architecture/adrs/`.

## References

- https://arc42.org
- `docs/workflow.md`
