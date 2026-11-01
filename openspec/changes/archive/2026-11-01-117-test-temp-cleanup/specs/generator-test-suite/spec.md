## ADDED Requirements

### Requirement: Dossiers temporaires des suites
Chaque suite de tests SHALL créer ses dossiers jetables sous un dossier propre à son exécution, obtenu en redirigeant `TMPDIR`, `TEMP` et `TMP`, et SHALL le supprimer à la sortie, y compris quand un test échoue. Une exécution complète de `node .bootstrap/run-checks.mjs` MUST NOT laisser de dossier `pb-*` dans le dossier temporaire du système. Avec `KEEP_TMP=1`, le dossier SHALL être conservé et son chemin affiché.

#### Scenario: Suppression à la sortie
- **WHEN** une suite crée des dossiers jetables puis se termine
- **THEN** le dossier de l'exécution et son contenu n'existent plus

#### Scenario: Conservation pour déboguer
- **WHEN** `KEEP_TMP=1` est défini
- **THEN** le dossier est conservé et la suite affiche son chemin

#### Scenario: Processus enfants
- **WHEN** une suite lance un processus enfant qui crée un dossier temporaire
- **THEN** ce dossier se trouve sous la racine de l'exécution
