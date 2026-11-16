---
id: ARCH-019
title: Statuts In Progress et In Review du Project par une Action optionnelle
domain: architecture
rules: false
files: ["skills/project-bootstrap/assets/modules/projects/**", "skills/project-bootstrap/references/github-setup.md", "skills/project-bootstrap/references/pitfalls.md", "skills/project-bootstrap/assets/modules/core/templates/docs/workflow.md", "skills/project-bootstrap/assets/modules/core/templates.en/docs/workflow.md", "skills/project-bootstrap/assets/modules/archgate/templates/docs/architecture/adrs/ARCH-004-github-comme-forge-avec-actions-et-releases.md", "skills/project-bootstrap/assets/modules/archgate/templates.en/docs/architecture/adrs/ARCH-004-github-comme-forge-avec-actions-et-releases.md"]
---

# Statuts In Progress et In Review du Project par une Action optionnelle

## Statut

Accepté. Complète ARCH-004.

## Context

`docs/workflow.md` (modèle du module `core`, bloc `@@module:projects`) annonce qu'une carte du Project passe en *In Progress* à la création de la branche et en *In Review* à l'ouverture de la PR. Le module `projects` n'a que `module.json` ; `github-setup.md` (étape 4) ne fait activer que l'auto-add, *Item added → Todo* et la clôture vers *Done*. Sur ce dépôt, les cartes passent de Todo à Done.

Faits établis (Project n°4, relevé en lecture seule, issue #175) :

- Project d'un **compte personnel** ; champ Status : Todo, In Progress, Done, sans *In Review* ;
- 7 workflows intégrés actifs, dont « Pull request linked to issue », que la page des automatisations intégrées ne décrit pas ; constat sur ce dépôt (arc42 §8, migration `0004-squash-title-only`) : un workflow intégré, que ces sources ne nomment pas, remet la carte en *In Progress* quand une PR fermante est liée à l'issue ; l'attribution à « Pull request linked to issue » est probable, non vérifiée ;
- aucun workflow intégré ne réagit à la création d'une branche ; une branche existe sur GitHub à son premier push ou à sa création distante (interface d'une issue, `gh issue develop`, API) ; un `git switch -c` local ne déclenche rien ;
- `GITHUB_TOKEN` est limité au dépôt et n'accède pas aux Projects ; pour un Project d'utilisateur, GitHub indique un PAT classique avec les scopes `project` et `repo` ; un PAT fine-grained n'accède pas aux Projects d'un compte personnel ; une GitHub App vaut pour les organisations ;
- les secrets ne sont pas transmis aux workflows déclenchés depuis un fork ni par Dependabot ;
- pour `create` et `pull_request`, le workflow exécuté est celui de la branche, pas celui de `main`.

Options comparées :

1. **Workflows intégrés seuls** : aucun secret ; *In Progress* et *In Review* restent manuels, la documentation s'aligne. Ne répond pas au besoin.
2. **Action avec secret pour les quatre statuts** : automatisation complète, mais réécrit ce que les workflows intégrés font sans jeton (auto-add, Done).
3. **Hook git local** (`pre-push`) : jeton sur chaque poste, contourné par `--no-verify`, aveugle aux branches créées à distance ; contraire à « jamais de jeton dans un fichier ».
4. **Hybride** : workflows intégrés pour Todo et Done, Action pour *In Progress* et *In Review*, inactive sans secret. Retenue par l'utilisateur (issue #175).

Le précédent est le secret optionnel `SONAR_TOKEN` (ARCH-004) : job inactif sans secret, et la création du secret vaut accord.

## Decision

