---
id: ARCH-001
title: Documentation d'architecture arc42 et ADR
domain: architecture
rules: true
---

# Documentation d'architecture arc42 et ADR

## Statut

Proposé.

## Context

Le projet démarre sans stack choisie et est développé seul, avec des agents IA qui ont besoin de contraintes explicites et lisibles. Les choix d'architecture à venir (stack, persistance, déploiement) doivent être justifiés et retrouvables, et la documentation doit rester légère.

## Decision

- La documentation d'architecture suit le gabarit **arc42**, à raison d'un fichier markdown par section, sous `docs/architecture/arc42/` (12 sections, numérotées `01` à `12`).
- Les décisions sont consignées en **ADR** gérés avec Archgate (voir ARCH-003). La section 9 d'arc42 ne fait que pointer vers eux.
- arc42 résume et renvoie, sans recopier les ADR ni les specs OpenSpec.

## Do's and Don'ts

### Do

- Mettre à jour les sections impactées dans la PR qui accepte un ADR ou archive un changement (agent `arc42-keeper`).
- Laisser une question-guide en place tant qu'aucune information fiable n'y répond.

### Don't

- Ne pas lister les ADR dans la section 9.
- Ne pas inventer de contenu pour remplir une section.

## Consequences

### Positive

- Structure connue et stable, facile à parcourir pour un humain comme pour un agent.
- Le pourquoi (ADR) est séparé du quoi (OpenSpec).

### Negative

- Douze fichiers à maintenir, dont plusieurs resteront vides tant que la stack n'est pas choisie.

### Risks

- Dérive entre arc42 et le code : atténuée par la checklist de PR et l'agent `arc42-keeper`.

## Compliance and Enforcement

`ARCH-001-documentation-d-architecture-arc42-et-adr.rules.ts` vérifie la présence des 12 sections, leur titre de niveau 1 numéroté et le renvoi de la section 9 vers `docs/architecture/adrs/`.

## References

- https://arc42.org
- `docs/workflow.md`
