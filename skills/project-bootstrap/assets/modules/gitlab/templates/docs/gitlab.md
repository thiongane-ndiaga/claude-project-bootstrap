# GitLab

Le module `gitlab` fait de GitLab l'**hébergement du code**. Il ne génère ni `.gitlab-ci.yml` ni fichier `.github/` : la CI est le `Jenkinsfile` du module `jenkins`, la release n'est pas automatique. Il fournit le gabarit de merge request (`.gitlab/merge_request_templates/Default.md`) et les gabarits d'issues (`.gitlab/issue_templates/`).

@@module:jenkins
La CI est le `Jenkinsfile` (voir `docs/jenkins.md`).
@@end
@@module:openspec
Les changements OpenSpec suivent le même parcours qu'avec une issue GitHub : l'id est `<issue>-<slug>`.
@@end

## Étapes manuelles

Le plugin n'écrit rien sur GitLab : ces étapes sont les tiennes.

1. Créer le projet GitLab et y pousser le dépôt.
2. Protéger la branche `main` (Settings, Repository, Protected branches) et, avec Jenkins, exiger « Pipelines must succeed » dans les réglages de fusion.
3. Régler la méthode de merge sur **squash** avec le titre de la MR comme message : c'est ce qui justifie le contrôle du titre (`scripts/check-pr-title.mjs`), le commit de squash étant le titre.
4. Créer les labels `bug`, `enhancement` et `adr` (Manage, Labels) : les gabarits d'issues les posent par des actions rapides (`/label`), qui ignorent un label absent.
5. Avec Jenkins : jeton d'accès du projet et webhook, voir `docs/jenkins.md`.

## Table de lecture

Les textes générés disent « PR » et `gh` ; avec GitLab ils se lisent ainsi.

| Texte | Se lit |
|---|---|
| PR, pull request | MR, merge request |
| `Closes #N` | `Closes #N` (même syntaxe : GitLab ferme l'issue à la fusion) |
| `gh pr view`, `gh pr checks` | `glab mr view`, `glab ci status` |
| `gh issue view`, `gh issue create` | `glab issue view`, `glab issue create` |
| formulaires d'issues | gabarits `.gitlab/issue_templates/` |
| `ARCH-004-github-comme-forge-…` | l'ADR de forge : le nom du fichier reste, le contenu décrit GitLab |

La clé `jiraSource` à `github` désigne les issues de la forge, donc ici celles de GitLab.

## Limites

- Sans le module `jenkins`, le projet n'a aucune CI : `check-pr-title.mjs` n'est appelé par rien.
- Aucune release automatique, aucun tableau de projet, pas de Dependabot : ces modules sont réservés à GitHub.
- Les profils d'agents n'ont pas de variante GitLab : leurs étapes `gh` (PR, CI, issue) sont absentes, et `pr-readiness-review` n'est pas généré.
- Une MR en brouillon (titre préfixé `Draft:`) échoue au contrôle du titre.
- Aucun essai réel avec une instance GitLab ni un Jenkins : le plugin teste seulement la génération.
