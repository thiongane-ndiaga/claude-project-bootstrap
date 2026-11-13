# Analyse Sonar

@@module:github
Le job `sonar` de `.github/workflows/ci.yml` analyse le code avec `SonarSource/sonarqube-scan-action` (épinglée sur un SHA). Il reste **inactif tant que le secret `SONAR_TOKEN` n'existe pas** : le job réussit alors sans analyse et une notice le dit. Il ne bloque jamais la CI à cause de la quality gate.
@@end
@@module:gitlab
L'étape `Sonar` du `Jenkinsfile` analyse le code avec `sonar-scanner`. Elle reste **inactive tant que la variable d'environnement `SONAR_ENABLED` n'est pas posée à `true`** : l'étape est alors sautée. Elle ne bloque jamais la CI à cause de la quality gate.
@@end

@@module:sonar-cloud
Service choisi : **SonarCloud**.
@@end
@@module:sonar-server
@@module:github
Service choisi : **serveur SonarQube auto-hébergé**. L'analyse ne tourne que sur les pushes vers `main` : l'analyse des branches et des pull requests est réservée aux éditions commerciales du serveur.
@@end
@@module:gitlab
Service choisi : **serveur SonarQube auto-hébergé**. L'analyse ne tourne que sur la branche `main` : l'analyse des branches et des pull requests est réservée aux éditions commerciales du serveur.
@@end
@@end

## Étapes manuelles

Le plugin n'écrit aucun secret et ne crée aucun compte : ces étapes sont les tiennes.

@@module:sonar-cloud
@@module:github
1. Créer l'organisation et le projet sur SonarCloud (import du dépôt GitHub).
@@end
@@module:gitlab
1. Créer l'organisation et le projet sur SonarCloud (import du dépôt GitLab, possible pour GitLab.com ; un GitLab auto-hébergé passe par un projet créé à la main).
@@end
2. Désactiver l'analyse automatique du projet (Administration, méthode d'analyse) : elle refuse l'analyse lancée par la CI. À vérifier dans la documentation Sonar de ton offre ; les dépôts privés dépendent du plan SonarCloud.
@@end
@@module:sonar-server
1. Créer le projet sur ton serveur SonarQube.
@@module:github
2. Créer la variable de dépôt `SONAR_HOST_URL` (Settings, Secrets and variables, Actions, Variables) avec l'URL du serveur, joignable depuis les exécuteurs GitHub.
@@end
@@module:gitlab
2. Poser la variable d'environnement `SONAR_HOST_URL` (URL du serveur, joignable depuis l'agent) dans les propriétés globales de Jenkins ou celles du dossier du projet.
@@end
@@end
3. Générer un jeton d'analyse dans Sonar.
@@module:github
4. Créer le secret de dépôt `SONAR_TOKEN` avec ce jeton (`gh secret set SONAR_TOKEN`, ou Settings, Secrets and variables, Actions).
@@end
@@module:gitlab
4. Créer l'identifiant Jenkins `SONAR_TOKEN` (type « texte secret ») avec ce jeton, puis poser la variable d'environnement `SONAR_ENABLED` à `true` (propriétés globales de Jenkins ou du dossier du projet) : sans elle l'étape `Sonar` est sautée.
@@end
@@module:sonar-cloud
@@module:github
5. Compléter `sonar-project.properties` : `sonar.projectKey` et `sonar.organization`, puis les exclusions propres au projet. Sans `sonar.projectKey`, l'analyse échoue dès que le secret existe.
@@end
@@module:gitlab
5. Compléter `sonar-project.properties` : `sonar.projectKey` et `sonar.organization`, puis les exclusions propres au projet. Sans `sonar.projectKey`, l'analyse échoue dès que `SONAR_ENABLED` est posée.
@@end
@@end
@@module:sonar-server
@@module:github
5. Compléter `sonar-project.properties` : `sonar.projectKey`, puis les exclusions propres au projet. Sans `sonar.projectKey`, l'analyse échoue dès que le secret existe.
@@end
@@module:gitlab
5. Compléter `sonar-project.properties` : `sonar.projectKey`, puis les exclusions propres au projet. Sans `sonar.projectKey`, l'analyse échoue dès que `SONAR_ENABLED` est posée.
@@end
@@end
@@module:github
6. Avec le module `dependabot` : ses pull requests n'ont pas accès aux secrets Actions. Pour les analyser, ajouter aussi `SONAR_TOKEN` aux secrets de Dependabot.
@@end
@@module:gitlab
6. Installer `sonar-scanner` sur l'agent Jenkins : l'étape l'appelle par son nom.
@@end

