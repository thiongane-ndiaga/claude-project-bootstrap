# Tasks

## 1. Workflow et descripteur du module

- [ ] 1.1 `assets/modules/projects/module.json` : entrée `files` `.github/workflows/project-status.yml` avec `when: ["issue-source"]`, description complétée ; vérifier par `node skills/project-bootstrap/scripts/scaffold.mjs --list-modules` (le module annonce un fichier, le catalogue charge sans erreur)
- [ ] 1.2 Modèle français `templates/.github/workflows/project-status.yml` : déclencheurs `create` et `pull_request` (cinq types), `permissions: {}`, groupe `project-status-${{ github.head_ref || github.ref_name }}` sans annulation, condition de job sans secret (branche créée, PR non fusionnée), environnement du job `PROJECT_TOKEN`, `PROJECT_NUMBER`, `PROJECT_OWNER` (repli `github.repository_owner`), `BRANCH` et `GH_REPO`, `GH_TOKEN` posé seulement sur l'étape de mise à jour, étape de notice et étape de mise à jour conditionnées par `env.PROJECT_TOKEN` et `env.PROJECT_NUMBER`, aucun `uses:` ; vérifier qu'un projet généré avec `github` et `projects` contient le fichier et que les assertions de 1.5 sur ces points passent
- [ ] 1.3 Script de l'étape de mise à jour (design D3) : aucun `set -e`, chaque appel de `gh` capturé et classé par `skip` (notice, succès) ou `fail` (`::error::`, échec, message fixe sans la réponse de l'API) selon le tableau de D3 ; cible lue par `^[a-z]+/([0-9]+)-` avec exclusion de `dependabot/` et `release-please--` ; identifiant du Project par `gh project view` ; lecture GraphQL de l'issue et de la carte (variables par `-f` et `-F`) ; PR ouvertes par `gh pr list --json isDraft,isCrossRepository` filtrées sur `isCrossRepository` faux ; statut dérivé, aucune écriture si le statut est déjà posé ; identifiants du champ et de l'option par `gh project field-list` ; écriture par la seule mutation `updateProjectV2ItemFieldValue` ; vérifier qu'aucun bloc `run:` ne contient `${{`, que le fichier ne contient ni `item-edit` ni `set -e`, et que les littéraux `Status`, `In Progress`, `In Review` et `Done` y figurent
- [ ] 1.4 Modèle anglais `templates.en/.github/workflows/project-status.yml` de même structure ; vérifier par le test de parité de `tests/scaffold.test.mjs` (squelettes YAML identiques)
- [ ] 1.5 `assets/modules/projects/tests/projects.test.mjs` (squelette de `sonar.test.mjs`) : présence avec `projects`, absence sans `projects`, absence avec `jira` et `jiraSource: jira`, refus avec `gitlab` (code 1, aucun fichier), déclencheurs exacts, `permissions: {}`, groupe et `cancel-in-progress: false`, absence de `push`, `synchronize`, `pull_request_target`, `workflow_dispatch`, portée des variables et de `GH_TOKEN`, affectations réduites à des expressions `secrets.` ou `vars.`, étapes conditionnées par `env`, aucun `secrets` dans une condition de job, aucun `${{` dans un `run:`, `uses:` épinglés ou absents, littéraux `Status`, `In Progress`, `In Review`, `Done` en français et en anglais, `--update` après retrait du fichier et de son entrée du manifeste (fichier créé, puis second `--update` sans effet), fr et en ; vérifier par `node tests/modules.test.mjs`

## 2. Documents générés alignés