1. Le module `projects` génère `.github/workflows/project-status.yml` (français et anglais), conditionné par `issue-source` (ARCH-017) : aucun workflow en mode `jiraSource: jira`.
2. Lus à l'exécution, jamais à la génération (ARCH-010) : `vars.PROJECT_NUMBER` (requis), `vars.PROJECT_OWNER` (surcharge de `github.repository_owner`), secret `PROJECT_TOKEN` (PAT classique, scope `project`, et `repo` selon l'essai). Valeur absente : notice et succès.
3. Déclencheurs : `create` d'une branche ; `pull_request` `opened`, `reopened`, `ready_for_review`, `converted_to_draft`, et `closed` sans merge.
4. Cible : la seule issue dont le numéro suit le type dans la branche (`^[a-z]+/([0-9]+)-`) ; sinon (`dependabot/…`, `release-please--…`), rien.
5. **Statut dérivé de l'état, pas de l'événement** : issue fermée ou carte en Done, rien ; une PR ouverte hors brouillon a cette branche pour tête, *In Review* ; sinon *In Progress*. Aucune écriture si la carte a déjà ce statut.
6. Groupe de concurrence par branche, `project-status-${{ github.head_ref || github.ref_name }}`, sans annulation. Il met en file sans garantir l'ordre : seule la règle 5 rend l'ordre sans effet.
7. Todo et Done restent aux workflows intégrés.
8. Le secret créé par l'utilisateur vaut accord ; aucun jeton dans un fichier.
9. Périmètre : comptes personnels ; organisations (GitHub App) dans une version suivante ; `workflow_dispatch` hors périmètre.
10. Sans secret : workflows intégrés seuls, *In Progress* et *In Review* manuels.
11. Cet ADR complète ARCH-004.

## Do's and Don'ts

### Do

- Déclarer `permissions: {}` au niveau du workflow : toute lecture et écriture passe par `PROJECT_TOKEN`.
- Tester la présence du secret par `env` et une étape conditionnée, jamais dans un `if` de job (motif de `ci.yml` du module `github`, arc42 §8).
- Lire la branche dans `github.head_ref` pour `pull_request` (`github.ref_name` y vaut `N/merge`) et dans `github.ref_name` pour `create`, et la passer par l'environnement, jamais interpolée dans une commande shell.
- Ajouter l'option *In Review* au champ Status : sans elle, l'Action émet une notice et ne change rien.
- Désactiver à la main le workflow intégré « Pull request linked to issue » quand le secret est posé.
- Donner au PAT une expiration courte et le scope minimal, et documenter son renouvellement.
- Épingler toute action tierce sur un SHA de commit (ARCH-004) ; `gh`, présent sur les runners, suffit.

### Don't

- Ne pas utiliser `pull_request_target` : il exposerait le secret aux PR de fork et de Dependabot.
- Ne pas déclencher sur `synchronize` ni sur `push`.
- Ne pas écrire de jeton, d'identifiant ou de numéro de Project dans un fichier généré.
- Ne pas faire échouer le workflow quand le secret, une variable, l'option *In Review* ou la carte manquent.
- Ne pas modifier une autre issue que celle du nom de branche (pas de lecture de `Closes #N`).
- Ne pas toucher une issue fermée ni une carte en *Done*, quel que soit le déclencheur.
- Ne pas automatiser *Done* par l'Action.

## Consequences

### Positive

- Avec le secret, les quatre statuts du workflow documenté sont automatiques.
- Le statut posé ne dépend pas de l'ordre d'arrivée des événements.
- Sans secret, aucun échec ni aucune écriture : le projet garde les workflows intégrés.
- Le jeton n'existe que comme secret Actions ; sa création par l'utilisateur est l'accord.
- Le changement tient dans le module `projects` : deux modèles (français et anglais), une entrée `files` de `module.json`, ses tests (ARCH-010).
- Les projets existants et ce dépôt reçoivent le workflow par `scaffold.mjs --update` (fichier nouveau du module) ; ce dépôt l'adopte.

### Negative

- Étapes manuelles : PAT, secret, variable `PROJECT_NUMBER`, option *In Review*, désactivation de « Pull request linked to issue ».
- Un PAT classique donne un accès large au compte et expire.
- Les PR de fork et de Dependabot ne changent aucun statut.
- Une PR qui ferme plusieurs issues ne fait avancer que celle de la branche.
- Dans un dépôt privé, chaque exécution consomme des minutes Actions du plan Free.

### Risks

