---
id: ARCH-004
@@module:github
title: GitHub comme forge, avec Actions et Releases
@@end
@@module:gitlab
title: GitLab comme forge d'hébergement, avec Jenkins
@@end
domain: architecture
@@module:github
rules: true
@@end
@@module:gitlab
rules: false
@@end
---
@@module:github

# GitHub comme forge, avec Actions et Releases

## Statut

Proposé.

## Context

Le projet a besoin de tout le cycle — ticket, suivi, revue, CI, livraison — sur le plan GitHub Free d'un compte personnel. Le dépôt est {{VISIBILITY_LABEL}}. Conditions vérifiées le {{DATE}} sur docs.github.com :
@@module:visibility-private
- en privé, le plan Free n'offre ni branches protégées ni rulesets ;
- Actions dispose d'un crédit de calcul mensuel limité ({{ACTIONS_CREDIT_NOTE}}), l'usage étant bloqué au-delà sans moyen de paiement.
@@end
@@module:visibility-public
- en public, branches protégées et rulesets sont disponibles sur le plan Free ;
- les runners standards hébergés par GitHub sont gratuits.
@@end

## Decision

- **GitHub** est la forge : Issues (formulaires YAML), pull requests en squash merge, Actions.
@@module:projects
- **Projects** : colonnes Todo, In Progress, In Review, Done ; automatisations natives (auto-add, item closed et PR merged → Done).
@@end
- **CI** (`.github/workflows/ci.yml`) : {{CI_OS_TEXT}}.
@@module:release
- **Release** (`.github/workflows/release.yml`) par `googleapis/release-please-action` (Apache-2.0).
@@end
@@module:sonar
- **Analyse de qualité** (`.github/workflows/ci.yml`, job `sonar`) par `SonarSource/sonarqube-scan-action` (LGPL-3.0) vers un service externe ; inactive tant que le secret `SONAR_TOKEN` n'existe pas, ce qui vaut accord explicite pour cette analyse.
@@end
- Actions tierces open source uniquement, **épinglées sur un SHA de commit** (les actions locales `./…` exceptées).
- Aucune automatisation qui consomme des tokens d'API en CI sans accord explicite.
@@module:visibility-private
- Faute de protection de branche, le blocage est local : `.githooks/pre-push` exécute le même contrôle que la CI.
@@end
@@module:visibility-public
- La branche `main` est protégée : la CI est un check obligatoire avant merge.
@@end
- Claude Code passe par la CLI `gh` : lecture pré-approuvée, écriture soumise à approbation.

## Do's and Don'ts

### Do

@@module:githooks
- Activer `git config core.hooksPath .githooks` dans chaque clone.
@@end
- Ne merger qu'une PR dont la CI est verte.

### Don't

@@module:visibility-private
- Ne pas ajouter de runner Windows ou macOS en CI tant que le dépôt est privé.
@@end
- Ne pas référencer une action par tag mobile (`@v4`).

## Consequences

### Positive

- Cycle complet sans coût.
- Traçabilité native : `Closes #N`.

### Negative

@@module:visibility-private
- Un merge avec une CI rouge n'est pas bloqué côté serveur.
@@end
@@module:release
- La CI de la PR de release-please demande une approbation manuelle (run déclenché par le bot).
@@end
- Les conditions du plan Free peuvent changer.

### Risks

- Changement des conditions du plan Free : à revérifier sur docs.github.com avant tout ajout de CI.

## Compliance and Enforcement

`ARCH-004-github-comme-forge-avec-actions-et-releases.rules.ts` vérifie la présence des templates (`.github/ISSUE_TEMPLATE/`, `pull_request_template.md`), des workflows, et l'épinglage sur un SHA de chaque `uses:`.

## References

- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://github.com/github/docs : `data/reusables/gated-features/protected-branches.md`, `repo-rules.md`
@@module:release
- https://github.com/googleapis/release-please-action
@@end
@@end
@@module:gitlab
# GitLab comme forge d'hébergement, avec Jenkins

## Statut

Proposé.

## Context

Le projet héberge son code sur GitLab. Le dépôt est {{VISIBILITY_LABEL}}. La CI, la qualité et les tickets relèvent d'autres outils (Jenkins, Sonar, Jira) : GitLab ne sert qu'à héberger le code, les issues et les merge requests.

## Decision

- **GitLab** héberge le code : issues (gabarits `.gitlab/issue_templates/`), merge requests en squash merge (gabarit `.gitlab/merge_request_templates/Default.md`).
@@module:jenkins
- **CI** : le `Jenkinsfile` (Jenkins), pas GitLab CI. Aucun `.gitlab-ci.yml` n'est généré.
@@end
- Aucune release automatique ni tableau de projet générés.
@@module:sonar
- **Analyse de qualité** (étape `Sonar` du `Jenkinsfile`) par `sonar-scanner` vers un service externe ; inactive tant que l'identifiant Jenkins `SONAR_TOKEN` et la variable `SONAR_ENABLED` n'existent pas, ce qui vaut accord explicite pour cette analyse.
@@end
- Aucune automatisation qui consomme des tokens d'API en CI sans accord explicite.
- La branche `main` est protégée dans GitLab, avec « Pipelines must succeed » quand une CI existe.
- Les commandes `glab` ne sont pas pré-approuvées : chacune demande une approbation.

## Do's and Don'ts

### Do

@@module:githooks
- Activer `git config core.hooksPath .githooks` dans chaque clone.
@@end
- Ne merger qu'une merge request dont les contrôles sont verts.

### Don't

- Ne pas ajouter de `.gitlab-ci.yml` : la CI est le `Jenkinsfile`.

## Consequences

### Positive

- Hébergement sur GitLab sans changer le workflow du projet.
- Traçabilité native : `Closes #N`.

### Negative

- Pas de version automatique : le module `release` est réservé à GitHub.
- Les profils d'agents n'ont pas de commandes `glab`.

### Risks

- Aucun essai réel avec une instance GitLab ni un Jenkins.

## Compliance and Enforcement

Pas de règle Archgate pour cet ADR avec GitLab : le sujet est du contenu de gabarits. Le nom du fichier garde `github` (numéro et nom stables d'un projet à l'autre).

## References

- https://docs.gitlab.com/ee/user/project/merge_requests/
@@end
