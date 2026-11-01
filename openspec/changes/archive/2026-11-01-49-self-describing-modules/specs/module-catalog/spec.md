## ADDED Requirements

### Requirement: Un module est un dossier
Chaque module SHALL être un dossier `assets/modules/<nom>/` contenant un descripteur `module.json`, et éventuellement ses modèles (`templates/`, `templates.<lang>/`) et ses tests (`tests/*.test.mjs`). Le catalogue SHALL être assemblé en découvrant ces dossiers ; ajouter un module MUST NOT demander de modifier un fichier du plugin hors de son dossier. Le module `core` SHALL exister.

#### Scenario: Module de démonstration
- **WHEN** un dossier de module est ajouté à une copie du plugin, sans autre modification
- **THEN** le module apparaît dans le catalogue, ses fichiers sont générés quand il est choisi, et `--list-modules` le décrit

#### Scenario: Module `core` absent
- **WHEN** aucun dossier `core` n'existe
- **THEN** `scaffold.mjs` s'arrête avec le code 1

#### Scenario: Instantanés de la matrice
- **WHEN** un module est ajouté
- **THEN** les instantanés de la matrice se régénèrent par `UPDATE_SNAPSHOTS=1`, ce ne sont pas des fichiers du plugin

### Requirement: Descripteur de module
`module.json` SHALL déclarer `description` (obligatoire), et facultativement `requires`, `default`, `conflicts`, `questions` et `files`. Chaque entrée de `files` SHALL avoir un `path` et facultativement `when`, `merge` et `owned`. Un champ inconnu MUST être refusé. Les `questions` sont du texte posé à la phase 0 quand le module est choisi ; leurs réponses ne sont pas enregistrées dans un schéma de configuration propre au module.

#### Scenario: Champ inconnu
- **WHEN** un descripteur contient une clé inconnue
- **THEN** `scaffold.mjs` s'arrête avec le code 1 en nommant le descripteur et la clé

#### Scenario: Description absente
- **WHEN** un descripteur n'a pas de `description`
- **THEN** `scaffold.mjs` s'arrête avec le code 1 en nommant le descripteur

### Requirement: Propriété des fichiers et condition de génération
Un fichier appartient au module qui le déclare. Il n'est généré que si ce module et tous les modules de son `when` sont actifs ; le catalogue assemblé SHALL exposer cette condition complète, avec le propriétaire en premier. Le propriétaire cité dans `when` est toléré et un doublon ignoré. Les fichiers SHALL être triés par chemin.

#### Scenario: Condition de génération
- **WHEN** `openspec` déclare `.claude/agents/spec-reviewer.md` avec `when: ["claude"]`
- **THEN** le fichier n'est généré que si `openspec` et `claude` sont choisis

#### Scenario: Pseudo-module dans when
- **WHEN** un `when` cite `cli-local`
- **THEN** il est accepté, alors qu'un `requires` ou `conflicts` ne peut pas citer un pseudo-module

### Requirement: Validation des références
Le chargement SHALL échouer (code 1, fichier fautif nommé) quand un descripteur est illisible, quand `requires`, `conflicts` ou `when` citent un module inconnu, quand un module est incompatible avec lui-même ou avec un module qu'il requiert, ou quand un dossier porte le nom d'un pseudo-module ou un nom de module invalide.

#### Scenario: Module requis inconnu
- **WHEN** `requires` cite un module qui n'existe pas
- **THEN** le chargement échoue en nommant le descripteur et le module

#### Scenario: Dossier nommé comme un pseudo-module
- **WHEN** un dossier s'appelle `cli-local`
- **THEN** le chargement échoue

### Requirement: Validation des fichiers
Le chargement SHALL échouer (code 1, fichier fautif nommé) quand un fichier déclaré n'a pas de modèle dans `templates/` du module, quand un modèle n'est pas déclaré, quand un chemin est déclaré par deux modules ou par deux chemins qui ne diffèrent que par la casse, ou quand deux fichiers portent le même numéro d'ADR `ARCH-NNN`.

#### Scenario: Modèle manquant
- **WHEN** un descripteur déclare un fichier sans modèle
- **THEN** le chargement échoue en nommant le module et le chemin

#### Scenario: Chemin déclaré deux fois
- **WHEN** deux modules déclarent le même chemin
- **THEN** le chargement échoue en nommant les deux modules

