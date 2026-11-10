## ADDED Requirements

### Requirement: Classement des outils MCP
Pour un outil `mcp__<serveur>__<outil>` (partie finale prise après le dernier `__`), `profile-guard.mjs` SHALL refuser (code 2) un profil de la table, sauf si la partie finale, non vide, commence par `get`, `list`, `search`, `read`, `find`, `fetch`, `view`, `describe`, `show` ou `check` suivi de `_` ou de la fin, ou finit par `_read`, `_get`, `_list` ou `_search`, et ne contient aucun mot de `WRITE_WORDS` (`create`, `update`, `run`, `query`…).

#### Scenario: Outil de lecture
- **WHEN** `project-lead` appelle `mcp__plugin_github_github__get_file_contents`, `mcp__plugin_github_github__issue_read`, `mcp__plugin_github_github__list_issues` ou `mcp__claude_ai_Claude_Docs__read`
- **THEN** le hook se termine avec le code 0

#### Scenario: Outil d'écriture
- **WHEN** `project-lead` appelle `mcp__plugin_github_github__issue_write`, `mcp__plugin_github_github__merge_pull_request` ou `mcp__claude-in-chrome__navigate`
- **THEN** le hook se termine avec le code 2

#### Scenario: Préfixe ou suffixe de lecture trompeur
- **WHEN** `project-lead` appelle `mcp__plugin_github_github__mark_all_notifications_read`, `mcp__docs__find_and_replace`, `mcp__x__get_or_create_label`, `mcp__sql__run_query`, `mcp__x__getaway_x` ou `mcp__x__checkout_branch`
- **THEN** le hook se termine avec le code 2

#### Scenario: Nom mal formé
- **WHEN** `project-lead` appelle `mcp__x__`, `mcp__x` ou `mcp__x__list__create_item`
- **THEN** le hook se termine avec le code 2

#### Scenario: Agent hors de la table
- **WHEN** un agent absent de la table ou sans `agent_type` appelle `mcp__plugin_github_github__issue_write`
- **THEN** le hook se termine avec le code 0

### Requirement: Liste mcpAllow et message de refus
L'entrée d'un profil de la table SHALL pouvoir porter `mcpAllow`, liste de noms complets d'outils MCP permis, vide par défaut et propre à chaque entrée. Le refus d'un outil MCP SHALL nommer l'outil, citer `mcpAllow` et l'utilisateur, et citer `gh issue` et `gh pr` quand le nom de l'outil contient `github`.

#### Scenario: Outil autorisé par mcpAllow
- **WHEN** l'entrée de `project-lead` porte `mcpAllow: ["mcp__serveur__publish"]` et qu'il appelle cet outil
- **THEN** le hook se termine avec le code 0, et le même appel d'un autre profil de la table reste refusé

#### Scenario: Message d'orientation
- **WHEN** `project-lead` appelle `mcp__plugin_github_github__issue_write`
- **THEN** le hook se termine avec le code 2 et le message nomme l'outil, `mcpAllow`, l'utilisateur et `gh issue`

### Requirement: Skills à contexte isolé
Pour l'outil `Skill`, `profile-guard.mjs` SHALL refuser (code 2) un profil de la table dont le nom de skill, après retrait des blancs et d'un `/` initial, ne matche pas `^[\w-][\w.-]*(:[\w-][\w.-]*)?$`, ou dont le `SKILL.md` ou la commande déclare `context: fork` dans son en-tête, cherché dans le projet, la configuration de l'utilisateur et les plugins installés. Un skill introuvable est permis ; un fichier présent mais illisible ou une racine du projet inconnue est refusé.

#### Scenario: Skill de projet isolé
- **WHEN** `.claude/skills/forky/SKILL.md` déclare `context: fork` et que `project-lead` lance `forky` ou `/forky`
- **THEN** le hook se termine avec le code 2 et nomme le skill

#### Scenario: Skill ou commande de plugin isolé
- **WHEN** `installed_plugins.json` désigne un plugin `p` dont `skills/forky/SKILL.md` ou `commands/forky.md` déclare `context: fork` et que `project-lead` lance `p:forky`
- **THEN** le hook se termine avec le code 2

#### Scenario: Écritures de l'en-tête
- **WHEN** l'en-tête déclare `context: "fork"`, `context: fork   # isolé`, ou le fichier est en CRLF ou débute par un BOM
- **THEN** le hook se termine avec le code 2

#### Scenario: Profil à liste de skills
- **WHEN** `architect` lance `archgate:adr-author` et que ce skill déclare `context: fork`
- **THEN** le hook se termine avec le code 2

#### Scenario: Skill ordinaire, introuvable ou nom piégé
- **WHEN** `project-lead` lance un skill sans `context: fork` ou introuvable
- **THEN** le hook se termine avec le code 0 ; `../x`, `..` et un nom vide sont refusés avec le code 2

## MODIFIED Requirements

### Requirement: Déclaration du hook de bornage
Avec `agent-profiles`, `.claude/settings.json` SHALL déclarer un hook `PreToolUse` de type `command` appelant `profile-guard.mjs` pour les outils `Write`, `Edit`, `MultiEdit`, `NotebookEdit`, `Bash`, `PowerShell`, `Agent`, `Task` (ancien nom de `Agent`) et `Skill`, et une seconde entrée au matcher `mcp__.*` vers le même hook. Il MUST NOT déclarer de réglage `agent` sauf si la clé `mainAgent` est présente. La fusion avec des réglages existants MUST conserver les hooks du projet.

