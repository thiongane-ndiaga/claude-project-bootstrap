## ADDED Requirements

### Requirement: Module jenkins dans l'audit
Avec le module `jenkins` actif, l'audit SHALL reconnaître comme non comparable tout contexte exigé sur `main` qui commence par `continuous-integration/jenkins/`, et, hors mode `local`, lire la version de chaque CLI épinglée dans le `Jenkinsfile` comme une source de plus du contrôle des versions.

#### Scenario: Contexte Jenkins exigé
- **WHEN** `jenkins` est actif et la protection de `main` exige `continuous-integration/jenkins/pr-merge`
- **THEN** le contrôle `forge-protection` n'est pas un écart et cite ce contexte comme non comparable aux jobs

#### Scenario: Contexte Jenkins sans le module
- **WHEN** `jenkins` n'est pas actif et la protection exige un contexte `continuous-integration/jenkins/…`
- **THEN** le contrôle est un écart qui le nomme

#### Scenario: Autre check inexistant
- **WHEN** la protection exige un contexte Jenkins et un check qui ne correspond à aucun job
- **THEN** le contrôle est un écart qui nomme ce check seulement

#### Scenario: Version divergente dans le Jenkinsfile
- **WHEN** `jenkins` est actif, hors mode `local`, et le `Jenkinsfile` épingle une autre version d'OpenSpec que `ci.yml`
- **THEN** le contrôle de version est un écart qui cite `Jenkinsfile` et propose d'aligner le `Jenkinsfile`

#### Scenario: Mode local
- **WHEN** `jenkins` est actif en mode `local`
- **THEN** aucune version n'est lue dans le `Jenkinsfile`
