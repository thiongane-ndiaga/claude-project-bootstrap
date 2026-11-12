# Analyse Sonar

Le job `sonar` de `.github/workflows/ci.yml` analyse le code avec `SonarSource/sonarqube-scan-action` (épinglée sur un SHA). Il reste **inactif tant que le secret `SONAR_TOKEN` n'existe pas** : le job réussit alors sans analyse et une notice le dit. Il ne bloque jamais la CI à cause de la quality gate.

@@module:sonar-cloud
Service choisi : **SonarCloud**.
@@end
@@module:sonar-server
Service choisi : **serveur SonarQube auto-hébergé**. L'analyse ne tourne que sur les pushes vers `main` : l'analyse des branches et des pull requests est réservée aux éditions commerciales du serveur.
@@end

## Étapes manuelles

Le plugin n'écrit aucun secret et ne crée aucun compte : ces étapes sont les tiennes.

@@module:sonar-cloud
1. Créer l'organisation et le projet sur SonarCloud (import du dépôt GitHub).
2. Désactiver l'analyse automatique du projet (Administration, méthode d'analyse) : elle refuse l'analyse lancée par la CI. À vérifier dans la documentation Sonar de ton offre ; les dépôts privés dépendent du plan SonarCloud.
@@end
@@module:sonar-server
1. Créer le projet sur ton serveur SonarQube.
2. Créer la variable de dépôt `SONAR_HOST_URL` (Settings, Secrets and variables, Actions, Variables) avec l'URL du serveur, joignable depuis les exécuteurs GitHub.
@@end
3. Générer un jeton d'analyse dans Sonar.
4. Créer le secret de dépôt `SONAR_TOKEN` avec ce jeton (`gh secret set SONAR_TOKEN`, ou Settings, Secrets and variables, Actions).
@@module:sonar-cloud
5. Compléter `sonar-project.properties` : `sonar.projectKey` et `sonar.organization`, puis les exclusions propres au projet. Sans `sonar.projectKey`, l'analyse échoue dès que le secret existe.
@@end
@@module:sonar-server
5. Compléter `sonar-project.properties` : `sonar.projectKey`, puis les exclusions propres au projet. Sans `sonar.projectKey`, l'analyse échoue dès que le secret existe.
@@end
6. Avec le module `dependabot` : ses pull requests n'ont pas accès aux secrets Actions. Pour les analyser, ajouter aussi `SONAR_TOKEN` aux secrets de Dependabot.

## Quality gate

Par défaut le job ne dépend pas de la quality gate. Pour qu'une gate rouge fasse échouer le job, ajouter `sonar.qualitygate.wait=true` dans `sonar-project.properties`. Pour bloquer le merge, exiger dans la protection de `main` soit le check `sonar` (une fois la propriété posée), soit le contexte que l'application Sonar publie sur la pull request : l'audit le classe « autre application, non comparable ».

## Limites

- Le comportement de l'action n'a été vérifié par aucun essai réel contre SonarCloud ou un serveur : le plugin teste seulement la génération.
- Les pull requests de fork et celles de Dependabot n'ont pas accès aux secrets : elles ne sont pas analysées.
- L'action ne convient pas à tous les langages : Maven, Gradle et .NET demandent un scanner dédié, le C et le C++ un build wrapper, Java des fichiers compilés (`sonar.java.binaries`). Cela relève du projet.
- Aucun rapport de couverture n'est disponible : le job `sonar` est séparé du job `checks`.
- Le `Jenkinsfile` du module `jenkins` ne contient aucune étape Sonar.
@@module:sonar-cloud
- Passer de SonarCloud à un serveur (clé `sonar` à `server`) met `ci.yml` à jour mais pas `sonar-project.properties` : retirer `sonar.organization` à la main.
@@end
