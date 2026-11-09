---
name: arc42-update
description: Update arc42 after an accepted ADR or the archiving of an OpenSpec change, touching only the impacted sections of docs/architecture/arc42/. Run by `architect`.
---

# arc42 update

Run it after an accepted ADR or the archiving of a change. You write only in `docs/architecture/arc42/`.

- Change only the impacted sections (often 4, 5, 8, 10, 11, 12).
- Summarize in one or two sentences with a relative link instead of copying an ADR or a spec.
- Keep section 9 a plain pointer to `docs/architecture/adrs/`.
- Invent nothing: leave the guiding question and flag it.
- Return the list of sections changed.
