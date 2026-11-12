## MODIFIED Requirements

### Requirement: Limites documentées
`docs/jenkins.md` SHALL énoncer les limites : complément de `ci.yml`, agents Linux ou macOS (étiquette d'agent à poser), `ciOs` ignoré, historique git possiblement superficiel, `Jenkinsfile` exécuté par aucun test du plugin, nom du contexte Jenkins non comparé aux jobs par l'audit `forge-protection`, dépôt privé sans protection de branche, prérequis `package-lock.json` en mode local.

#### Scenario: Selon la visibilité et le mode
- **WHEN** le projet est privé ou en mode `local`
- **THEN** le paragraphe sur l'absence de protection de branche ou sur `package-lock.json` apparaît, et il est absent sinon
