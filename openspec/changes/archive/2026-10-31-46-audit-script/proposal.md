Issue: #46
ADR: aucun

## Why

De nombreux pièges ont été trouvés à la main après la génération d'un projet : bit exécutable du `pre-push` non enregistré, `core.hooksPath` non réglé, formulaire qui pose un label absent du dépôt, versions des CLI qui divergent entre le poste et la CI, mise à jour du plugin en attente, protection de `main` qui exige des checks renommés. Chacun est détectable par un contrôle mécanique, mais aucun ne l'est aujourd'hui : on le découvre en cas de panne.

## What Changes

- Nouveau script `skills/project-bootstrap/scripts/audit.mjs --target <dépôt>`, en lecture seule, qui inspecte un projet généré et rapporte chaque écart avec la correction proposée. Il ne modifie rien.
- Contrôles locaux, sans appel réseau de l'audit lui-même : manifeste, mise à jour en attente, bases de fusion, hooks git, cohérence formulaires et labels, versions épinglées des CLI et des actions, réglages du projet, et les CLI du projet (`archgate check`, `openspec validate`, `openspec doctor`), lancées avec la télémétrie coupée.
- Option `--forge` (lecture seule, accord de l'utilisateur) : labels du dépôt, protection de `main` face aux jobs de `ci.yml`, simulation des migrations, automatisations du Project.
- Option `--workstation` : contrôles du poste (Node, git, `gh` et son scope `project`, préfixe npm, plugin Archgate qui impose un agent).
- Le skill lance l'audit à la fin de la phase 3 (vérification) et après chaque mise à jour du projet.

Hors périmètre : réparer automatiquement (l'audit propose, le skill fait faire), vérifier la cible de l'automatisation « Auto-add » du Project (l'API ne l'expose pas), tailles de `CLAUDE.md` et des skills (renvoi vers `/doctor` de Claude Code).

## Capabilities

### New Capabilities
- `project-audit`: inspection en lecture seule d'un projet généré (et, sur option, de sa forge et du poste), avec un rapport par contrôle et une correction proposée pour chaque écart.

### Modified Capabilities

## Impact

- Nouveau : `skills/project-bootstrap/scripts/audit.mjs`.
- Tests : `tests/scaffold.test.mjs` (projets temporaires avec git réel, CLI et `gh` simulés).
- Documentation : `SKILL.md` (phase 3 et phase 5), `references/verification.md`, `references/versioning.md`.
- Aucun impact sur les projets générés : le script reste dans le plugin, rien n'est ajouté aux modèles.
