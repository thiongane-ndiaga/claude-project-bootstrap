# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

**La stack n'est pas choisie** : aucun langage, framework, base de données ni cible de déploiement
tant qu'une décision d'architecture ne l'a pas fixé. Node.js n'est qu'un prérequis d'outillage.

## Langue
- {{DOC_LANGUAGE_NAME}} : documentation, issues, descriptions de PR, artefacts de spec.
- Anglais : identifiants, noms de fichiers techniques, branches, messages de commit (Conventional Commits).

## Workflow
Le détail est dans `docs/workflow.md`.
@@module:github
- Besoin → issue GitHub (formulaire).
@@end
@@module:archgate
- Décision d'architecture → ADR créé avec Archgate, avant le changement.
@@end
- Branche `<type>/<issue>-<slug>`.
@@module:openspec
- Comportement → `/opsx:propose` (id `<issue>-<slug>`) → `/opsx:apply` → `/opsx:archive` dans la PR.
@@end
@@module:github
- PR (`Closes #<issue>`) + CI → squash merge.
@@end
@@module:release
- Livraison → PR de release-please.
@@end

## Où trouver quoi
@@module:github
- Besoin : issues GitHub.
@@end
@@module:arc42
- Pourquoi et contraintes : `docs/architecture/arc42/`.
@@end
@@module:archgate
- Décisions : `docs/architecture/adrs/`.
@@end
@@module:openspec
- Quoi : `openspec/specs/` (en vigueur), `openspec/changes/` (en cours).
@@end

## Règles
@@module:openspec
- Tout changement de comportement passe par un changement OpenSpec.
- Ne jamais éditer `.claude/skills/openspec-*` ni `.claude/commands/opsx/` (régénérés par `openspec update`).
@@end
@@module:archgate
- Ne jamais éditer `rules.d.ts` (régénéré par Archgate).
- ADR : `archgate adr create --title "…" --domain <domaine>`, puis vérifier que `rules:` dans le
  frontmatter correspond à la présence d'un `.rules.ts` (la CLI écrit parfois `rules: false` à tort).
@@end
@@module:claude
- Avant de déclarer une tâche terminée : `node .claude/hooks/quality-gate.mjs`.
@@end
@@module:github
- Les commandes `gh` qui écrivent (issue/pr/release create, merge) demandent toujours l'accord de l'utilisateur.
@@end
@@module:claude

## Agents du projet
Voir `.claude/agents/`. Les agents « lecture seule » le sont par un hook qui ne s'applique pas quand
ils tournent en teammates (agent teams) : en équipe, seules les règles allow/ask du dépôt protègent.
@@end
