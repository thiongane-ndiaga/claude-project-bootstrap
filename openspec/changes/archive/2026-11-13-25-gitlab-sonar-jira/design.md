## Contexte

Le premier lot a posé `requiresAny`, le pseudo-module `forge` et le module `gitlab`. `sonar` et `jira` écrivent dans `ci.yml` (blocs `@@module:sonar`, `@@module:jira`) et sont imbriqués dans les blocs de `github` de `core`. Les gabarits de `gitlab` n'ont pas de variante Jira.

## Décisions

- **D1. `requiresAny: ["github", "jenkins"]`** pour `sonar` et `jira` (`requires` vide). Avec `jenkins` seul (donc `gitlab` ou `github` + `jenkins`), les fichiers du module sont générés ; les blocs de `ci.yml` n'existent que si `github` l'est.
- **D2. Étapes du `Jenkinsfile` seulement avec `gitlab`** (bloc `@@module:gitlab` autour du bloc du module). Avec `github`, `ci.yml` porte déjà le job Sonar et l'étape Jira : doubler l'analyse consommerait le quota et produirait deux résultats concurrents. Le `Jenkinsfile` d'un projet GitHub ne change pas.
- **D3. Étape `Clé Jira`** : après `Titre de PR`, `when { changeRequest() }`, `withEnv(["PR_TITLE=${env.CHANGE_TITLE}", "HEAD_REF=${env.CHANGE_BRANCH ?: ''}"])` puis `sh 'node scripts/check-jira-key.mjs'` entre guillemets simples. Nom fixé par langue (`Clé Jira`, `Jira key`).
- **D4. Étape `Sonar`** : après `Commandes du projet`. Condition `when { allOf { … } }` : `environment name: 'SONAR_ENABLED', value: 'true'` (inactive sans la variable) et `expression { env.CHANGE_FORK == null }`. Les merge requests de fork sont exclues : la confiance de GitLab Branch Source décide seulement quel `Jenkinsfile` est lu, mais le code du fork s'exécute (`scripts/jenkins-setup.sh`, `.bootstrap/run-checks.mjs`, binaires en tête du `PATH`) avant l'étape, qui détient le jeton. En `server`, seulement sur la branche `main` (l'analyse des branches et des MR est réservée aux éditions commerciales) et l'étape refuse de lancer `sonar-scanner` sans `SONAR_HOST_URL`, pour que le jeton d'un serveur interne ne parte pas vers SonarCloud par défaut. Jeton lu par `withCredentials([string(credentialsId: 'SONAR_TOKEN', variable: 'SONAR_TOKEN')])` ; `sonar-scanner` lit `SONAR_TOKEN` et `SONAR_HOST_URL` dans l'environnement, donc `sh` entre guillemets simples, sans `-Dsonar.token` ni interpolation Groovy du jeton. En `cloud`, `SONAR_HOST_URL=https://sonarcloud.io` est posé dans la commande ; en `server`, la variable vient de l'environnement Jenkins.
- **D5. Où poser `SONAR_ENABLED` et `SONAR_HOST_URL`** : propriétés d'environnement globales de Jenkins ou du dossier de projet ; `docs/sonar.md` le dit. L'identifiant Jenkins `SONAR_TOKEN` (type « texte secret ») est créé par l'utilisateur.
- **D6. Limites de l'étape Sonar**, documentées : `sonar-scanner` doit être installé sur l'agent ; le délai de 10 minutes du pipeline couvre aussi l'analyse ; l'historique du clone peut être superficiel alors que Sonar attend l'historique complet ; aucun essai réel.
- **D7. Variantes de `core` et des agents** : avec `gitlab` et `jiraSource: jira`, `CLAUDE.md` et `docs/workflow.md` (lignes MR et squash) posent « ticket Jira » et `Refs <CLE-N>` ; dans les deux modes, le tableau des contrôles a une ligne `Clé Jira` sous le `Jenkinsfile` et la table « Double encodage » une ligne du titre et une de la clé, du `Jenkinsfile`. `spec-review` et `spec-reviewer` ont, avec `gitlab`, la lecture de l'issue dans GitLab ou, en mode `jira`, la consigne de demander le texte du ticket ; la description de `spec-reviewer` parle de ticket Jira en mode `jira`.
- **D8. Gabarits `.gitlab/`** : le gabarit de merge request suit le gabarit de PR de `github` (`Refs`, ligne Jira, id OpenSpec en minuscules) ; les gabarits d'issues gagnent un champ « Clé Jira » en mode `issue-source`.
- **D9. Docs** : `docs/jira.md` remplace, avec `gitlab`, l'app Jira Cloud pour GitHub et les « Autolink references » par l'intégration Jira de GitLab (réglage du projet) ; sa limite « le `Jenkinsfile` ne contrôle pas la clé » ne vaut qu'avec `github`. `docs/sonar.md` a une variante GitLab des étapes manuelles et sa limite « absence dans le `Jenkinsfile` » ne vaut qu'avec `github`.
- **D10. Textes bornés à GitHub** : la question « désactiver `projects` » du module `jira`, la valeur `jiraSource: github` (issues de la forge, GitHub ou GitLab) et l'accord Sonar de l'ARCH-004 généré (identifiant Jenkins et `SONAR_ENABLED` avec `gitlab`) sont précisés.
- **D11. ADR** : ARCH-017 (la clé est contrôlée par `ci.yml` ou par le `Jenkinsfile`, `requires` devient « github ou jenkins ») ; ARCH-018 (Jira et Sonar avec GitLab sur Jenkins) ; ARCH-004 du plugin (le consentement à l'analyse Sonar est le secret `SONAR_TOKEN` avec GitHub, la variable `SONAR_ENABLED` plus l'identifiant Jenkins avec GitLab).

## Hors périmètre

Étapes Jira et Sonar dans le `Jenkinsfile` d'un projet GitHub, `release`, `projects`, `dependabot`, `glab`, protection de `.gitlab/` par `developer`, essai réel contre GitLab, Jenkins, Jira ou Sonar.

## Risques

- L'étape `Sonar` n'est pas exécutée par un vrai Jenkins : comportement de `sonar-scanner`, URL SonarCloud et `CHANGE_BRANCH` non observés.
- `SONAR_ENABLED` est une convention du plugin, pas un réglage Jenkins natif.
