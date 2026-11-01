Issue: #117
ADR: aucun

## Why

Les suites de tests créent des projets jetables dans le dossier temporaire du système et ne les suppriment pas : sur un poste de développement, plus de 38 000 dossiers `pb-*` se sont accumulés. Chaque exécution complète en ajoute des centaines.

## What Changes

- Un module `tests/tmp-root.mjs`, importé en tête de chaque suite, redirige `TMPDIR`, `TEMP` et `TMP` (donc `os.tmpdir()`, pour la suite et ses processus enfants) vers un dossier propre à l'exécution, supprimé à la sortie, y compris sur échec.
- `KEEP_TMP=1` conserve ce dossier et affiche son chemin, pour déboguer un test en échec.
- Un test vérifie la suppression et la conservation.
- `CONTRIBUTING.md` documente `KEEP_TMP`.

## Capabilities

### New Capabilities

(aucune)

### Modified Capabilities

- `generator-test-suite` : la suite ne laisse aucun dossier temporaire.

## Impact

- `tests/tmp-root.mjs`, import dans `scaffold.test.mjs`, `matrix.test.mjs`, `state.test.mjs`, `modules.test.mjs`, un test dans `scaffold.test.mjs`, `CONTRIBUTING.md`.
- Aucun comportement du plugin ni fichier généré ne change : instantanés inchangés.
- Hors périmètre : suppression des dossiers déjà accumulés sur les postes (opération manuelle).
