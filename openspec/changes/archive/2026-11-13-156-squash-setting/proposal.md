Issue: #156
ADR: ARCH-005 (amendé, plugin et modèle généré : le commit de squash est le titre de la PR, `Closes #N` dans le corps de la PR seulement), ARCH-004 et ARCH-006 (appliqués ; ARCH-004 reste inchangé : il décrit la forge et ses réglages de façon générale, la règle du commit de squash est une convention de branches et de commits, donc d'ARCH-005)

## Why

Un `Closes #N` dans le message d'un commit se retrouve dans le commit de squash, puis dans la PR de release-please (`closes [#N]`). GitHub la compte alors comme une seconde PR qui ferme l'issue déjà fermée, et le workflow natif du Project remet la carte en « In Progress » : six cartes sont restées bloquées ainsi. Le réglage de squash du dépôt décide de ce qui entre dans le commit ; le plugin ne le pose ni ne le vérifie.

## What Changes

- Migration `0004-squash-title-only` (module `github`) : lit le réglage de squash du dépôt et, s'il n'est pas « titre de la PR seul » (`squash_merge_commit_title=PR_TITLE`, `squash_merge_commit_message=BLANK`), propose de le régler. L'audit `--forge` la signale comme écart avec la correction, par le mécanisme existant des migrations ; `migrate.mjs` l'applique avec l'accord de l'utilisateur.
- `references/github-setup.md` : étape de réglage du squash, à faire à la mise en place du dépôt (avec accord) ; `SKILL.md` la cite parmi les actions GitHub.
- `docs/workflow.md` (modèle et plugin) et ARCH-005 générés (avec `github`, `release` ou non) : le titre de la PR est le commit de squash, `Closes #N` va dans le corps de la PR et `Refs #N` dans les commits. ARCH-005 du plugin : même règle.
- Tests de la migration (déjà conforme, à régler, squash désactivé, application), de l'audit et des documents.

## Capabilities

### New Capabilities

- `squash-setting` : réglage de squash du dépôt, sa migration, sa mise en place et sa vérification.

### Modified Capabilities

- `project-audit` : exigence ajoutée pour le contrôle du réglage de squash et sa correction directe.

## Impact

`migrations/0004-squash-title-only.mjs`, `references/github-setup.md`, `SKILL.md`, `references/versioning.md` si elle liste les migrations, `core` (`docs/workflow.md`), `archgate` (ARCH-005), ARCH-005 du plugin, arc42, tests et instantanés des projets avec `github` (texte de `workflow.md` et d'ARCH-005).
