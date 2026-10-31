---
id: ARCH-002
title: Workflow spec-driven avec OpenSpec
domain: architecture
rules: false
---

# Workflow spec-driven avec OpenSpec

## Statut

Proposé.

## Context

Le code sera largement écrit par des agents Claude Code. Sans description préalable du comportement attendu, un agent comble les vides par des suppositions. Le besoin (issue) et le pourquoi (ADR) ne disent pas précisément ce que le système doit faire.

## Decision

- Tout changement de comportement passe par un **changement OpenSpec** (`@fission-ai/openspec`, schéma `spec-driven`) : `/opsx:propose` → `/opsx:apply` → `/opsx:archive`.
- L'id du changement est `<issue>-<slug>` ; `proposal.md` commence par `Issue: #N` et `ADR: …`.
- L'archivage se fait **dans la PR, avant le merge**, pour que `openspec/specs/` soit à jour au moment du merge.
- Les fichiers générés (`.claude/skills/openspec-*`, `.claude/commands/opsx/`) ne sont jamais modifiés à la main ; les conventions du projet vivent dans `openspec/config.yaml`.
- `openspec validate --all --strict --no-interactive` est exécuté par le hook Claude `TaskCompleted`, le hook pre-push et la CI.

## Do's and Don'ts

### Do

- Déclarer une capability nommée d'après un comportement durable, pas d'après la tâche.
- Utiliser `skip_specs: true` pour un changement sans comportement (refactorisation, outillage).

### Don't

- Ne pas inventer une exigence pour satisfaire la validation.
- Ne pas recopier un ADR dans `design.md` : y faire un lien.

## Consequences

### Positive

- Comportement attendu explicite avant l'exécution, revu par `spec-reviewer`.
- Specs vivantes qui décrivent l'état réel du système.

### Negative

- Surcoût de rédaction pour les petits changements.
- Prérequis d'outillage Node.js ≥ 20.19 (ou binaire autonome), indépendant de la future stack.

### Risks

- Dérive entre l'issue et la spec (par exemple un nom de capability différent de celui annoncé dans l'issue) : atténuée par `spec-reviewer` et `traceability-checker`.

## Compliance and Enforcement

`openspec validate --all --strict --no-interactive` (CI, pre-push, `TaskCompleted`). Pas de règle Archgate : OpenSpec valide déjà sa propre structure.

## References

- https://github.com/Fission-AI/OpenSpec
- `openspec/config.yaml`, `docs/workflow.md`
