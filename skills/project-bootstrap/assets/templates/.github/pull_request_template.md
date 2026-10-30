<!-- Titre de la PR : Conventional Commit en anglais, ex. "feat(auth): add password reset" -->

Closes #
@@module:openspec

## Changement OpenSpec
`openspec/changes/<issue>-<slug>/` (archivé sous `openspec/changes/archive/` avant le merge)
@@end
@@module:archgate

## ADR
<!-- PREFIXE-NNN, ... ou « aucun » -->
@@end

## Résumé
<!-- Ce qui change. -->

## Checklist
@@module:openspec
- [ ] `openspec validate --all --strict --no-interactive` passe
- [ ] Changement OpenSpec archivé (`/opsx:archive`)
@@end
@@module:archgate
- [ ] `archgate check` passe
@@end
@@module:arc42
- [ ] Sections arc42 impactées mises à jour : <!-- ex. 5, 8, ou « aucune » -->
@@end
