Issue: #175
ADR: ARCH-019 (appliqué), ARCH-004 (complété : ligne Projects du modèle généré, motif du secret optionnel), ARCH-005 (appliqué : branche `<type>/<issue>-<slug>`), ARCH-010 (appliqué : modèles et `files` du module `projects`, tests du module), ARCH-017 (appliqué : `issue-source`), ARCH-018 (appliqué : `projects` réservé à GitHub)

## Why

`docs/workflow.md` généré annonce qu'une carte du Project passe en *In Progress* à la création de la branche et en *In Review* à l'ouverture de la PR. Rien ne le fait : le module `projects` n'a que son descripteur, aucun workflow intégré de GitHub ne réagit à une branche, et le champ Status n'a pas toujours l'option *In Review*. Les cartes passent de *Todo* à *Done*. ARCH-019 a retenu une Action optionnelle, inactive sans secret ; ce changement l'écrit.

## What Changes

- Le module `projects` génère `.github/workflows/project-status.yml` (français et anglais), seulement avec `issue-source` : aucun workflow en mode `jiraSource: jira`.
- Le workflow lit à l'exécution le secret `PROJECT_TOKEN`, la variable `PROJECT_NUMBER` (requise) et la variable `PROJECT_OWNER` (surcharge de `github.repository_owner`) ; sans l'une des valeurs requises, il émet une notice et réussit ; un jeton refusé, expiré ou de scope insuffisant fait échouer l'étape avec un message qui nomme `PROJECT_TOKEN`.
- Il se déclenche sur `create` (branche) et `pull_request` (`opened`, `reopened`, `ready_for_review`, `converted_to_draft`, `closed` sans merge), sans `push`, `synchronize`, `pull_request_target` ni `workflow_dispatch`.
- Il dérive le statut de l'état de l'issue nommée par la branche, de la carte et de la PR (*In Progress* ou *In Review*), sans écrire quand la carte a déjà ce statut.
- Les modèles de l'ADR ARCH-004 générés (`archgate`, français et anglais) citent `PROJECT_TOKEN` comme secret optionnel dont la création vaut accord.
- `docs/workflow.md` généré dit « *In Progress* à la création de la branche sur GitHub, *In Review* à l'ouverture de la PR, automatiques avec le secret, manuels sans » ; en mode `jira`, il dit qu'ils se règlent à la main.
- `github-setup.md` (étape 4) et `pitfalls.md` décrivent les workflows intégrés à activer et à désactiver, le PAT, le secret, la variable, les scopes, l'expiration et les limites.
- Tests de génération du module, test de matrice qui refuse tout jeton dans les fichiers générés, instantanés relus, arc42 mis à jour par `architect`.

Hors périmètre : organisations (GitHub App), GitLab, Jira, `workflow_dispatch`, automatisation de *Done* ; création du secret et de la variable, ajout de l'option *In Review* au Project n°4, désactivation du workflow intégré « Pull request linked to issue » et essai du scope `repo` (écritures externes réservées à l'utilisateur) ; audit de l'état de ce workflow intégré ; fichier `docs/projects.md` généré ; combinaison de matrice pour le mode Jira (le test du module couvre l'absence du workflow).

## Capabilities

### New Capabilities

- `projects-module` : module `projects`, son workflow `project-status.yml` (génération, déclencheurs, droits, inactivité sans configuration, cible, statut dérivé), l'alignement de l'ADR ARCH-004 généré et la documentation du skill.

### Modified Capabilities

- `workflow-document` : exigence ajoutée sur la phrase des statuts du Project de `docs/workflow.md`, avec et sans `issue-source`.
- `generator-test-suite` : exigence ajoutée, aucun jeton dans les fichiers générés.

## Impact

- `skills/project-bootstrap/assets/modules/projects/` : `module.json` (entrée `files`, description), `templates/` et `templates.en/` du workflow, `tests/projects.test.mjs`.
- Modèles `docs/workflow.md` du module `core` (`templates/` et `templates.en/`) et ADR ARCH-004 du module `archgate` (idem).
- `skills/project-bootstrap/references/github-setup.md`, `references/pitfalls.md`, `SKILL.md` (ce qui reste manuel).
- `tests/matrix.test.mjs` ; instantanés `projects`, `default`, `default-stack`, `default-cli-user`, `default-cli-local`, `default-en`, `full`, `full-en`, `full-public`, `full-legacy`.
- `docs/architecture/arc42/` sections 5, 8 et 11 ; ARCH-019 (lignes « Compliance » et « Expiration du PAT » alignées, par `architect`).
- Les projets existants reçoivent le workflow par `scaffold.mjs --update` (fichier nouveau du module). Aucun changement sans le module `projects` ; aucune écriture externe par l'implémentation.
