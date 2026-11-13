# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

@@module:stack-chosen
**Stack** : {{STACK}}.
@@end
@@module:stack-open
**La stack n'est pas choisie** : aucun langage, framework, base de données ni cible de déploiement
tant qu'une décision d'architecture ne l'a pas fixé. Node.js n'est qu'un prérequis d'outillage.
@@end

## Langue
- {{DOC_LANGUAGE_NAME}} : documentation, issues, descriptions de PR, artefacts de spec.
- Anglais : identifiants, noms de fichiers techniques, branches, messages de commit (Conventional Commits).

## Workflow
Le détail est dans `docs/workflow.md`.
@@module:github
@@module:issue-source
- Besoin → issue GitHub (formulaire).
@@end
@@module:jira-source
- Besoin → ticket Jira (table de lecture : `docs/jira.md`).
@@end
@@end
@@module:gitlab
- Besoin → issue GitLab (gabarit).
@@end
@@module:archgate
- Décision d'architecture → ADR créé avec Archgate, avant le changement.
@@end
@@module:issue-source
- Branche `<type>/<issue>-<slug>`.
@@end
@@module:jira-source
- Branche `<type>/<CLE-N>-<slug>`.
@@end
@@module:openspec
@@module:issue-source
- Comportement → `/opsx:propose` (id `<issue>-<slug>`) → `/opsx:apply` → `/opsx:archive` dans la PR.
@@end
@@module:jira-source
- Comportement → `/opsx:propose` (id `<cle-n>-<slug>`) → `/opsx:apply` → `/opsx:archive` dans la PR.
@@end
@@module:agent-profiles
- Avec `agent-profiles`, `project-lead` archive par `openspec archive <id> --yes` (son hook refuse `/opsx:archive`).
@@end
@@end
@@module:forge
@@module:issue-source
- PR (`Closes #<issue>`) + CI → squash merge.
@@end
@@module:jira-source
- PR (`Refs <CLE-N>`) + CI → squash merge.
@@end
@@end
@@module:release
- Livraison → PR de release-please.
@@end

## Où trouver quoi
@@module:github
@@module:issue-source
- Besoin : issues GitHub.
@@end
@@module:jira-source
- Besoin : tickets Jira.
@@end
@@end
@@module:gitlab
- Besoin : issues GitLab.
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
@@module:openspec|github|archgate|arc42

## Agents du projet
Voir `.claude/agents/`. Les agents « lecture seule » le sont par un hook qui ne s'applique pas quand
ils tournent en teammates (agent teams) : en équipe, seules les règles allow/ask du dépôt protègent.
@@end
@@end
@@module:agent-profiles

## Arbitrage
Dans l'échelle, « toi » désigne l'agent principal (`project-lead`). Les droits d'écriture de chaque agent sont appliqués par `.claude/hooks/profile-guard.mjs` (détail dans `docs/workflow.md`).

| Niveau | Situation | Qui tranche |
|---|---|---|
| 1 | La règle existe : ADR accepté, spec en vigueur, convention de `CLAUDE.md` | toi, en l'appliquant |
| 2 | Désaccord entre profils, mais une règle permet de conclure | toi, en citant la source |
| 3 | Désaccord sans règle applicable, risque modéré | toi, décision consignée ; en cas de doute, l'utilisateur ; contre-avis de `second-opinion` s'il existe |
| 4 | Décision structurante (stack, périmètre, sécurité) ou irréversible | l'utilisateur, après un ADR si nécessaire et le contre-avis de `second-opinion` s'il existe |
| 5 | Toute écriture visible à l'extérieur | l'utilisateur, toujours |
@@end
