Issue: #159
ADR: ARCH-012 (amendé : `developer` lance `openspec-apply-change`, `architect` lance `archgate:cli-reference`), ARCH-011, ARCH-013, ARCH-016 et ARCH-006 (appliqués)

## Why

Avec `agent-profiles`, `project-lead` confie `/opsx:apply` à `developer`. Or `developer` n'a ni l'outil `Skill` ni skill permis dans la table du hook : il applique `tasks.md` de sa propre méthode, sans le skill `openspec-apply-change` que le projet tient à jour avec OpenSpec. `architect`, qui écrit les règles `.rules.ts` des ADR, ne peut pas non plus charger `archgate:cli-reference`, la référence des commandes et de l'API des règles.

Les skills `archgate:reviewer` et l'agent `archgate:planner` restent hors de la table : le premier lance des agents `general-purpose` que le hook refuse, le second n'a pas de `tools:` et porte donc tous les outils, `Agent` et `Write` compris (ARCH-012, décisions 3 et 4).

## What Changes

- `developer` : outil `Skill` (sans `Agent`) et `skills: ["openspec-apply-change", "opsx:apply"]` dans la table `PROFILES`. Tout autre skill reste refusé.
- `architect` : `archgate:cli-reference` ajouté à ses skills (module `archgate-plugin`).
- `developer.md` et `architect.md` (français et anglais) : lancer le skill nommé au lieu de suivre `tasks.md` de mémoire ; `developer` ne lance toujours aucun agent ni autre skill.
- `project-lead.md` : le brief de `/opsx:apply` demande à `developer` de lancer le skill.
- Tableau des droits d'ARCH-012 mis à jour ; `archgate:reviewer` et `archgate:planner` y sont cités comme exclus, avec leur motif.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `agent-profiles` : outils, skills permis et profil `developer`.

## Impact

`agent-profiles/templates*/.claude/hooks/profile-guard.mjs`, `agents/developer.md`, `agents/architect.md`, `agents/project-lead.md`, `agent-profiles/tests/profile-guard.test.mjs`, `tests/scaffold.test.mjs`, instantanés de `tests/snapshots/` des projets avec `agent-profiles`, `references/pitfalls.md` (table « Qui fait quoi »), ARCH-012, arc42 (sections 5 et 8). Les projets sans `agent-profiles` ne changent pas.
