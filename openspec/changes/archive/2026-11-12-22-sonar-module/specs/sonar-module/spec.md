## ADDED Requirements

### Requirement: Module sonar
Le module `sonar` SHALL être optionnel (`default: false`), exiger `github` et générer `sonar-project.properties`, `docs/sonar.md` et un job `sonar` dans `ci.yml`. Sans le module, aucun de ces éléments n'apparaît et `ci.yml` est inchangé.

#### Scenario: Module actif
- **WHEN** un projet est généré avec `sonar`
- **THEN** les deux fichiers existent et `ci.yml` contient le job `sonar`

#### Scenario: Module absent
- **WHEN** un projet est généré sans `sonar`
- **THEN** ni ces fichiers ni le job n'existent

#### Scenario: Sans github
- **WHEN** `sonar` est demandé sans `github`
- **THEN** la génération est refusée (code 1)

### Requirement: Job unique et inactif sans jeton
Le job `sonar` SHALL tourner sur `ubuntu-latest` avec l'historique complet, lire `secrets.SONAR_TOKEN` dans l'environnement du job et conditionner l'analyse à `env.SONAR_TOKEN != ''` et à un événement autre que `edited`. Sans secret, le job réussit sans analyse et une étape le signale. Aucun `sonar.qualitygate.wait` n'est posé.

#### Scenario: Étape conditionnée
- **WHEN** un projet est généré avec `sonar`
- **THEN** l'étape d'analyse porte `env.SONAR_TOKEN != ''`, le checkout a `fetch-depth: 0`, et aucune propriété `qualitygate.wait` n'existe

### Requirement: Action épinglée
L'étape d'analyse SHALL utiliser `SonarSource/sonarqube-scan-action` épinglée sur un SHA de commit tiré de `actions.sonarScan`, jamais un tag. La résolution des versions (toujours) et l'audit des actions épinglées SHALL couvrir cette action.

#### Scenario: SHA dans ci.yml
- **WHEN** un projet est généré avec `sonar`
- **THEN** la référence de l'action est un SHA de quarante caractères suivi du tag en commentaire

#### Scenario: Épinglage absent
- **WHEN** `sonar` est actif et `actions.sonarScan` manque
- **THEN** la génération échoue en nommant le paramètre non résolu

### Requirement: SonarCloud ou serveur
La clé `sonar` SHALL valoir `cloud` (défaut, non consignée si absente) ou `server`, et n'est acceptée qu'avec le module `sonar`. En `server`, le job SHALL exporter `SONAR_HOST_URL` depuis la variable de dépôt du même nom et n'analyser que l'événement `push` ; en `cloud`, les propriétés SHALL prévoir `sonar.organization`.

#### Scenario: Mode cloud par défaut
- **WHEN** la clé `sonar` est absente
- **THEN** les propriétés prévoient `sonar.organization`, le job n'exporte pas `SONAR_HOST_URL` et la clé n'est pas consignée au manifeste

#### Scenario: Mode serveur
- **WHEN** `sonar` vaut `server`
- **THEN** le job exporte `SONAR_HOST_URL`, n'analyse que `push`, et les propriétés n'ont pas `sonar.organization`

#### Scenario: Valeur invalide ou module absent
- **WHEN** `sonar` vaut une autre valeur, ou est donnée sans le module `sonar`
- **THEN** la génération est refusée (code 1)

### Requirement: Héritage par --update
La clé `sonar` consignée au manifeste SHALL être héritée par `--update` ; `sonar: null` la retire sans la consigner, et retirer le module alors que la clé est héritée échoue.

#### Scenario: Héritage
- **WHEN** un projet `server` est mis à jour sans la clé `sonar`
- **THEN** `ci.yml` garde `SONAR_HOST_URL`

#### Scenario: Retrait du module
- **WHEN** `--update` retire le module `sonar` alors que la clé est héritée
- **THEN** la commande échoue (code 1), sauf avec `sonar: null`

### Requirement: Fichier de propriétés du projet
`sonar-project.properties` SHALL être un fichier du projet (`owned`) : créé une fois, jamais écrasé par `--update`, un fichier existant divergent n'étant pas remplacé. Il pose `sonar.sources=.` et des exclusions pour les dossiers du plugin.

#### Scenario: Mise à jour
- **WHEN** le projet modifie `sonar-project.properties` puis lance `--update`
- **THEN** le fichier reste tel quel

#### Scenario: Fichier existant
- **WHEN** un `sonar-project.properties` divergent existe à la première génération
- **THEN** il est conservé tel quel, sans conflit

### Requirement: Documentation des étapes manuelles
`docs/sonar.md` (français et anglais) SHALL lister les étapes de l'utilisateur (compte ou serveur, projet, jeton, secret `SONAR_TOKEN`, variable `SONAR_HOST_URL` en mode serveur, clés des propriétés, analyse automatique de SonarCloud à désactiver), l'activation de la quality gate et le check à exiger, et les limites (aucun essai réel, PR de fork et de Dependabot, éditions Community, stacks à scanner dédié, absence dans le `Jenkinsfile`).

#### Scenario: Étapes présentes
- **WHEN** un projet est généré avec `sonar`, en français puis en anglais
- **THEN** `docs/sonar.md` contient ces étapes, avec `SONAR_HOST_URL` seulement en mode serveur
