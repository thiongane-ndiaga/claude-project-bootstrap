<!-- PR title: Conventional Commit in English, e.g. "feat(auth): add password reset" -->

@@module:issue-source
Closes #
@@module:jira
Jira: 
@@end
@@end
@@module:jira-source
Refs {{JIRA_KEY_EXAMPLE}}
@@end
@@module:openspec

## OpenSpec change
@@module:issue-source
`openspec/changes/<issue>-<slug>/` (archived under `openspec/changes/archive/` before the merge)
@@end
@@module:jira-source
`openspec/changes/<cle-n>-<slug>/` (archived under `openspec/changes/archive/` before the merge)
@@end
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
- [ ] Impacted arc42 sections updated: <!-- e.g. 5, 8, or "none" -->
@@end
