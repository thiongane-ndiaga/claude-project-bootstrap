## MODIFIED Requirements

### Requirement: Matrice des modules
La suite de tests SHALL générer et contrôler les combinaisons suivantes, déduites du catalogue : le module `core` seul, chaque autre module avec sa chaîne de dépendances, la sélection par défaut, la sélection par défaut avec une stack choisie, la sélection par défaut avec le mode d'installation `user`, la sélection par défaut avec le mode d'installation `local`, la sélection complète, modules facultatifs compris, et la sélection complète en dépôt public.

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
