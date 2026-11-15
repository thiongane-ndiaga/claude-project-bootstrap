Issue: #169
ADR: ARCH-011, ARCH-012, ARCH-014 (appliqués, aucun à modifier)

# Proposal

## Why

La ligne `developer` de « Qui fait quoi » du `docs/workflow.md` généré présente dix éléments comme la liste des dossiers de gouvernance, alors que `writeExcept` du hook `profile-guard.mjs` en compte dix-sept. Un lecteur du tableau croit pouvoir écrire dans `openspec/config.yaml`, `CLAUDE.md` ou `release-please-config.json`, que le hook lui refuse. Rien ne garde les deux listes alignées : elles ont déjà divergé.

## What Changes

- La cellule « Écrit dans » de `developer` reprend exactement les 17 entrées de `writeExcept`, dans l'ordre du hook, en français et en anglais ; elle parle de « dossiers et fichiers » de gouvernance, car sept entrées sont des fichiers.
- La liste reste statique dans le modèle (pas de génération depuis le hook).
- Un test de génération compare, pour chaque langue, la liste du tableau généré à `writeExcept` du hook généré, et échoue en nommant l'entrée manquante, en trop ou déplacée.
- Les instantanés de la matrice des projets avec `agent-profiles` sont réécrits après relecture : seul le hash de `docs/workflow.md` change.

Hors périmètre : le comportement du hook (`writeExcept` ne change pas), le `docs/workflow.md` propre au dépôt (rafraîchi par la mise à jour du plugin), les textes qui ne citent qu'une partie de la liste à titre d'exemple (voir `design.md`), la génération de la liste depuis le hook, les autres profils. Les entrées qu'un projet ajoute à son propre hook ne sont pas vues par le test du plugin : il ne contrôle que les modèles du plugin.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `workflow-document`: nouvelle exigence sur la liste de gouvernance de `developer` dans « Qui fait quoi » (la capacité qui décrit ce tableau). La spec `agent-profiles` (« Dossiers de gouvernance interdits à developer ») énumère déjà les mêmes 17 entrées : elle ne change pas.

## Impact

- Modèles `skills/project-bootstrap/assets/modules/core/templates/docs/workflow.md` et `templates.en/docs/workflow.md` (ligne `developer`).
- `tests/scaffold.test.mjs` : bloc « docs/workflow.md : qui fait quoi » (nouveau test de cohérence).
- Instantanés `tests/snapshots/` : `agent-profiles`, `agent-profiles-main`, `agent-profiles-optional`, `advisor`, `advisor-on`, `full`, `full-en`, `full-public` ; pas `full-legacy` ni les projets sans `agent-profiles`.
- `skills/project-bootstrap/references/pitfalls.md` : consigne sur l'ajout d'une entrée à `writeExcept` et précision « dossiers et fichiers ».
- arc42 : la section 11 (risque de la liste d'exclusion) cite le test de cohérence, par `architect` ; la section 8 cite la liste en exemples (« dont »), aucune modification attendue.
- Aucun ADR modifié, aucun code du hook modifié.
