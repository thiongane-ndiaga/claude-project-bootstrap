Issue: #25
ADR: ARCH-018 (nouveau : GitLab comme forge d'hébergement seulement), ARCH-010 (amendé : `requiresAny` et condition `forge`), ARCH-004 (modèle généré : variante GitLab), ARCH-006 (appliqué)

## Why

Des projets hébergent leur code sur GitLab, avec Jenkins pour la CI, Sonar pour la qualité et Jira pour les tickets. Le mainteneur a cadré l'issue : GitLab sert uniquement à héberger le code source. Aujourd'hui `github` porte la CI, les formulaires, le gabarit de PR, le contrôle du titre et les ADR de forge, et `jenkins` l'exige.

L'issue est livrée en deux changements : celui-ci (GitLab + Jenkins, projet complet sans GitHub) puis un second (étapes Jira et Sonar du `Jenkinsfile`, `requiresAny` pour `sonar` et `jira`). L'issue se ferme avec le second.

## What Changes

- Module `gitlab` (`default: false`, incompatible avec `github`) : `.gitlab/merge_request_templates/Default.md`, `.gitlab/issue_templates/` (fonctionnalité, anomalie, décision d'architecture), `docs/gitlab.md` (étapes manuelles, table de lecture PR → MR, limites). Ni `.gitlab-ci.yml` ni `.github/`.
- Clé `requiresAny` de `module.json` (au moins un module de la liste) ; `jenkins` exige `github` ou `gitlab`. Pseudo-module `forge`, actif avec `github` ou `gitlab`.
- `scripts/check-pr-title.mjs` passe à `core` (`when: forge`) : un seul propriétaire ; ARCH-004 et ARCH-005 générés suivent `forge` (ARCH-004 : variante GitLab, sans règle exécutable ; `.rules.ts` seulement avec `github`).
- `core` (`CLAUDE.md`, `docs/workflow.md`) : les blocs « issue » et « PR + CI » valent aussi avec `gitlab` ; les passages propres à GitHub restent sous `github`.
- `docs/jenkins.md` : variante GitLab (GitLab Branch Source, webhook, jeton, confiance des MR de fork, pipelines exigés).
- Audit : avec `gitlab`, aucun appel à `gh` même avec `--repo`, versions lues dans le `Jenkinsfile`. Skill et reprise de session : étapes `gh` et acceptation des ADR par PR GitHub seulement avec `github`.
- Hors de ce changement : étapes Jira et Sonar du `Jenkinsfile`, `release`, `projects`, `dependabot`, `glab`.

## Capabilities

### New Capabilities

- `gitlab-module` : module `gitlab`, sa documentation, ses effets sur le workflow, l'audit et le skill.

### Modified Capabilities

- `module-catalog` : `requiresAny`, pseudo-module `forge`.
- `jenkins-module` : dépendance alternative et variante GitLab de la documentation.

## Impact

`assets/modules/gitlab/`, `core` (`check-pr-title.mjs`, `CLAUDE.md`, `workflow.md`), `github` (retrait de `check-pr-title.mjs`), `archgate` (descripteur, ARCH-004, ARCH-005), `jenkins`, `catalog.mjs`, `scaffold.mjs`, `audit.mjs`, `state.mjs`, `SKILL.md`, `bootstrap-config.md`, `pitfalls.md`, arc42, tests et instantanés. Les fichiers générés d'un projet avec `github` ne changent pas.
