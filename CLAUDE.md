# project-bootstrap

Plugin Claude Code qui recrée l'outillage et le workflow de développement assisté par IA d'un projet.

Scripts Node.js (modules ES, aucune dépendance) ≥ 20.19 ; le plugin ne choisit aucune stack pour les projets qu'il génère.

## Langue
- Français : documentation, issues, descriptions de PR, artefacts de spec.
- Anglais : identifiants, noms de fichiers techniques, branches, messages de commit (Conventional Commits).

## Workflow
Le détail est dans `docs/workflow.md`.
- Besoin → issue GitHub (formulaire).
- Branche `<type>/<issue>-<slug>`.
- PR (`Closes #<issue>`) + CI → squash merge.
- Livraison → PR de release-please.

## Où trouver quoi
- Besoin : issues GitHub ; priorités dans le Project « claude-project-bootstrap ».
- Skill : `skills/project-bootstrap/SKILL.md` ; modèles : `skills/project-bootstrap/assets/templates/` (blocs `@@module:…`, paramètres `{{…}}`) ; catalogue : `assets/modules.json`.
- Pièges connus : `skills/project-bootstrap/references/pitfalls.md`.
- Tests : `tests/scaffold.test.mjs`.

## Règles
- Avant de déclarer une tâche terminée : `node .claude/hooks/quality-gate.mjs`.
- Ne modifie pas la version de `.claude-plugin/plugin.json` : release-please l'incrémente.
- Aucun nom de projet extérieur dans les fichiers, issues, PR ou commits.
- Les commandes `gh` qui écrivent (issue/pr/release create, merge) demandent toujours l'accord de l'utilisateur.

