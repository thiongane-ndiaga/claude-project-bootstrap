# project-bootstrap

Plugin Claude Code qui recrée l'outillage et le workflow de développement assisté par IA d'un projet.

Scripts Node.js (modules ES, aucune dépendance) ≥ 20.19 ; le plugin ne choisit aucune stack pour les projets qu'il génère.

## Langue
- Français : documentation, issues, descriptions de PR, artefacts de spec.
- Anglais : identifiants, noms de fichiers techniques, branches, messages de commit (Conventional Commits).

## Workflow
Le détail est dans `docs/workflow.md`.
- Besoin → issue GitHub (formulaire).
- Décision d'architecture → ADR créé avec Archgate, avant le changement.
- Branche `<type>/<issue>-<slug>`.
- Comportement → `/opsx:propose` (id `<issue>-<slug>`) → `/opsx:apply` → `/opsx:archive` dans la PR.
- PR (`Closes #<issue>`) + CI → squash merge.
- Livraison → PR de release-please.

## Où trouver quoi
- Besoin : issues GitHub ; priorités dans le Project « claude-project-bootstrap ».
- Pourquoi et contraintes : `docs/architecture/arc42/`.
- Décisions : `docs/architecture/adrs/`.
- Quoi : `openspec/specs/` (en vigueur), `openspec/changes/` (en cours).
- Skill : `skills/project-bootstrap/SKILL.md` ; modules : `skills/project-bootstrap/assets/modules/<nom>/` (`module.json`, modèles dans `templates/` avec blocs `@@module:…` et paramètres `{{…}}`) ; liste : `node skills/project-bootstrap/scripts/scaffold.mjs --list-modules`.
- Pièges connus : `skills/project-bootstrap/references/pitfalls.md`.
- Tests : `tests/scaffold.test.mjs` (comportements), `tests/matrix.test.mjs` (matrice des modules, instantanés dans `tests/snapshots/`) et `tests/state.test.mjs` (état de reprise, journal des effets) ; ensemble : `node .bootstrap/run-checks.mjs`.

## Règles
- Tout changement de comportement passe par un changement OpenSpec.
- Ne jamais éditer `.claude/skills/openspec-*` ni `.claude/commands/opsx/` (régénérés par `openspec update`).
- Ne jamais éditer `rules.d.ts` (régénéré par Archgate).
- ADR : `archgate adr create --title "…" --domain <domaine>`, puis vérifier que `rules:` dans le
  frontmatter correspond à la présence d'un `.rules.ts` (la CLI écrit parfois `rules: false` à tort).
- Avant de déclarer une tâche terminée : `node .claude/hooks/quality-gate.mjs`.
- Ne modifie pas la version de `.claude-plugin/plugin.json` : release-please l'incrémente.
- Aucun nom de projet extérieur dans les fichiers, issues, PR ou commits.
- Les commandes `gh` qui écrivent (issue/pr/release create, merge) demandent toujours l'accord de l'utilisateur.

## Agents du projet
Voir `.claude/agents/`. Les agents « lecture seule » le sont par un hook qui ne s'applique pas quand
ils tournent en teammates (agent teams) : en équipe, seules les règles allow/ask du dépôt protègent.
