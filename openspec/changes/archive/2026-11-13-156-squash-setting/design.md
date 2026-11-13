## Contexte

Le commit de squash est l'unité lue par release-please et par GitHub pour lier une PR à une issue. Avec `squash_merge_commit_message=COMMIT_MESSAGES`, les messages des commits de la branche y sont copiés, `Closes #N` compris ; avec `PR_BODY`, c'est le corps de la PR, qui porte `Closes #N` par convention ; avec `squash_merge_commit_title=COMMIT_OR_PR_TITLE`, le titre peut venir d'un commit et non de la PR, alors qu'ARCH-005 dit que le titre de la PR devient le commit de squash. Le plugin règle déjà un paramètre de dépôt par migration (`0001-actions-pr-permission`) et l'audit `--forge` calcule les migrations en attente.

## Décisions

- **D1. Valeurs** : `squash_merge_commit_title=PR_TITLE` et `squash_merge_commit_message=BLANK` (titre de la PR seul, corps vide). Le titre de la PR est déjà contrôlé comme Conventional Commit (`pr-title`), donc c'est le commit voulu.
- **D2. Une migration**, pas un contrôle d'audit séparé : `0004-squash-title-only` (`modules: ["github"]`, `needsForge: true`) lit `repos/<repo>` et renvoie une action de réglage si l'un des deux paramètres diffère. Idempotente. Si le squash est désactivé (`allow_squash_merge: false`), aucune action mais une note : les commits arrivent alors sur `main` tels quels, `Closes #N` compris, alors que le workflow impose le squash. Si la réponse n'a pas les champs de squash (droits insuffisants), la migration lève une erreur que l'audit rend `non-verifiable`, au lieu d'un faux écart ; comme pour toute erreur `gh`, `migrate.mjs` s'arrête. L'audit la signale comme les autres (`migration-0004-squash-title-only`), `migrate.mjs` l'applique avec accord et la consigne au manifeste.
- **D3. Mise en place** : étape de `references/github-setup.md` (`gh api -X PATCH repos/<owner>/<repo> -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=BLANK`), avec accord comme les autres écritures ; `SKILL.md` la nomme dans les actions GitHub.
- **D4. Documents générés** (avec `github`, `release` ou non ; GitLab règle le squash autrement) : `docs/workflow.md` (ligne du squash merge) et ARCH-005 (puce « Squash » et un « Don't ») disent que le titre de la PR est le commit de squash et que `Closes #N` n'est jamais dans un commit. En mode `jira`, `workflow.md` dit que la clé doit figurer dans le titre de la PR, car les `Refs` des commits ne sont plus sur `main`. ARCH-005 et `docs/workflow.md` du plugin portent la même règle.
- **D6. Correction d'une migration consignée** : `migrate.mjs` ne rejoue pas une migration déjà consignée, alors que l'audit la recalcule. La correction de l'audit cite donc aussi la commande directe de chaque action (champ `command`) ; cela vaut pour toutes les migrations.
- **D5. Dépôt GitLab** : hors périmètre ; `docs/gitlab.md` dit déjà de régler le squash avec le titre de la MR comme message.

## Hors périmètre

Projets sans `github` ni `gitlab` : ni texte ni migration.

Contrôle de CI sur les messages de commit (le réglage suffit pour le squash ; les merges sans squash ne sont pas utilisés), GitLab, règle Archgate sur l'historique git.

## Risques

- Le réglage est par dépôt : un projet qui ne lance pas la migration garde l'ancien comportement ; l'audit le signale.
- Un merge en dehors du squash (merge commit, rebase) ne passe pas par ce réglage.
