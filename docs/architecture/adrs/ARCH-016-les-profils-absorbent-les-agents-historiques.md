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

Les modules `archgate`, `arc42`, `openspec` et `github` génèrent quatre agents définis par une tâche : `architecture-explorer`, `arc42-keeper`, `spec-reviewer`, `traceability-checker`. Le module `agent-profiles` (ARCH-011 à ARCH-014) définit des agents par rôle. Deux familles d'agents ne doivent pas coexister dans un projet. Les compétences des anciens agents sont nécessaires à un bon workflow (comparer des options avant un ADR, tenir arc42 à jour, relire une spec, contrôler une PR avant le merge) : elles ne doivent dépendre d'aucun profil optionnel, et ne doivent pas alourdir le prompt d'un profil par défaut au point de lui faire cumuler les rôles.

## Decision

1. **Avec `agent-profiles`, les quatre agents ne sont pas générés.** Leurs méthodes sont quatre skills de projet, générées sous `.claude/skills/<nom>/SKILL.md` et nommées `<objet>-<action>` :
   - `adr-options-comparison` (module `archgate`) : comparer les options d'une décision d'architecture avant l'ADR ;
   - `arc42-update` (module `arc42`) : mettre à jour arc42 après un ADR accepté ou un changement archivé ;
   - `spec-review` (module `openspec`) : relire un changement OpenSpec avant `/opsx:apply` ;
   - `pr-readiness-review` (module `github`) : contrôler avant le merge la chaîne issue, changement, branche, PR, ADR, le modèle de PR et la CI.
2. **`architect` lance les deux premières, `qa-engineer` les deux autres**, dans son contexte et avec ses droits ; le corps du profil dit quand. Aucune skill n'utilise `context: fork` (agent hors de la table du hook).
3. **Aucun devoir ne dépend d'un profil optionnel** : `architect`, `qa-engineer`, `developer` et `project-lead` sont toujours générés.
4. **Sans `agent-profiles`, rien ne change.** Un pseudo-module `legacy-agents`, actif quand `agent-profiles` est absent, conditionne les fichiers des quatre agents et le hook `restrict-path.mjs` qui ne sert qu'à `arc42-keeper`.
5. **La table `PROFILES` n'a plus d'entrée pour les quatre agents** ; ses listes `agents` sont vides, les listes `skills` de `architect` et `qa-engineer` nomment leurs skills ; `qa-engineer` reçoit l'outil `Skill`.
6. **Une migration retire les fichiers des quatre agents** d'un projet existant, seulement s'ils sont égaux à leur copie de `.bootstrap/base` ; sinon ils sont conservés et signalés. Les skills arrivent par `--update`.
7. **Amende ARCH-011 (§6) et ARCH-012** : seul `project-lead` lance des agents (ARCH-012, ARCH-013) ; les tableaux de droits listent les skills.
8. **Les textes générés** qui nomment ces agents (`workflow.md`, ADR et modèles d'ADR) nomment la skill et le profil quand `agent-profiles` est actif, l'agent sinon.

## Do's and Don'ts

### Do

- Conditionner par `legacy-agents` tout fichier ou texte propre à un agent historique.
- Nommer une skill `<objet>-<action>` et la conditionner par le module dont elle dépend.
- Garder la même exigence de preuves dans la skill que dans l'ancien agent.

### Don't

- Ne pas supprimer un fichier modifié par le projet.
- Ne pas confier un devoir du workflow à un profil optionnel.
- Ne pas ajouter à une skill de profil un lancement d'agent ni `context: fork`.

## Consequences

### Positive

- Une seule famille d'agents par projet, bornée par le hook unique.
- Les prompts des profils restent courts : la méthode vit dans la skill.
- Les projets sans `agent-profiles` ne changent pas.

### Negative

- L'exploration en équipe, un explorateur par option, n'existe plus : un seul `architect` compare les options.
- La revue de spec n'a plus de contexte séparé : `qa-engineer` la fait dans le sien.
- Une skill est une consigne chargée dans le contexte du profil : rien n'oblige le profil à la lancer.

### Risks

- Le champ `skills` du frontmatter n'est pas appliqué aux teammates : la consigne de lancer la skill est dans le corps du profil.
- Un fichier modifié par le projet reste en place avec son hook de frontmatter et n'est plus borné par la table.

## Compliance and Enforcement

Tests de génération (absence des quatre fichiers et présence des quatre skills avec `agent-profiles`, présence des agents sans), de la migration (fichier intact retiré, fichier modifié conservé) et de la table du hook (skills permises, agents refusés).

## References

- Issues #110 et #138 ; changements OpenSpec `110-absorb-legacy-agents` et `138-default-profiles-skills`
- ARCH-010 (modules auto-décrits), ARCH-011, ARCH-012, ARCH-013, ARCH-014
