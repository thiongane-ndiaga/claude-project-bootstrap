## MODIFIED Requirements

### Requirement: Module agent-profiles
Le catalogue SHALL contenir un module `agent-profiles` qui requiert `claude` et vaut `default: false`. Sélectionné, il SHALL générer `.claude/agents/architect.md`, `.claude/agents/qa-engineer.md`, `.claude/agents/project-lead.md` et `.claude/hooks/profile-guard.mjs`, en français ou en anglais selon `docLanguage`. Non sélectionné, aucun de ces fichiers ni la déclaration de hook correspondante MUST NOT être généré.

#### Scenario: Module sélectionné
- **WHEN** un projet est généré avec `agent-profiles`
- **THEN** les trois profils et le hook existent et `claude` est présent

#### Scenario: Module absent
- **WHEN** un projet est généré sans `agent-profiles`
- **THEN** aucun profil, aucun `profile-guard.mjs` et aucun hook `PreToolUse` de bornage ne sont générés

#### Scenario: Langue anglaise
- **WHEN** un projet est généré avec `docLanguage: "en"`
- **THEN** les profils sont rédigés en anglais et ont les mêmes outils que les profils français

### Requirement: Déclaration du hook de bornage
Avec `agent-profiles`, `.claude/settings.json` SHALL déclarer un hook `PreToolUse` de type `command` appelant `profile-guard.mjs` pour les outils `Write`, `Edit`, `MultiEdit`, `NotebookEdit`, `Bash`, `PowerShell`, `Agent`, `Task` (ancien nom de `Agent`) et `Skill`. Il MUST NOT déclarer de réglage `agent` sauf si la clé `mainAgent` est présente. La fusion avec des réglages existants MUST conserver les hooks du projet.

#### Scenario: Déclaration dans settings.json
- **WHEN** `settings.json` est généré avec `agent-profiles` sans `mainAgent`
- **THEN** il contient un hook `PreToolUse` vers `profile-guard.mjs` pour les neuf outils et pas de clé `agent`

#### Scenario: Réglages existants
- **WHEN** `settings.json` contient déjà un hook `PreToolUse` du projet
- **THEN** il subsiste à côté de celui de `profile-guard.mjs`

### Requirement: Outils et frontmatter des profils
Chaque profil borné (`architect`, `qa-engineer`) SHALL déclarer sa liste `tools` dans son frontmatter et MUST NOT déclarer de `hooks`. `architect` SHALL disposer de `Agent` et `Skill`, `qa-engineer` de `Agent` sans `Skill`, et tous deux de `Write` et `Edit`, que le hook borne. `project-lead`, agent principal, MUST NOT déclarer de `tools` ni de `hooks`. Ce qu'un profil ne peut pas lancer lui-même, il SHALL le demander à l'agent principal.

#### Scenario: Outils et frontmatter
- **WHEN** les profils sont générés
- **THEN** aucun frontmatter ne contient `hooks`, `architect` a `Agent` et `Skill`, `qa-engineer` a `Agent` sans `Skill`, et `project-lead` n'a pas de ligne `tools`

## ADDED Requirements

### Requirement: Profil project-lead
`project-lead.md` SHALL contenir la consigne de délégation (`architect`, `qa-engineer`, puis `developer` et `business-analyst` seulement s'ils existent dans `.claude/agents/`, sinon le chef de projet écrit lui-même le code et les specs), le brief borné (objectif, fichiers de référence, critères de fin, contraintes, non-objectifs), l'échelle d'arbitrage à cinq niveaux et la règle « qui écrit ne relit pas ».

#### Scenario: Contenu de la définition
- **WHEN** `project-lead.md` est généré
- **THEN** il contient les sections de délégation, de brief borné et d'échelle à cinq niveaux, et la règle de relecture

### Requirement: Garde-fous de project-lead
`project-lead.md` SHALL exiger l'accord de l'utilisateur pour toute écriture visible à l'extérieur (niveau 5 de l'échelle) et porter lui-même l'échelle d'arbitrage et la répartition des rôles, pour qu'ils survivent à la compaction ; et `project-lead` MUST NOT figurer dans la table `PROFILES` du hook : l'agent principal reste sous le contrôle de l'utilisateur et ses garde-fous sont des consignes de son prompt.

#### Scenario: Pas de bornage de l'agent principal
- **WHEN** la table du hook est lue
- **THEN** elle ne contient pas `project-lead`

#### Scenario: Écritures visibles
- **WHEN** un projet est généré avec `github`
- **THEN** `project-lead.md` demande l'accord de l'utilisateur pour `gh issue create`, `gh pr create`, `gh pr merge` et les releases

