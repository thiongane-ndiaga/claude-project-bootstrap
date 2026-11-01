## MODIFIED Requirements

### Requirement: Matrice des modules
La suite de tests SHALL générer et contrôler les combinaisons suivantes, déduites du catalogue : le module `core` seul, chaque autre module avec sa chaîne de dépendances, la sélection par défaut, la sélection par défaut avec une stack choisie, la sélection par défaut avec le mode d'installation `user`, la sélection par défaut avec le mode d'installation `local`, la sélection par défaut en anglais, la sélection complète, modules facultatifs compris, la sélection complète en dépôt public, et la sélection complète en anglais. Les variantes anglaises MUST retirer de la configuration de base les valeurs françaises explicites (`docLanguageName`, `actionsCreditNote`).

#### Scenario: Module seul avec ses dépendances
- **WHEN** la matrice génère le module `release`
- **THEN** le projet contient aussi les fichiers du module `github`, dont `release` dépend

#### Scenario: Module ajouté au catalogue
- **WHEN** un module est ajouté au catalogue
- **THEN** la matrice génère sa combinaison et le test échoue sur son instantané manquant

#### Scenario: Variante publique
- **WHEN** la sélection complète est générée en dépôt public
- **THEN** ses fichiers dépendant de la visibilité sont contrôlés et figés dans leur propre instantané

#### Scenario: Modes d'installation des CLI
- **WHEN** la matrice génère `default-cli-user` et `default-cli-local`
- **THEN** chacune est contrôlée par les invariants communs et figée dans son instantané, et `default-cli-local` contient `package.json`

#### Scenario: Variantes anglaises
- **WHEN** la matrice génère `default-en` et `full-en`
- **THEN** chacune est contrôlée par les invariants communs, figée dans son instantané, et a les mêmes chemins que sa variante française

### Requirement: Validation par les CLI réelles
Pour les sélections par défaut, complète et complète en anglais, générées avec les versions de CLI installées, la suite SHALL exécuter `openspec init` (avec `--language` égal à la langue de la combinaison) puis vérifier qu'il ne modifie aucun fichier suivi, `openspec validate --all --strict --no-interactive`, `openspec doctor --json` (aucune erreur, racine égale au projet), `archgate check`, et l'audit du plugin sur un dépôt git temporaire indépendant du poste (identité fixée, sans signature ni hooks globaux, `pre-push` exécutable, `core.hooksPath` réglé), sans écart.

#### Scenario: Projet généré accepté
- **WHEN** la sélection complète est générée et validée avec les CLI réelles
- **THEN** les commandes réussissent, `openspec init` ne modifie aucun fichier suivi et l'audit ne rapporte aucun écart

#### Scenario: Projet généré en anglais accepté
- **WHEN** la sélection complète en anglais est générée et validée avec les CLI réelles
- **THEN** `openspec init --language en`, `openspec validate`, `openspec doctor`, `archgate check` et l'audit réussissent sans écart

#### Scenario: Audit sans contrôle non vérifiable
- **WHEN** `openspec` et `archgate` sont tous deux installés
- **THEN** l'audit du projet généré ne laisse aucun contrôle non vérifiable

#### Scenario: Une CLI absente en local
- **WHEN** `archgate` est introuvable, `openspec` présent, et `CI` non défini
- **THEN** seules les vérifications d'Archgate sont ignorées, avec un message qui le nomme, et celles d'OpenSpec s'exécutent

#### Scenario: CLI absentes en CI
- **WHEN** `openspec` ou `archgate` est introuvable et que `CI` est défini
- **THEN** le test échoue en nommant l'outil
