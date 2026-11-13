## Contexte

`github` est le pivot de six modules et le propriétaire de `ci.yml`, des formulaires, du gabarit de PR et de `scripts/check-pr-title.mjs`. Le moteur de modules ne connaît que `requires` (ET), `conflicts` et, dans les blocs, le OU (`a|b`) ; le `when` d'un fichier n'exprime que le ET. Le catalogue refuse un chemin déclaré par deux modules, même exclusifs. Un conflit de modules sort en code 2, une dépendance manquante en code 1.

## Décisions

- **D1. Variante par module**, pas de gabarits paramétrés. Le vocabulaire PR/MR est donné par une table de lecture de `docs/gitlab.md` ; `Closes #N` s'écrit pareil sur GitLab.
- **D2. Module `gitlab`**, `default: false`, `conflicts: ["github"]` (code 2 avec `github`). Fichiers : gabarit de merge request, gabarits d'issues sous `.gitlab/`, `docs/gitlab.md`. `release`, `projects` et `dependabot` exigent déjà `github` : ils sont refusés avec `gitlab` par `requires` (code 1), sans autre déclaration.
- **D3. `requiresAny`** : liste non vide de noms de modules, dont un au moins est sélectionné. Refusés au chargement : liste vide, nom inconnu, auto-référence, module aussi cité dans `conflicts`, pseudo-module. `--list-modules` (JSON et tableau) l'affiche. `jenkins` : `requiresAny: ["github", "gitlab"]`, `requires: []`.
- **D4. Pseudo-module `forge`**, actif avec `github` ou `gitlab` (déclaré dans `catalog.mjs`). `scripts/check-pr-title.mjs` passe de `github` à `core` avec `when: ["forge"]` (français et anglais) : un seul propriétaire, sortie identique pour `github` (le manifeste n'enregistre pas le module propriétaire).
- **D5. ADR générés.** `archgate/module.json` : ARCH-004.md et ARCH-005 avec `when: ["forge"]`, ARCH-004.rules.ts avec `when: ["github"]`. Le frontmatter d'ARCH-004.md porte `rules: true` sous `github` et `rules: false` sous `gitlab` (blocs). ARCH-004 garde son numéro et son nom de fichier ; sous `gitlab` son contenu décrit GitLab et Jenkins (slug trompeur, dit dans `docs/gitlab.md`).
- **D6. `core`.** Dans `CLAUDE.md` et `docs/workflow.md`, les blocs `@@module:github` qui portent des étapes valables pour toute forge (besoin par issue ou ticket, PR + CI, traçabilité, titre de PR) deviennent `@@module:forge` ; les passages propres à GitHub (formulaires, `gh`, protection de branche, `ci.yml`, runners) restent sous `github` ; une variante `gitlab` pose les équivalents (gabarits `.gitlab/`, `Jenkinsfile`, `scripts/jenkins-setup.sh`).
- **D7. Jenkins.** `docs/jenkins.md` : pseudo-modules inutiles, blocs `@@module:github` et `@@module:gitlab` directement. Variante GitLab : GitLab Branch Source, webhook, jeton d'accès, option « les pipelines doivent réussir » de la protection de `main`, **confiance des MR de fork** à régler (le `Jenkinsfile` d'une MR de fork s'exécute avec les identifiants du job). Commentaires et description qui disent « complément de `ci.yml` » : variante sans `github`.
- **D8. Audit.** Avec `gitlab`, `runAudit` n'appelle jamais `gh` (même avec `--repo`), le contrôle de forge est `non-verifiable` avec la raison, et `checkVersions` lit les versions épinglées dans le `Jenkinsfile` quand il n'y a pas de `ci.yml`.
- **D9. Skill et reprise.** `state.mjs` : `phase2-github` reste réservée à `github` ; `phase4-adr` s'applique avec `github` ou `gitlab` (acceptation des ADR par merge request) ; une étape `phase2-gitlab` manuelle liste `docs/gitlab.md`. `SKILL.md` : avec `gitlab`, retirer `github`, `release`, `projects` des défauts, ne pas lancer `gh`.
- **D10. Gitlab sans jenkins** est accepté mais le projet n'a alors aucune CI : `docs/gitlab.md` le dit et recommande `jenkins`.
- **D11. `jiraSource: github`** désigne les issues de la forge ; dit dans `docs/gitlab.md`.

## Hors périmètre

Étapes Jira et Sonar du `Jenkinsfile` et dépendances alternatives de `sonar` et `jira` (second changement), `release`, `projects`, `dependabot`, `glab` et variantes GitLab des profils d'agents (leurs étapes `gh` sont absentes avec `gitlab`, `pr-readiness-review` n'est pas généré), `.gitlab-ci.yml`, passage d'un projet existant de `github` à `gitlab`, `--detect`.

## Risques

- Aucun essai réel avec GitLab ni Jenkins : documenté comme non observé.
- Sans `release`, pas de version automatique sur GitLab.
- Une MR en brouillon (`Draft:`) échoue au contrôle du titre : documenté dans `docs/gitlab.md`.
