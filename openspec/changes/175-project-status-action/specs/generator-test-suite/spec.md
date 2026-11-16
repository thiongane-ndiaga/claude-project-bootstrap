# Spec Delta

## ADDED Requirements

### Requirement: Aucun jeton dans les fichiers générés
Pour chaque combinaison de la matrice, la suite SHALL parcourir tous les fichiers générés (bases de fusion comprises) et échouer, en nommant le fichier, si l'un contient `ghp_` ou `github_pat_`.

#### Scenario: Jeton dans un fichier
- **WHEN** la fonction des invariants reçoit un fichier dont le contenu inclut `ghp_x` ou `github_pat_x`
- **THEN** elle signale un problème qui nomme le fichier

#### Scenario: Génération saine
- **WHEN** les combinaisons de la matrice sont générées à partir des modèles du dépôt
- **THEN** aucun fichier généré ne contient `ghp_` ni `github_pat_`
