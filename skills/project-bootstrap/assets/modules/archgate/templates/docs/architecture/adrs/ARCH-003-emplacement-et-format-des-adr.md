---
id: ARCH-003
title: Emplacement et format des ADR
domain: architecture
rules: true
---

# Emplacement et format des ADR

## Statut

Proposé.

## Context

Archgate range par défaut ses ADR dans `.archgate/adrs/`. Le projet veut une documentation d'architecture regroupée sous `docs/architecture/` (ARCH-001). Archgate n'a pas de champ de statut dans son frontmatter, et `archgate adr create --rules` (v0.61.0) écrit `rules: false` alors qu'il crée le fichier `.rules.ts`.

## Decision

- Les ADR vivent dans `docs/architecture/adrs/`, configuré par `paths.adrs` dans `.archgate/config.json`. Le dossier `.archgate/` reste présent : il sert à repérer la racine du projet.
- Les fichiers suivent `<PREFIXE>-NNN-<slug>.md`, avec un `<PREFIXE>-NNN-<slug>.rules.ts` compagnon quand `rules: true`.
- Le frontmatter contient `id`, `title`, `domain` et `rules` ; l'`id` reprend le préfixe du nom de fichier.
- Le statut figure dans le corps, sous `## Statut`, et commence par **Proposé**, **Accepté**, **Rejeté**, **Remplacé** ou **Obsolète**.
- Les ADR se créent avec `archgate adr create`, les règles uniquement si elles sont vérifiables.

## Do's and Don'ts

### Do

- Vérifier que `rules:` concorde avec la présence du `.rules.ts` après un `adr create --rules`.
- Indiquer dans `## Statut` l'issue qui porte la décision.

### Don't

- Ne pas éditer `docs/architecture/rules.d.ts` ni `.archgate/rules.d.ts` : ils sont régénérés par Archgate et ignorés par git.

## Consequences

### Positive

- Toute la documentation d'architecture est au même endroit.
- Le défaut de la CLI est détecté automatiquement.

### Negative

- Chemin non standard : les skills du plugin Archgate supposent parfois `.archgate/adrs/`.

### Risks

- Une mise à jour d'Archgate change le comportement de `paths.adrs` : `archgate adr list` et la CI le révéleraient.

## Compliance and Enforcement

`ARCH-003-emplacement-et-format-des-adr.rules.ts` vérifie, pour chaque ADR : nom de fichier, `id` cohérent, `domain` présent, concordance `rules:` ⇔ `.rules.ts`, et section `## Statut` avec une valeur autorisée. Il signale aussi tout ADR resté dans `.archgate/adrs/`.

## References

- https://cli.archgate.dev/reference/configuration/
- https://cli.archgate.dev/reference/adr-schema/
