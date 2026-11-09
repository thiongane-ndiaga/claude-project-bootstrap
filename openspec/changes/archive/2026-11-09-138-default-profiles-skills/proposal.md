Issue: #138
ADR: ARCH-016 (révisé : méthodes en skills), ARCH-013 (amendé : `project-lead` orchestrateur), ARCH-014 (amendé : `developer` par défaut), ARCH-012 (amendé : skills des profils), ARCH-011 (amendé : `disallowedTools`)

## Why

Avec `agent-profiles`, les devoirs du workflow (comparer des options avant un ADR, tenir arc42 à jour, relire une spec, contrôler une PR avant le merge, implémenter) ne peuvent reposer que sur des profils par défaut. `qa-engineer` cumule donc tests, revue de spec et traçabilité, `architect` porte deux méthodes dans son prompt, et `project-lead` écrit lui-même le code quand `developer`, optionnel, manque.

## What Changes

- `developer` est un profil par défaut : généré avec `agent-profiles`, retiré de `OPTIONAL_PROFILES`. Un `developer` encore listé dans `profiles` est ignoré avec un avertissement.
- `project-lead` est un orchestrateur : sa consigne dit qu'il ne produit ni code ni spec, et son frontmatter déclare `disallowedTools: Write, Edit, MultiEdit, NotebookEdit`. Il délègue sans condition à `architect`, `qa-engineer` et `developer`.
- Quatre skills de projet sont générées sous `.claude/skills/<nom>/SKILL.md` : `adr-options-comparison` (`archgate`), `arc42-update` (`arc42`), `spec-review` (`openspec`), `pr-readiness-review` (`github`). Elles reprennent les méthodes aujourd'hui écrites dans `architect` et `qa-engineer`, qui les citent.
- Table du hook : `architect` et `qa-engineer` reçoivent leurs skills ; `qa-engineer` reçoit l'outil `Skill`.
- Textes générés (`workflow.md`, `project-lead`, `devops-engineer`, modèles d'ADR) : ils nomment les skills.
- Pas de migration de fichiers : `scaffold.mjs --update` ajoute `developer.md` et les skills.

## Capabilities

### New Capabilities

- `profile-skills` : skills de projet portant les méthodes des profils.

### Modified Capabilities

- `agent-profiles` : profils par défaut, `project-lead` orchestrateur, clé `profiles`, outils, bornage des skills.
- `legacy-agents` : les méthodes absorbées vivent dans les skills.
- `advisor-module` : plus d'avertissement « sans profil concerné » (`developer` est toujours généré).

## Impact

- Module `agent-profiles` (`module.json`, modèles français et anglais des profils et des skills, `profile-guard.mjs` et son test), `catalog.mjs`, `scaffold.mjs`, modèle `workflow.md`, `SKILL.md`, `pitfalls.md`, tests et instantanés, ARCH-011 à ARCH-016, arc42 (sections 5, 8 et 11), `catalog.mjs` (`ADVISOR_PROFILES` retiré).
- Hors périmètre : vérifier sur une session réelle que `disallowedTools` s'applique à l'agent principal (#114) ; `context: fork` pour une revue de spec à contexte séparé ; les modules `sonar`, `jira`, `jenkins`, `gitlab` (#22 à #25).
