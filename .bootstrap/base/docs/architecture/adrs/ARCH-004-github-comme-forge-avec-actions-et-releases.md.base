---
id: ARCH-004
title: GitHub comme forge, avec Actions et Releases
domain: architecture
rules: true
---

# GitHub comme forge, avec Actions et Releases

## Statut

Proposé.

## Context

Le projet a besoin de tout le cycle — ticket, suivi, revue, CI, livraison — sur le plan GitHub Free d'un compte personnel. Le dépôt est public. Conditions vérifiées le 2026-10-31 sur docs.github.com :
- en public, branches protégées et rulesets sont disponibles sur le plan Free ;
- les runners standards hébergés par GitHub sont gratuits.

## Decision

- **GitHub** est la forge : Issues (formulaires YAML), pull requests en squash merge, Actions.
- **Projects** : colonnes Todo, In Progress, In Review, Done ; automatisations natives (auto-add, item closed et PR merged → Done).
- **CI** (`.github/workflows/ci.yml`) : `ubuntu-latest` et `windows-latest` (gratuits en public).
- **Release** (`.github/workflows/release.yml`) par `googleapis/release-please-action` (Apache-2.0).
- Actions tierces open source uniquement, **épinglées sur un SHA de commit** (les actions locales `./…` exceptées).
- Aucune automatisation qui consomme des tokens d'API en CI sans accord explicite.
- La branche `main` est protégée : la CI est un check obligatoire avant merge.
- Claude Code passe par la CLI `gh` : lecture pré-approuvée, écriture soumise à approbation.

## Do's and Don'ts

### Do

- Activer `git config core.hooksPath .githooks` dans chaque clone.
- Ne merger qu'une PR dont la CI est verte.

### Don't

- Ne pas référencer une action par tag mobile (`@v4`).

## Consequences

### Positive

- Cycle complet sans coût.
- Traçabilité native : `Closes #N`.

### Negative

- La CI de la PR de release-please demande une approbation manuelle (run déclenché par le bot).
- Les conditions du plan Free peuvent changer.

### Risks

- Changement des conditions du plan Free : à revérifier sur docs.github.com avant tout ajout de CI.

## Compliance and Enforcement

`ARCH-004-github-comme-forge-avec-actions-et-releases.rules.ts` vérifie la présence des templates (`.github/ISSUE_TEMPLATE/`, `pull_request_template.md`), des workflows, et l'épinglage sur un SHA de chaque `uses:`.

## References

- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://github.com/github/docs : `data/reusables/gated-features/protected-branches.md`, `repo-rules.md`
- https://github.com/googleapis/release-please-action