## Quality gate

@@module:github
Par défaut le job ne dépend pas de la quality gate. Pour qu'une gate rouge fasse échouer le job, ajouter `sonar.qualitygate.wait=true` dans `sonar-project.properties`. Pour bloquer le merge, exiger dans la protection de `main` soit le check `sonar` (une fois la propriété posée), soit le contexte que l'application Sonar publie sur la pull request : l'audit le classe « autre application, non comparable ».
@@end
@@module:gitlab
Par défaut l'étape ne dépend pas de la quality gate. Pour qu'une gate rouge fasse échouer l'étape, donc le build, ajouter `sonar.qualitygate.wait=true` dans `sonar-project.properties` ; avec « Pipelines must succeed » (voir `docs/gitlab.md`), le merge est alors bloqué.
@@end

## Limites

@@module:github
- Le comportement de l'action n'a été vérifié par aucun essai réel contre SonarCloud ou un serveur : le plugin teste seulement la génération.
@@end
@@module:gitlab
- Le comportement de `sonar-scanner` n'a été vérifié par aucun essai réel contre SonarCloud ou un serveur : le plugin teste seulement la génération.
@@end
@@module:github
- Les pull requests de fork et celles de Dependabot n'ont pas accès aux secrets : elles ne sont pas analysées.
@@end
@@module:gitlab
- Les merge requests de fork ne sont pas analysées : l'étape `Sonar` les exclut (`CHANGE_FORK`) pour ne pas exposer le jeton à du code de fork.
@@end
@@module:github
- L'action ne convient pas à tous les langages : Maven, Gradle et .NET demandent un scanner dédié, le C et le C++ un build wrapper, Java des fichiers compilés (`sonar.java.binaries`). Cela relève du projet.
@@end
@@module:gitlab
- `sonar-scanner` ne convient pas à tous les langages : Maven, Gradle et .NET demandent un scanner dédié, le C et le C++ un build wrapper, Java des fichiers compilés (`sonar.java.binaries`). Cela relève du projet.
@@end
@@module:github
- Aucun rapport de couverture n'est disponible : le job `sonar` est séparé du job `checks`.
@@end
@@module:gitlab
- Aucun rapport de couverture n'est importé.
@@end
@@module:github
- Le `Jenkinsfile` du module `jenkins` ne contient aucune étape Sonar.
@@end
@@module:gitlab
- Le délai de 10 minutes du pipeline couvre aussi l'analyse : le monter dans le `Jenkinsfile` si besoin.
- L'historique du clone peut être superficiel selon GitLab Branch Source, alors que Sonar attend l'historique complet.
- En mode `cloud`, une branche qui a une merge request ouverte peut être analysée deux fois (build de branche et build de la MR), selon la stratégie de découverte de GitLab Branch Source.
@@end
@@module:sonar-cloud
@@module:github
- Passer de SonarCloud à un serveur (clé `sonar` à `server`) met `ci.yml` à jour mais pas `sonar-project.properties` : retirer `sonar.organization` à la main.
@@end
@@module:gitlab
- Passer de SonarCloud à un serveur (clé `sonar` à `server`) met le `Jenkinsfile` à jour mais pas `sonar-project.properties` : retirer `sonar.organization` à la main.
@@end
@@end
