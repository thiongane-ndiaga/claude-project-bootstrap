---
id: ARCH-002
title: Spec-driven workflow with OpenSpec
domain: architecture
rules: false
---

# Spec-driven workflow with OpenSpec

## Status

Proposed.

## Context

The code will largely be written by Claude Code agents. Without a prior description of the expected behavior, an agent fills the gaps with guesses. The need (issue) and the why (ADR) do not say precisely what the system must do.

## Decision

- Any behavior change goes through an **OpenSpec change** (`@fission-ai/openspec`, `spec-driven` schema): `/opsx:propose` → `/opsx:apply` → `/opsx:archive`.
- The change id is `<issue>-<slug>`; `proposal.md` starts with `Issue: #N` and `ADR: …`.
- Archiving happens **in the PR, before the merge**, so that `openspec/specs/` is up to date at merge time.
- Generated files (`.claude/skills/openspec-*`, `.claude/commands/opsx/`) are never edited by hand; the project's conventions live in `openspec/config.yaml`.
- `openspec validate --all --strict --no-interactive` is run by the Claude `TaskCompleted` hook, the pre-push hook and the CI.

## Do's and Don'ts

### Do

- Declare a capability named after a lasting behavior, not after the task.
- Use `skip_specs: true` for a change without behavior (refactoring, tooling).

### Don't

- Do not invent a requirement to satisfy the validation.
- Do not copy an ADR into `design.md`: link to it.

## Consequences

### Positive

- Expected behavior is explicit before execution, reviewed by `spec-reviewer`.
- Living specs that describe the real state of the system.

### Negative

- Writing overhead for small changes.
- Node.js ≥ 20.19 tooling prerequisite (or standalone binary), independent of the future stack.

### Risks

- Drift between the issue and the spec (for example a capability name different from the one announced in the issue): mitigated by `spec-reviewer` and `traceability-checker`.

## Compliance and Enforcement

`openspec validate --all --strict --no-interactive` (CI, pre-push, `TaskCompleted`). No Archgate rule: OpenSpec already validates its own structure.

## References

- https://github.com/Fission-AI/OpenSpec
- `openspec/config.yaml`, `docs/workflow.md`
