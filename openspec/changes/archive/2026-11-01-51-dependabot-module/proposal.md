Issue: #51
ADR: aucun

## Why

Les projets générés épinglent chaque action GitHub sur un SHA de commit (`<sha> # <tag>`), ce qui est sûr mais vieillit : rien ne signale les nouvelles versions ni les correctifs de sécurité. Les modèles ne contiennent aucun fichier de mise à jour automatique des dépendances.

## What Changes

- Nouveau module **`dependabot`**, optionnel (`default: false`), qui requiert `github`.
- Le module génère `.github/dependabot.yml` : écosystème `github-actions`, mises à jour regroupées en une seule PR, préfixe de commit `ci` avec le scope `deps` (titre `ci(deps): …`, accepté par `scripts/check-pr-title.mjs`), délai d'ancienneté `cooldown` de 14 jours.
- Le module est proposé en phase 0 (ligne dans le tableau des modules de `SKILL.md`).
- L'audit n'exige plus l'égalité des SHA d'actions avec le manifeste quand le module est actif.
- Les documents générés signalent l'exception de traçabilité des PR de Dependabot (pas de branche `<type>/<issue>-<slug>` ni de `Closes #N`).
- La règle de choix des versions (par numéro, pas par date) et son articulation avec `resolve-versions.mjs` sont documentées dans `references/versioning.md`.
- La matrice de tests gagne une combinaison (`dependabot`) et la sélection complète inclut le module : instantanés ajoutés ou mis à jour.

Hors périmètre : autres écosystèmes (npm, pip, …), modification de `resolve-versions.mjs`.

## Capabilities

### New Capabilities
- `dependency-updates`: mise à jour automatique des actions épinglées dans les projets générés (module `dependabot`, fichier de configuration, compatibilité avec le contrôle du titre de PR et avec le délai d'ancienneté).

### Modified Capabilities
- `project-audit`: avec le module `dependabot`, le contrôle des actions épinglées ne compare plus les SHA des workflows à ceux du manifeste.

## Impact

- Modifiés : `skills/project-bootstrap/assets/modules.json`, `skills/project-bootstrap/SKILL.md` et `skills/project-bootstrap/references/versioning.md`.
- Modèles touchés par des blocs `@@module:dependabot` : `docs/workflow.md`, ARCH-005 et l'agent `traceability-checker` (exception de traçabilité).
- `skills/project-bootstrap/scripts/audit.mjs` (contrôle `actions-epinglees`), `tests/scaffold.test.mjs`, `references/github-free.md` et `references/verification.md`.
- Nouveau : `skills/project-bootstrap/assets/templates/.github/dependabot.yml`, `tests/snapshots/dependabot.json`.
- Mis à jour : `tests/snapshots/full.json` et `tests/snapshots/full-public.json` (le fichier et les exceptions s'ajoutent). Les autres instantanés ne changent pas.
- Projets existants : aucun effet tant que le module n'est pas ajouté ; un ajout ultérieur crée seulement `dependabot.yml`.
- Dépendance : Dependabot doit être activé côté dépôt (« Dependabot version updates » est disponible par défaut sur GitHub Free).
