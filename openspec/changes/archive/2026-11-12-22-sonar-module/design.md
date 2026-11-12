## Contexte

`ci.yml` (module `github`) porte des blocs `@@module:…` et des paramètres `{{…_REF}}` pour les actions épinglées (`config.actions.*`, résolues à la phase 0 par `resolve-versions.mjs`). Le moteur de modules sait déjà dériver des pseudo-modules de la configuration (`advisor-on`, `cli-local`) et hériter des clés du manifeste lors de `--update`. ARCH-010 reconnaît que les réponses aux questions d'un module ne passent pas par un schéma de configuration : `sonar` ajoute, comme `advisor`, une clé, un paramètre et deux pseudo-modules dans `scaffold.mjs`.

## Décisions

- **D1. Job dans `ci.yml`**, comme demandé par l'issue : bloc `@@module:sonar`. Un seul runner `ubuntu-latest` (pas la matrice `ciOs`), `timeout-minutes: 15`, checkout avec `fetch-depth: 0` (tous les exemples de l'action l'utilisent, la détection des lignes nouvelles en dépend). Le job apparaît parmi ceux que l'audit compare aux contextes exigés.
- **D2. Action unique** `SonarSource/sonarqube-scan-action` pour SonarCloud et le serveur (licence LGPL-3.0, open source : ARCH-004). Épinglée sur un SHA ; Dependabot (module `dependabot`) la met à jour. Le service (SonarCloud ou serveur) est externe.
- **D3. Inactif sans jeton.** `SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}` au niveau du job, étape d'analyse conditionnée par `env.SONAR_TOKEN != ''` (un secret ne se teste pas dans un `if` de job, le contexte `env` oui). Sans secret (projet neuf, PR de fork, PR de Dependabot) l'étape est sautée et le job reste vert ; une étape `::notice::` le dit quand le jeton manque. L'étape est aussi sautée sur l'événement `edited` d'une PR (titre ou description modifiés).
- **D4. Quality gate non bloquante.** Pas de `sonar.qualitygate.wait` : le job ne rougit pas pour la gate. Le job `sonar` étant vert sans gate, l'exiger comme check ne bloque rien ; `docs/sonar.md` indique le contexte posté par SonarCloud à exiger pour bloquer sur la gate, que l'audit classe « autre application, non comparable ».
- **D5. Clé `sonar` = `cloud` | `server`.** Absente = `cloud` (clé non consignée). Autre valeur : refus (code 1). La clé sans le module `sonar` est refusée (code 1), comme `advisor` sans son module. Elle est héritée du manifeste par `--update` ; `sonar: null` la retire (ni héritée ni consignée) ; retirer le module alors que la clé est héritée échoue, comme pour `advisor`. `sonar-server` ajoute `SONAR_HOST_URL: ${{ vars.SONAR_HOST_URL }}` au job et limite l'analyse à l'événement `push`, car l'analyse des branches et des pull requests est réservée aux éditions commerciales de SonarQube Server : une analyse de PR sur l'édition Community pourrait échouer et rougir la CI. `sonar-cloud` ajoute `sonar.organization` aux propriétés.
- **D6. `sonar-project.properties` propre au projet** (`owned`, ARCH-006/010) : `sonar.projectKey` (et `sonar.organization` en `cloud`) en commentaire à compléter, `sonar.sources=.` et des exclusions actives (`.claude/**`, `.bootstrap/**`, `.archgate/**`, `.githooks/**`, `.github/**`, `openspec/**`, `docs/**`) pour que les fichiers du plugin ne faussent pas les mesures. Tant que `sonar.projectKey` est absente, l'analyse échoue dès que le jeton existe : `docs/sonar.md` le dit. Passer de `cloud` à `server` par `--update` met à jour `ci.yml` mais laisse les propriétés du projet intactes (`sonar.organization` à retirer à la main).
- **D7. Aucun secret écrit par le plugin.** Créer le secret vaut accord explicite au sens d'ARCH-004 (« aucune automatisation qui consomme des tokens d'API en CI sans accord explicite »). Le secret et la variable sont créés par l'utilisateur ; `SKILL.md` les range dans « ce qui restera manuel ».
- **D8. Épinglage.** `resolve-versions.mjs` résout et consigne toujours `actions.sonarScan`, comme les autres actions, que le module soit actif ou non. Sans `actions.sonarScan` dans la configuration, la génération échoue (paramètre non résolu) quand `sonar` est actif.
- **D9. ADR.** Le ARCH-004 du plugin et le modèle généré (`archgate`, `templates` et `templates.en`, ligne `@@module:sonar`) sont amendés : job d'analyse optionnel, action open source, service externe, secret créé par l'utilisateur.
- **D10. Tests du module** dans `assets/modules/sonar/tests/sonar.test.mjs` (ARCH-010) ; les cas qui passent par `--update` et le refus de la clé restent dans `tests/scaffold.test.mjs`.

## Hors périmètre

- Scanners propres à une stack (Maven, Gradle, .NET, build wrapper C/C++), `sonar.java.binaries` et paramètres de langage : à la charge du projet, dans `sonar-project.properties` ou un scanner dédié.
- Import de couverture : le job `sonar` est séparé de `checks`, aucun rapport n'y est disponible.
- Analyse des PR de fork par `workflow_run`, quality gate bloquante, contrôle d'audit sur le secret.
- Étape Sonar dans le `Jenkinsfile` : le module `jenkins` rejoue `ci.yml` sans le job `sonar`.

## Risques

- Aucun essai réel contre SonarCloud ou un serveur : le comportement de l'action n'est vérifié que par la génération. Les pièges sont documentés comme non observés.
- SonarCloud peut refuser l'analyse CI si l'analyse automatique est activée sur le projet : cité dans `docs/sonar.md`.
- Les PR de Dependabot n'ont pas accès aux secrets Actions : elles ne sont pas analysées, sauf si `SONAR_TOKEN` est aussi un secret Dependabot.
