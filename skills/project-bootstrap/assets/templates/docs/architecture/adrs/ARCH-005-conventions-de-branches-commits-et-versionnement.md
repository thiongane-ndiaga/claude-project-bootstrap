---
id: ARCH-005
title: Conventions de branches, commits et versionnement
domain: architecture
rules: false
---

# Conventions de branches, commits et versionnement

## Statut

Proposé.

## Context

Les liens issue ↔ branche ↔ changement ↔ PR doivent pouvoir se retrouver sans outil, et l'historique doit rester lisible.
@@module:release
Le changelog et les versions sont dérivés de cet historique (ARCH-004).
@@end
La langue des identifiants est l'anglais, celle de la documentation est la langue du projet.

## Decision

- **Branche** : `<type>/<issue>-<slug>`, en anglais, à partir de `main`.
- **Commits** : [Conventional Commits](https://www.conventionalcommits.org) en anglais ; types `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`, `perf`, `style`, `revert`.
- **PR** : titre au même format, car il devient le commit de squash sur `main` ; corps avec `Closes #N`.
@@module:release
- **Versionnement** : [SemVer](https://semver.org), calculé par release-please à partir des commits. Avant 1.0.0, `feat` incrémente le patch et un changement cassant (`!`) le mineur ; première version `0.0.1`.
- **Tags** : `vX.Y.Z`, créés par release-please au merge de sa PR de release ; changelog dans `CHANGELOG.md`.
@@end

## Do's and Don'ts

### Do

- Un commit par étape logique.
- Mentionner `Refs #N` dans le corps des commits intermédiaires.

### Don't

@@module:release
- Ne pas créer de tag ni de release à la main.
- Ne pas éditer `CHANGELOG.md` ni `.release-please-manifest.json`.
@@end
- Ne pas committer directement sur `main`.

## Consequences

### Positive

- Historique lisible, liens retrouvables par simple recherche.
@@module:release
- Changelog et versions automatiques.

### Negative

- Seuls les commits `feat` et `fix` apparaissent dans le changelog.
@@end

### Risks

- Un titre de PR mal formé fausse l'historique : contrôlé en CI par `scripts/check-pr-title.mjs`.

## Compliance and Enforcement

Le job `pr-title` de `ci.yml` vérifie le titre de PR. Pas de règle Archgate : l'historique git n'est pas une donnée du dépôt que `archgate check` peut lire de façon fiable.

## References

- https://www.conventionalcommits.org
- https://semver.org
