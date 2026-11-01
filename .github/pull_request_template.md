<!-- Titre : Conventional Commit en anglais, ex. "fix(skill): detect non-writable npm prefix" -->

Closes #

## Changement OpenSpec
`openspec/changes/<issue>-<slug>/` (archivé sous `openspec/changes/archive/` avant le merge)

## ADR
<!-- PREFIXE-NNN, ... ou « aucun » -->

## Résumé
<!-- Ce qui change et pourquoi. -->

## Checklist
- [ ] `node tests/scaffold.test.mjs`, `node tests/matrix.test.mjs` et `node tests/state.test.mjs` passent (instantanés relus si un modèle a changé)
- [ ] `openspec validate --all --strict --no-interactive` passe
- [ ] Changement OpenSpec archivé (`/opsx:archive`)
- [ ] `archgate check` passe
- [ ] Sections arc42 impactées mises à jour : <!-- ex. 5, 8, ou « aucune » -->
- [ ] Type de commit adapté (`feat` ou `fix` pour une release, `docs`/`chore` sinon)
- [ ] Aucun nom de projet extérieur dans les fichiers, la description ou les commits
