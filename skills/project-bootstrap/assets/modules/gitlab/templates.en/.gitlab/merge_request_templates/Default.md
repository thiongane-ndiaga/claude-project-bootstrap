<!-- MR title: Conventional Commit in English, e.g. "feat(auth): add password reset" (without the Draft: prefix to merge) -->

Closes #
@@module:openspec

## OpenSpec change
`openspec/changes/<issue>-<slug>/` (archived under `openspec/changes/archive/` before the merge)
@@end
@@module:archgate

## ADR
<!-- PREFIX-NNN, ... or "none" -->
@@end

## Summary
<!-- What changes. -->

## Checklist
@@module:openspec
- [ ] `openspec validate --all --strict --no-interactive` passes
- [ ] OpenSpec change archived (`/opsx:archive`)
@@end
@@module:archgate
- [ ] `archgate check` passes
@@end
@@module:arc42
- [ ] Affected arc42 sections updated: <!-- e.g. 5, 8, or "none" -->
@@end