### Requirement: Parcours de project-lead selon les modules
Les blocs de `project-lead.md` qui citent `archgate`, `archgate-plugin`, `openspec` ou `github` SHALL n'apparaître que si ces modules sont actifs. Avec `openspec`, il SHALL décrire `/opsx:explore` (mené en dialogue, sans décision ni code), `/opsx:update` et la lecture de l'avancement par `openspec status --json` et `list --json`. Avec `archgate`, il SHALL joindre les briefings d'ADR au brief et traiter les ADR comme des bloquants.

#### Scenario: Modules absents
- **WHEN** un projet est généré avec `agent-profiles` sans `archgate`, `openspec`, `github` ni `arc42`
- **THEN** `project-lead.md` ne mentionne aucun de ces modules ni leurs commandes

#### Scenario: Modules présents
- **WHEN** un projet est généré avec `openspec` et `archgate`
- **THEN** `project-lead.md` décrit `/opsx:explore`, `/opsx:update`, `openspec status --json` et les briefings d'ADR

### Requirement: Lancements demandés par les profils
Avec `archgate-plugin`, `project-lead` SHALL lancer `archgate:lessons-learned` en fin de tâche et `archgate:reviewer` quand `qa-engineer` le demande, et confier à `architect` les ADR qui en ressortent. Il SHALL traiter les demandes de lancement (agent, skill) que les profils lui adressent, en les lançant ou en refusant explicitement.

#### Scenario: Skills d'Archgate
- **WHEN** un projet est généré avec `archgate-plugin`
- **THEN** `project-lead.md` demande de lancer `archgate:lessons-learned` et `archgate:reviewer`

#### Scenario: Demandes des profils
- **WHEN** `project-lead.md` est généré
- **THEN** il demande de traiter ce que le hook refuse aux profils

### Requirement: Clé mainAgent
La configuration SHALL accepter une clé facultative `mainAgent` valant `"project-lead"`. Présente, `.claude/settings.json` SHALL contenir `"agent": "project-lead"` ; absente, aucune clé `agent` MUST NOT être écrite. Toute autre valeur, ou la clé sans le module `agent-profiles`, MUST faire échouer `scaffold.mjs` (code 1, aucun fichier écrit). La clé SHALL être consignée au manifeste seulement quand elle est présente et héritée par `--update`.

#### Scenario: Clé absente
- **WHEN** `mainAgent` est absent
- **THEN** `settings.json` n'a pas de clé `agent` et le manifeste ne contient pas `mainAgent`

#### Scenario: Clé présente
- **WHEN** `mainAgent` vaut `"project-lead"` avec `agent-profiles`
- **THEN** `settings.json` contient `"agent": "project-lead"` et le manifeste consigne la valeur

#### Scenario: Valeur invalide ou module absent
- **WHEN** `mainAgent` vaut `"autre"`, ou vaut `"project-lead"` sans `agent-profiles`
- **THEN** `scaffold.mjs` s'arrête avec le code 1 sans écrire de fichier

#### Scenario: Mise à jour
- **WHEN** `--update` est lancé sur un projet dont le manifeste consigne `mainAgent`
- **THEN** la valeur est conservée sans être répétée dans la configuration



### Requirement: Coexistence avec archgate-plugin
`agent-profiles` MUST NOT déclarer d'incompatibilité avec `archgate-plugin`. Avec `mainAgent`, le réglage `agent` du projet l'emporte sur l'agent du plugin Archgate.

#### Scenario: Combinaison acceptée
- **WHEN** un projet est généré avec `agent-profiles`, `archgate-plugin` et `mainAgent`
- **THEN** la génération réussit et `settings.json` contient `"agent": "project-lead"`

### Requirement: Désactivation de mainAgent
`mainAgent: null` SHALL désactiver la clé : elle n'est ni héritée du manifeste, ni consignée, et le module `agent-profiles` peut alors être retiré. Si `settings.json` ou `settings.local.json` déclare déjà un autre `agent`, la clé existante MUST être conservée et le rapport MUST porter un avertissement qui la nomme.

#### Scenario: Désactivation
- **WHEN** `--update` est lancé avec `mainAgent: null`
- **THEN** le manifeste ne consigne plus `mainAgent` et la valeur n'est pas héritée

#### Scenario: Retrait du module
- **WHEN** `agent-profiles` est retiré de la sélection avec `mainAgent: null`
- **THEN** `scaffold.mjs` réussit

#### Scenario: Agent déjà déclaré par le projet
- **WHEN** `mainAgent` est présent et `settings.json` ou `settings.local.json` déclare déjà un autre `agent`
- **THEN** la clé existante est conservée et le rapport porte un avertissement qui la nomme