#### Scenario: Déclaration dans settings.json
- **WHEN** `settings.json` est généré avec `agent-profiles` sans `mainAgent`
- **THEN** il contient deux entrées `PreToolUse` vers `profile-guard.mjs`, l'une pour les neuf outils, l'autre au matcher `mcp__.*`, et pas de clé `agent`

#### Scenario: Réglages existants
- **WHEN** `settings.json` contient déjà un hook `PreToolUse` du projet
- **THEN** il subsiste à côté de celui de `profile-guard.mjs`

#### Scenario: Mise à jour d'un projet existant
- **WHEN** `--update` s'applique à un projet dont `settings.json` ne porte que la première entrée
- **THEN** la seconde entrée est ajoutée et la première reste identique

### Requirement: Refus par défaut en cas d'erreur
Pour un profil de la table, une entrée incomplète ou une erreur interne du hook (chemin d'écriture absent, racine du projet inconnue, fichier de skill illisible, exception) SHALL se terminer avec le code 2 et non avec un code qui laisse l'outil s'exécuter. Une entrée illisible, dont le profil est inconnu, SHALL se terminer avec le code 0.

#### Scenario: Chemin absent
- **WHEN** `agent_type` vaut `architect`, l'outil est `Write` et `file_path` est absent
- **THEN** le hook se termine avec le code 2

#### Scenario: Racine inconnue
- **WHEN** ni `CLAUDE_PROJECT_DIR` ni `cwd` ne sont fournis pour un profil de la table
- **THEN** le hook se termine avec le code 2

### Requirement: Bornage des skills
Pour l'outil `Skill`, `profile-guard.mjs` SHALL refuser (code 2) un profil de la table dont le skill n'est pas dans sa liste `skills` (comparaison du nom exact), ou dont la liste est vide ou absente, sauf pour un profil à l'option `skillsOpen`, qui n'a pas de liste. Les skills à contexte isolé sont refusés à tous (« Skills à contexte isolé »). `architect` peut lancer `archgate:adr-author`, `adr-options-comparison` et `arc42-update` ; `qa-engineer`, `spec-review` et `pr-readiness-review`.

#### Scenario: Skill permis
- **WHEN** `architect` lance `archgate:adr-author`, `adr-options-comparison` ou `arc42-update`, ou `qa-engineer` lance `spec-review` ou `pr-readiness-review`
- **THEN** le hook se termine avec le code 0

#### Scenario: Skill non permis
- **WHEN** `qa-engineer` lance `archgate:reviewer`, `arc42-update` ou `/spec-review`, ou `architect` lance `archgate:onboard` ou `spec-review`
- **THEN** le hook se termine avec le code 2

#### Scenario: Skill de project-lead
- **WHEN** `project-lead` lance `archgate:lessons-learned` ou `opsx:explore`
- **THEN** le hook se termine avec le code 0

### Requirement: Bornage de project-lead
La table `PROFILES` SHALL contenir `project-lead` : aucune écriture (`write` vide), shell limité à la lecture seule de `read-only-bash.mjs` et aux commandes de pilotage, agents limités aux profils de la table autres que lui-même, outils MCP classés, skills sans liste (`skillsOpen`). Un refus du shell SHALL inviter à déléguer à `developer` ou à demander à l'utilisateur.

#### Scenario: Entrée de table
- **WHEN** la table du hook est lue
- **THEN** elle contient `project-lead` avec `write` vide, `skillsOpen`, `namedAgents` sans `second-opinion` et une liste `agents` qui ne contient ni `project-lead` ni `general-purpose`

#### Scenario: Écriture refusée
- **WHEN** `agent_type` vaut `project-lead` et l'outil est `Write`, `Edit`, `MultiEdit` ou `NotebookEdit`, quel que soit le chemin
- **THEN** le hook se termine avec le code 2

#### Scenario: Écriture par le shell
- **WHEN** `project-lead` lance `rm x`, `Set-Content x y`, `git commit -m x` ou `git push`
- **THEN** le hook se termine avec le code 2 et le message invite à déléguer à `developer`

### Requirement: Garde-fous de project-lead
`project-lead.md` SHALL exiger l'accord de l'utilisateur pour toute écriture visible à l'extérieur (niveau 5 de l'échelle), porter l'échelle d'arbitrage et la répartition des rôles, et dire que le hook borne ses écritures, son shell, ses agents et ses outils MCP. Il MUST NOT lancer `/opsx:apply`, `/opsx:archive` ni `/opsx:sync` lui-même. Ses garde-fous restent doublés par `disallowedTools`.

#### Scenario: Pas de bornage de l'agent principal
- **WHEN** l'entrée du hook n'a pas d'`agent_type` (session sans réglage `agent`)
- **THEN** le hook se termine avec le code 0

#### Scenario: Consigne à jour
- **WHEN** `project-lead.md` est généré, en français ou en anglais
- **THEN** il ne contient ni « aucun hook ne te borne » ni « no hook bounds you », dit que le hook refuse l'écriture, limite le shell au pilotage, les outils MCP à la lecture et ne lance que les profils, et interdit à `project-lead` de lancer `/opsx:apply`, `/opsx:archive` et `/opsx:sync`

#### Scenario: Écritures visibles
- **WHEN** un projet est généré avec `github`
- **THEN** `project-lead.md` demande l'accord de l'utilisateur pour `gh issue create`, `gh pr create`, `gh pr merge` et les releases

#### Scenario: Limite consignée
- **WHEN** `docs/workflow.md` est généré avec `agent-profiles`
- **THEN** sa table des règles doublées cite `disallowedTools` et le hook de bornage pour « ne produit ni code ni spec », sans dire que l'effet n'est pas vérifié, et une ligne sur les outils MCP
