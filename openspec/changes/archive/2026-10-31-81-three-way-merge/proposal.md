Issue: #81
ADR: ARCH-006

## Why

Quand le modèle d'un fichier généré change, `scaffold.mjs --update` signale un conflit dès que le projet a modifié ce fichier, même loin des lignes que le modèle a touchées. Les projets doivent alors tout fusionner à la main à chaque version du plugin. ARCH-006 (accepté) retient une fusion à trois voies à partir d'une base conservée dans le projet.

## What Changes

- `scaffold.mjs` conserve, pour chaque fichier généré concerné, une copie de ce que le plugin avait produit (la « base ») dans `.bootstrap/base/`.
- À la mise à jour, un fichier modifié par le projet dont le modèle a changé est fusionné avec le nouveau modèle à partir de sa base ; une fusion sans conflit est écrite, un conflit est signalé avec une proposition, sans toucher au fichier.
- La date de génération est enregistrée dans la configuration du manifeste, pour que le contenu généré ne change pas d'un jour à l'autre sans que le modèle ait changé.
- Le manifeste distingue un fichier fusionné de façon à ce que la personnalisation du projet ne soit jamais écrasée aux mises à jour suivantes.
- Documentation : `references/versioning.md` et la phase « Mise à jour » de `SKILL.md`.

Hors périmètre : séparation de `CLAUDE.md` et de `ci.yml` (#82), mécanisme pour `docs/workflow.md` (#83), table d'empreintes des versions antérieures au manifeste (#84), marqueurs de zone, écriture de marqueurs de conflit dans les fichiers du projet.

## Capabilities

### New Capabilities
- `generated-files-update`: comportement de `scaffold.mjs` quand il met à jour des fichiers déjà générés : conservation de la base, fusion à trois voies, repli sur le conflit, idempotence.

### Modified Capabilities

## Impact

- Code : `skills/project-bootstrap/scripts/scaffold.mjs` (classification des fichiers et manifeste).
- Tests : `tests/scaffold.test.mjs`.
- Documentation : `skills/project-bootstrap/references/versioning.md`, `skills/project-bootstrap/SKILL.md`.
- Projets générés : un dossier `.bootstrap/base/` versionné s'ajoute à la première mise à jour ; nouveau statut `reconciled` dans le manifeste ; `config.date` enregistrée. `git` devient nécessaire à la fusion (déjà requis pour l'affichage des diffs).