- [ ] 2.1 `core/templates/docs/workflow.md` et `core/templates.en/docs/workflow.md` : blocs imbriqués `@@module:projects` > `@@module:issue-source` (phrase « *In Progress* à la création de la branche sur GitHub, *In Review* à l'ouverture de la PR, automatiques avec le secret, manuels sans (secret Actions `PROJECT_TOKEN`) » et son équivalent anglais « automatic with the secret, manual without ») et `@@module:jira-source` (statuts à la main, sans « auto-add ») ; vérifier par le test de parité des marqueurs et par les assertions du test du module
- [ ] 2.2 ARCH-004 généré (`archgate/templates/…/ARCH-004-…md` et `templates.en/…`) : ligne Projects avec `project-status.yml`, `PROJECT_TOKEN` optionnel et la création du secret qui vaut accord, sous la condition `issue-source` ; vérifier que `archgate check` réussit sur un projet généré avec `archgate` et `projects`, et que ARCH-004 est inchangé sans `projects` et en mode `jira`
- [ ] 2.3 Assertions du test du module sur `docs/workflow.md` (avec `issue-source`, avec `jiraSource: jira`, sans `projects`) et sur ARCH-004 (avec et sans `projects`, avec `jiraSource: jira`), en français et en anglais ; vérifier par `node tests/modules.test.mjs`

## 3. Matrice et instantanés

- [ ] 3.1 `tests/matrix.test.mjs` : contrôle des six préfixes de jeton GitHub (`ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`, `github_pat_`) dans `invariants()` (donc pour chaque combinaison, fichiers générés seulement), qui nomme le fichier ; ligne ajoutée au bloc d'autocontrôle des invariants avec un tampon synthétique contenant `ghp_x` (problème détecté) et un tampon sain (aucun problème) ; vérifier par `node tests/matrix.test.mjs`
- [ ] 3.2 `UPDATE_SNAPSHOTS=1 node tests/matrix.test.mjs`, puis relire le diff de `tests/snapshots/` : `project-status.yml` ajouté et `docs/workflow.md` modifié dans `projects`, `default`, `default-stack`, `default-cli-user`, `default-cli-local`, `default-en`, `full`, `full-en`, `full-public`, `full-legacy` ; ARCH-004 modifié là où `archgate` est choisi ; `jira-source` et les autres instantanés inchangés ; vérifier par `node tests/matrix.test.mjs` sans `UPDATE_SNAPSHOTS`

## 4. Documentation du skill et architecture

- [ ] 4.1 `references/github-setup.md` étape 4 : workflows intégrés à activer, « Pull request linked to issue » à désactiver en mode secret, PAT classique (scope `project`, `repo` selon l'essai, expiration courte), `gh secret set PROJECT_TOKEN`, `gh variable set PROJECT_NUMBER` et `PROJECT_OWNER`, accord de l'utilisateur avant chaque écriture, exemples de jeton sans préfixe réel ; la mutation *In Review* existante est conservée ; vérifier par relecture que chaque élément du spec « Documentation du skill » figure
- [ ] 4.2 `references/pitfalls.md` (section GitHub) : chaque limite du spec « Pièges consignés », dont deux branches pour une même issue et les noms exacts des options ; scope `repo` noté non essayé ; vérifier par relecture
- [ ] 4.3 `SKILL.md` : secret et variables rangés dans ce qui reste manuel (lignes sur `docs/sonar.md` et sur l'étape GitHub) ; vérifier par relecture que les deux lignes citent `PROJECT_TOKEN` et `PROJECT_NUMBER`, puis que `node .bootstrap/run-checks.mjs` réussit
- [ ] 4.4 arc42, par `architect` avec le skill `arc42-update` : section 5 (le module `projects` et son workflow), section 8 (concept « Statuts du Project par une Action optionnelle » : secret = accord, collaborateurs en écriture, échec visible du jeton inutilisable) et section 11 (risques : exfiltration, expiration du PAT, concurrence avec le workflow intégré, scope `repo`, limites fork, Dependabot et deux branches) ; vérifier que les trois sections citent ARCH-019 et ce changement
- [ ] 4.5 ARCH-019, par `architect`, corrigé en place : la ligne « Compliance » cite à tort l'instantané `jira-source` (l'absence du workflow en mode Jira est couverte par le test du module) ; la ligne « Expiration du PAT » des Risques est alignée sur l'échec visible du jeton refusé ou expiré (décision du chef de projet, design D3) ; vérifier par `archgate check` et relecture

## 5. Contrôles d'ensemble

- [ ] 5.1 `node .bootstrap/run-checks.mjs` réussit (scaffold, matrice, état, modules)
- [ ] 5.2 `node .claude/hooks/quality-gate.mjs` réussit
- [ ] 5.3 `archgate check` réussit
- [ ] 5.4 `openspec validate --all --strict --no-interactive` réussit

## 6. Essai manuel après le merge (non bloquant pour l'archivage)

- [ ] 6.1 Après le merge de la PR et `scaffold.mjs --update` sur ce dépôt, avec l'accord explicite de l'utilisateur pour chaque écriture externe (PAT, secret `PROJECT_TOKEN`, variable `PROJECT_NUMBER`, option *In Review* du champ Status du Project n°4, désactivation de « Pull request linked to issue ») : exercer les scénarios d'exécution (statut dérivé, ordre des événements, issue introuvable, jeton refusé, scope `repo`), puis consigner dans `pitfalls.md` le besoin du scope `repo` et les messages d'erreur réels de l'API

## Workflow follow-up

- Archiver le changement dans la PR avant le merge (`project-lead` : `openspec archive 175-project-status-action --yes`), PR avec `Closes #175`. Le groupe 6 s'exécute après le merge et ne bloque pas l'archivage.
