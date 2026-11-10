---
name: adr-options-comparison
description: Compare the options of an architecture decision before writing the ADR (criteria, trade-offs, sources, recommendation). Run it for an architecture-decision issue or a change that introduces a technology, a cross-cutting constraint or a format. Run by `architect`.
---

# Option comparison before an ADR

You compare, you do not decide: the ADR is created afterwards with `archgate adr create`, and its acceptance belongs to the user.

1. Restate the decision to make, its constraints and what is out of scope.
2. Read the existing ADRs (`archgate adr list`, `archgate adr show <id>`): a rule already decided applies before proposing another.
3. Keep at least two options. For each: how it works, fit with each criterion drawn from the project's constraints and quality goals, costs (tooling and free tiers included), risks, reversibility.
4. Back every factual claim with a source you consulted (URL, ADR, repository file); mark it "not verified" otherwise.
5. Return a criteria × options table, a reasoned recommendation and the open questions.
