## 1. Migration et mise en place

- [x] 1.1 `migrations/0004-squash-title-only.mjs`
- [x] 1.2 `references/github-setup.md` : étape de réglage ; `SKILL.md` : action GitHub nommée 

## 2. Documents

- [x] 2.1 `docs/workflow.md` et ARCH-005 générés (avec `github`, français et anglais, variante Jira) ; ARCH-005 et `docs/workflow.md` du plugin
- [x] 2.2 Audit : la correction cite la commande directe de l'action

## 3. Tests

- [x] 3.1 `tests/scaffold.test.mjs` : migration (conforme, `COMMIT_MESSAGES`, `PR_BODY`, squash désactivé avec note, champs absents, vise le dépôt reçu), audit (écart, ok, consignée puis dérivée), application (`PATCH`, échec), documents ; la simulation de `gh` répond au point d'accès du dépôt, `forgeGh` aussi, avec vérification de `migration-0004` dans le cas sain et dans la table des écarts
- [x] 3.2 Instantanés relus (seuls `workflow.md` et ARCH-005 des projets `github` changent)
- [x] 3.3 arc42 sections 5 (migrations), 8 et 11 (via `arc42-keeper`)
- [x] 3.4 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `archgate check` et `openspec validate --all --strict` verts
