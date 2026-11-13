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
Le changelog et les versions sont dérivés de cet historique (ARCH-004).
La langue des identifiants est l'anglais, celle de la documentation est la langue du projet.

## Decision

- **Branche** : `<type>/<issue>-<slug>`, en anglais, à partir de `main`.
- **Commits** : [Conventional Commits](https://www.conventionalcommits.org) en anglais ; types `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`, `perf`, `style`, `revert`.
- **PR** : titre au même format, car il devient le commit de squash sur `main` ; corps avec `Closes #N`.
- **Clé Jira** (module `jira` des projets générés, ARCH-017) : la clé figure dans le titre de la PR ou la branche ; avec Jira comme source du besoin, la branche est `<type>/<CLE-N>-<slug>` et le corps de PR `Refs CLE-N`. Ce dépôt reste en mode GitHub.
- **Squash** : le dépôt garde le titre de la PR seul comme commit de squash (`squash_merge_commit_title=PR_TITLE`, `squash_merge_commit_message=BLANK`), posé par le skill et vérifié par l'audit (migration `0004-squash-title-only`). Aucun `Closes #N` dans un commit : release-please le recopierait dans sa PR de release.
- **Versionnement** : [SemVer](https://semver.org), calculé par release-please à partir des commits. Avant 1.0.0, `feat` incrémente le patch et un changement cassant (`!`) le mineur ; première version `0.0.1`.
- **Tags** : `vX.Y.Z`, créés par release-please au merge de sa PR de release ; changelog dans `CHANGELOG.md`.

## Do's and Don'ts

### Do

- Un commit par étape logique.
- Mentionner `Refs #N` dans le corps des commits intermédiaires.

### Don't

- Ne pas créer de tag ni de release à la main.
- Ne pas éditer `CHANGELOG.md` ni `.release-please-manifest.json`.
- Ne pas committer directement sur `main`.

## Consequences

### Positive

- Historique lisible, liens retrouvables par simple recherche.
- Changelog et versions automatiques.

### Negative

- Seuls les commits `feat` et `fix` apparaissent dans le changelog.

### Risks

- Un titre de PR mal formé fausse l'historique : contrôlé en CI par `scripts/check-pr-title.mjs`.

## Compliance and Enforcement

Le job `pr-title` de `ci.yml` vérifie le titre de PR. Pas de règle Archgate : l'historique git n'est pas une donnée du dépôt que `archgate check` peut lire de façon fiable.

## References

- https://www.conventionalcommits.org
- https://semver.org
