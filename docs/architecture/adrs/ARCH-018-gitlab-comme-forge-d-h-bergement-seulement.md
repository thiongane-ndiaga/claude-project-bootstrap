---
id: ARCH-018
title: GitLab comme forge d'hébergement seulement
domain: architecture
rules: false
files: ["skills/project-bootstrap/assets/modules/gitlab/**", "skills/project-bootstrap/scripts/catalog.mjs", "skills/project-bootstrap/scripts/scaffold.mjs"]
---

# GitLab comme forge d'hébergement seulement

## Statut

Accepté.

## Context

Des projets hébergent leur code sur GitLab et gardent Jenkins pour la CI, Sonar pour la qualité et Jira pour les tickets. Le module `github` porte la CI (`ci.yml`), les formulaires, le gabarit de PR, le contrôle du titre de PR et les ADR de forge ; six modules l'exigent. Reproduire toute la forge (GitLab CI, release en job, tableaux, `glab` dans chaque profil d'agent) serait un second plugin.

## Decision

1. Le module optionnel `gitlab` (`default: false`) est **exclusif** de `github` (code 2) et ne couvre que l'**hébergement** : gabarit de merge request, gabarits d'issues, documentation des étapes manuelles. Il ne génère ni `.gitlab-ci.yml` ni fichier `.github/`.
2. La CI d'un projet GitLab est le `Jenkinsfile` du module `jenkins`, qui exige `github` **ou** `gitlab` (`requiresAny`).
3. Le contrôle du titre de PR et les ADR de forge (ARCH-004, ARCH-005 générés) se génèrent avec l'un ou l'autre : la condition est le pseudo-module `forge`, actif avec `github` ou `gitlab`. `scripts/check-pr-title.mjs` a un seul propriétaire, `core`.
4. Les modules `release`, `projects` et `dependabot` restent réservés à `github`. L'audit de la forge et les commandes `gh` du skill ne s'appliquent qu'à GitHub ; avec `gitlab`, les contrôles de forge sont non vérifiables et les étapes sont manuelles.
5. Le vocabulaire PR/MR n'est pas paramétré : les modèles gardent « PR » et `docs/gitlab.md` donne la table de lecture (PR → MR, `gh` → `glab`).

## Do's and Don'ts

### Do

- Écrire une variante par bloc `@@module:gitlab` ou `@@module:forge` plutôt qu'une variable de vocabulaire.
- Documenter ce que GitLab ne couvre pas dans `docs/gitlab.md`.

### Don't

- Ne pas ajouter de `.gitlab-ci.yml` ni de job GitLab CI à ce module.
- Ne pas déclarer le même chemin dans `github` et `gitlab` (un chemin a un seul propriétaire).

## Consequences

### Positive

- Les projets GitHub ne changent pas.
- Un projet GitLab obtient le workflow, les ADR et la CI Jenkins sans GitHub.

### Negative

- Sans `release`, pas de version automatique sur GitLab.
- Les profils d'agents perdent leurs étapes `gh` (pas de variante `glab`).

### Risks

- Aucun essai réel avec GitLab ni Jenkins.
- Un projet `gitlab` sans `jenkins` n'a aucune CI.

## Compliance and Enforcement

Test du module (`assets/modules/gitlab/tests/gitlab.test.mjs`), tests du catalogue pour `requiresAny` et `forge`, combinaisons de la matrice (instantanés). Pas de règle Archgate : le sujet est du contenu de modèles.

## References

- Issue #25 ; changement OpenSpec `25-gitlab-module`
- ARCH-004 (forge), ARCH-010 (modules auto-décrits), ARCH-017 (source du besoin)
