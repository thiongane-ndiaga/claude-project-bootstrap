---
id: ARCH-016
title: Les profils absorbent les agents historiques
domain: architecture
rules: false
files: ["skills/project-bootstrap/assets/modules/agent-profiles/**", "skills/project-bootstrap/assets/modules/archgate/templates/**", "skills/project-bootstrap/assets/modules/core/templates/docs/workflow.md", "skills/project-bootstrap/scripts/catalog.mjs", "skills/project-bootstrap/scripts/scaffold.mjs", "skills/project-bootstrap/migrations/**"]
---

# Les profils absorbent les agents historiques

## Statut

Accepté.

## Context

Les modules `archgate`, `arc42`, `openspec` et `github` génèrent quatre agents définis par une tâche : `architecture-explorer`, `arc42-keeper`, `spec-reviewer`, `traceability-checker`. Le module `agent-profiles` (ARCH-011 à ARCH-014) définit des agents par rôle. Les profils `architect` et `qa-engineer` lançaient les quatre agents (ARCH-012) : deux familles d'agents coexistaient dans le même projet. L'utilisateur veut que les agents d'un projet soient les profils, et que les compétences des anciens agents leur soient intégrées.

## Decision

1. **Avec `agent-profiles`, les quatre agents ne sont pas générés.** Leurs méthodes passent dans les prompts : l'exploration d'options et la mise à jour d'arc42 dans `architect` (qui écrit déjà dans `docs/architecture/`), la revue de spec et le contrôle de traçabilité dans `qa-engineer`.
2. **Sans `agent-profiles`, rien ne change.** Un pseudo-module `legacy-agents`, actif quand `agent-profiles` est absent, conditionne les fichiers des quatre agents et le hook `restrict-path.mjs` qui ne sert qu'à `arc42-keeper`.
3. **La traçabilité va à `qa-engineer`** et non à `devops-engineer` : un devoir par défaut ne peut pas reposer sur un profil optionnel. `devops-engineer` garde la lecture de la CI et des releases.
4. **La table `PROFILES` perd les entrées des quatre agents** ; `architect` et `qa-engineer` n'ont plus d'agent lançable.
5. **Une migration retire les fichiers absorbés** d'un projet déjà généré avec `agent-profiles`, seulement s'ils sont égaux à leur copie de `.bootstrap/base` ; un fichier modifié ou sans copie est conservé et signalé.
6. **Amende ARCH-011 (§6) et ARCH-012** : les profils ne lancent plus d'agent ; les tableaux de droits en tiennent compte.
7. **Les textes générés** qui nomment ces agents (`workflow.md`, ADR et modèles d'ADR) nomment le profil quand `agent-profiles` est actif, l'agent sinon.

## Do's and Don'ts

### Do

- Conditionner par `legacy-agents` tout fichier ou texte propre à un agent historique.
- Garder la méthode des anciens agents dans le profil qui les absorbe, avec la même exigence de preuves.

### Don't

- Ne pas supprimer un fichier modifié par le projet.
- Ne pas confier un devoir par défaut à un profil optionnel.

## Consequences

### Positive

- Une seule famille d'agents par projet, bornée par le hook unique.
- Les projets sans `agent-profiles` ne changent pas.

### Negative

- L'exploration en équipe, un explorateur par option, n'existe plus : un seul `architect` compare les options.
- La revue de spec n'a plus de contexte séparé : `qa-engineer` la fait dans le sien.

### Risks

- Les prompts de `architect` et de `qa-engineer` s'allongent.
- Un fichier modifié par le projet reste en place avec son hook de frontmatter et n'est plus borné par la table.

## Compliance and Enforcement

Tests de génération (absence des quatre fichiers avec `agent-profiles`, présence sans), de la migration (fichier intact retiré, fichier modifié conservé) et de la table du hook.

## References

- Issue #110 ; changement OpenSpec `110-absorb-legacy-agents`
- ARCH-010 (modules auto-décrits), ARCH-011, ARCH-012, ARCH-014