#### Scenario: Numéro d'ADR dupliqué
- **WHEN** deux modèles d'ADR portent `ARCH-002`
- **THEN** le chargement échoue

### Requirement: Chemins et noms sûrs
Le chargement SHALL refuser un chemin déclaré absolu, avec antislash, avec un segment vide, `.` ou `..`, avec un caractère interdit sous Windows, un point ou une espace final, ou un nom réservé de Windows. Il SHALL refuser les chemins réservés au générateur (`.claude/settings.json`, `package.json`, `.bootstrap/manifest.json`, `.bootstrap/base/**`, `.bootstrap/local/**`, `.git/**`) et tout lien symbolique dans un dossier de module.

#### Scenario: Chemin réservé
- **WHEN** un module déclare `.claude/settings.json`
- **THEN** le chargement échoue (chemin réservé au générateur)

#### Scenario: Chemin hors du projet
- **WHEN** un module déclare `a/../b.md`
- **THEN** le chargement échoue

#### Scenario: Lien symbolique
- **WHEN** un dossier de modèles contient un lien symbolique
- **THEN** le chargement échoue, sauf impossibilité de le créer sur le système de test

### Requirement: Langues du catalogue
Une langue SHALL être disponible quand le module `core` a son dossier `templates.<lang>/`. Un `templates.<lang>` d'un autre module sans équivalent dans `core` MUST être refusé, comme `templates.fr` et une version localisée sans modèle de référence dans le même module.

#### Scenario: Langue fournie par core
- **WHEN** `core` a `templates.en/`
- **THEN** la langue `en` est disponible

#### Scenario: Langue absente de core
- **WHEN** seul le module `github` a `templates.de/`
- **THEN** le chargement échoue en nommant le dossier

### Requirement: Sortie identique au catalogue central
Le catalogue assemblé SHALL produire exactement les fichiers (chemins et contenus), le manifeste et les rapports que produisait le catalogue central, pour toutes les combinaisons de la matrice.

#### Scenario: Instantanés de la matrice
- **WHEN** la matrice est lancée après la migration
- **THEN** aucun instantané existant ne change

### Requirement: Liste des modules générée
`scaffold.mjs --list-modules` SHALL, sans `--target` ni `--config`, lire les descripteurs et afficher pour chaque module son nom, sa description, ses dépendances, ses incompatibilités, sa valeur par défaut et ses questions (JSON avec les langues disponibles, ou tableau markdown avec `--format table`). `SKILL.md` MUST NOT recopier cette liste. `--catalog` SHALL désigner un dossier de modules alternatif, et un catalogue invalide MUST faire échouer toute commande, `--detect` comprise.

#### Scenario: Liste en JSON
- **WHEN** `--list-modules` est lancé sans autre option
- **THEN** il liste les modules du catalogue avec leurs champs et les langues

#### Scenario: Questions de phase 0
- **WHEN** un module déclare des `questions`
- **THEN** `--list-modules` les rapporte, et `SKILL.md` demande de les poser pour les modules choisis

#### Scenario: Catalogue invalide
- **WHEN** `--catalog` désigne un dossier introuvable ou un descripteur illisible
- **THEN** la commande s'arrête avec le code 1

### Requirement: Tests de module
`tests/modules.test.mjs` SHALL découvrir et lancer les fichiers `tests/*.test.mjs` des dossiers de modules, accepter `--root` pour une copie du plugin, échouer en nommant le module si l'un échoue, et être lancé par `.bootstrap/checks.json`.

#### Scenario: Test de module en échec
- **WHEN** un test de module échoue
- **THEN** `tests/modules.test.mjs` échoue en nommant le module

### Requirement: Format documenté
`CONTRIBUTING.md` SHALL décrire le format d'un module (dossier, descripteur, propriété des fichiers, `when`, chemins réservés, langues, tests), ce qui reste codé hors du dossier d'un module (permissions de `settings.json`, étapes de `state.mjs`, contrôles de `audit.mjs`, migrations) et la procédure pour en ajouter un.

#### Scenario: Ajouter un module
- **WHEN** une personne veut ajouter un module
- **THEN** `CONTRIBUTING.md` lui indique les fichiers à créer et la commande de vérification