- **Exfiltration du jeton** : le workflow exécuté pour `create` et `pull_request` est celui de la branche ; tout collaborateur avec droit d'écriture peut le modifier et lire `PROJECT_TOKEN`, dont le scope `repo` couvre tous les dépôts du compte. Mitigation : droit d'écriture réservé aux personnes de confiance, expiration courte, scope minimal, essai du besoin de `repo`.
- **Concurrence avec un workflow intégré** (« Pull request linked to issue » probable, non vérifié) : le retour en *In Progress* constaté à la liaison d'une PR fermante écraserait *In Review*. Mitigation : désactivation documentée dans `github-setup.md` et `pitfalls.md`.
- **Scope `repo` peut-être exigé** (la page GitHub le demande) pour lire l'issue et les PR. Mitigation : essai sur ce dépôt, après `--update`, avec l'accord explicite de l'utilisateur pour le PAT, le secret, la variable et l'option *In Review* du Project n°4 (écritures externes, niveau 5) ; `pitfalls.md` consigne le résultat.
- **Jeton configuré mais inopérant** (PAT expiré, refusé, sans le bon scope, ou dépôt inaccessible au jeton) : l'étape de mise à jour échoue, avec un message qui nomme `PROJECT_TOKEN` et ses scopes ; un jeton posé qui ne fonctionne pas doit se voir. Une configuration absente (valeur manquante, issue introuvable, carte ou option *In Review* absente) reste une notice avec succès. Mitigation : expiration connue de l'utilisateur et procédure de renouvellement documentée.
- **Version de `gh` du runner non établie** pour `gh project item-edit` par nom de champ. Mitigation : identifiants (`--project-id`, `--field-id`, `--single-select-option-id`) lus à l'exécution, ou mutation GraphQL `updateProjectV2ItemFieldValue`.
- **Plusieurs issues par PR** : les issues autres que celle de la branche ne bougent pas. Mitigation : limite consignée dans `pitfalls.md` ; déplacement manuel.

## Compliance and Enforcement

Tests du module `projects` (`assets/modules/projects/tests/`) : présence du workflow avec `projects` et `issue-source`, absence sans l'un d'eux, dont le mode `jiraSource: jira` ; déclencheurs attendus ; `permissions: {}` ; groupe de concurrence ; absence de `pull_request_target`, `synchronize`, `push` et `workflow_dispatch`. Instantanés de la matrice (`full`, `full-en`). Un test parcourt les fichiers générés et refuse toute valeur de jeton (`ghp_`, `github_pat_`). La règle `actions-pinned-to-sha` d'ARCH-004 couvre l'épinglage. Pas de règle Archgate propre : le sujet est du contenu de modèles.

Le changement OpenSpec `175-project-status-action` aligne aussi :

- `docs/workflow.md` (français et anglais) : *In Progress* à la création de la branche sur GitHub et *In Review* à l'ouverture de la PR, automatiques avec le secret, manuels sans ;
- la même phrase en mode `jiraSource: jira`, où aucun workflow n'est généré : conditionnée aussi par `issue-source`, ou adaptée ;
- `github-setup.md` (étape 4) : option *In Review*, workflows intégrés à activer, « Pull request linked to issue » à désactiver avec le secret, PAT, secret et variable ;
- `pitfalls.md` : PAT classique, fine-grained refusé pour un compte personnel, fork et Dependabot sans secret, exposition du secret aux collaborateurs ;
- les modèles d'ARCH-004 générés (`archgate/templates` et `templates.en`, ligne Projects) : `PROJECT_TOKEN` optionnel, secret = accord. Alignement obligatoire.

## References

- Issue #175 (décisions de l'utilisateur, faits du Project n°4) ; rapport d'`architect` sur l'issue #175 ; relecture de l'ADR par `qa-engineer`
- [ARCH-004](./ARCH-004-github-comme-forge-avec-actions-et-releases.md) (forge, `SONAR_TOKEN`, épinglage), [ARCH-005](./ARCH-005-conventions-de-branches-commits-et-versionnement.md) (branches), [ARCH-010](./ARCH-010-modules-auto-decrits.md) (modules), [ARCH-017](./ARCH-017-source-du-besoin-github-ou-jira-au-choix-par-projet.md) (`issue-source`), [ARCH-018](./ARCH-018-gitlab-comme-forge-d-h-bergement-seulement.md) (`projects` réservé à GitHub)
- https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/automating-projects-using-actions
- https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-built-in-automations
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens (limites des PAT fine-grained)
- https://cli.github.com/manual/gh_project_item-edit
