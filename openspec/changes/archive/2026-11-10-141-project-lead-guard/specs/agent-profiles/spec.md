## ADDED Requirements

### Requirement: Bornage de project-lead
La table `PROFILES` SHALL contenir `project-lead` : aucune écriture (`write` vide), shell limité à la lecture seule de `read-only-bash.mjs` et aux commandes de pilotage, agents limités aux profils de la table autres que lui-même, skills non bornés (`skillsOpen`). Un refus du shell SHALL inviter à déléguer à `developer` ou à demander à l'utilisateur.

#### Scenario: Entrée de table
- **WHEN** la table du hook est lue
- **THEN** elle contient `project-lead` avec `write` vide, `skillsOpen`, `namedAgents` sans `second-opinion` et une liste `agents` qui ne contient ni `project-lead` ni `general-purpose`

#### Scenario: Écriture refusée
- **WHEN** `agent_type` vaut `project-lead` et l'outil est `Write`, `Edit`, `MultiEdit` ou `NotebookEdit`, quel que soit le chemin
- **THEN** le hook se termine avec le code 2

#### Scenario: Écriture par le shell
- **WHEN** `project-lead` lance `rm x`, `Set-Content x y`, `git commit -m x` ou `git push`
- **THEN** le hook se termine avec le code 2 et le message invite à déléguer à `developer`

### Requirement: Commandes de pilotage de project-lead
`project-lead` SHALL pouvoir lancer, en plus de la lecture seule : `openspec archive <id> --yes`, `node .claude/hooks/quality-gate.mjs`, `node .bootstrap/run-checks.mjs`, `archgate review-context` avec les options de `qa-engineer`, `archgate session-context` avec `--max-entries <n>`, et `gh issue` ou `gh pr` avec `create`, `comment`, `edit`, `close`, `reopen`, `merge` ou `ready`.

#### Scenario: Pilotage permis
- **WHEN** `project-lead` lance `openspec archive 141-x --yes`, `gh pr merge 5 --squash`, `gh issue create --title "Titre simple" --body-file corps.md` ou `archgate session-context --max-entries 5`
- **THEN** le hook se termine avec le code 0

#### Scenario: Autre commande
- **WHEN** `project-lead` lance `gh api repos/x`, `gh release create v1` ou `openspec archive x`
- **THEN** le hook se termine avec le code 2

### Requirement: Refus dans les commandes gh de project-lead
Dans `gh issue` et `gh pr`, `project-lead` MUST NOT utiliser `--admin`, `--web`, `--repo`, `--delete-last`, `--body`, `--editor`, ni les options courtes `-w`, `-R`, `-b`, `-e` seules ou groupées. Une chaîne entre guillemets droits (lettres, chiffres, espaces, `,.:'’()_/#-`) n'est admise que comme valeur de `--title`, `-t` ou `--subject`. `--body-file` et `-F` n'admettent qu'un chemin relatif sans `..`. Chaînage, redirection et substitution sont refusés.

#### Scenario: Options refusées
- **WHEN** `project-lead` lance `gh pr merge 5 --admin`, `gh pr merge 5 --admin=true`, `gh pr create -dw`, `gh issue create --body "x"` ou `gh issue comment 5 --repo a/b`
- **THEN** le hook se termine avec le code 2

#### Scenario: Injection par une chaîne ou un chemin
- **WHEN** `project-lead` lance `gh issue create --title "a $(rm x)"`, un titre avec accent grave ou saut de ligne, `gh pr merge 5 --squash; Remove-Item x`, `gh issue create --body-file ../x` ou `gh issue create --body-file ~/.env`
- **THEN** le hook se termine avec le code 2

## MODIFIED Requirements

### Requirement: Bornage des agents lançables
Pour les outils `Agent` et `Task`, `profile-guard.mjs` SHALL refuser (code 2) un profil de la table dont le `subagent_type` n'est pas dans sa liste `agents` (vide ou absente : aucun agent), ou dont l'appel porte un `name` ou un `team_name`, sauf pour un type de la liste `namedAgents` du profil, dont le `name` doit égaler le `subagent_type`. Un `subagent_type` absent, vide ou nul vaut `general-purpose` et MUST être refusé. Seul `project-lead` lance des agents.

#### Scenario: Agent permis
- **WHEN** un agent de la table dont la liste `agents` contient `x` lance `x`, y compris par l'outil `Task`
- **THEN** le hook se termine avec le code 0

#### Scenario: Agent non permis
- **WHEN** un profil lance un agent absent de sa liste `agents`, `general-purpose`, un agent d'un plugin, lui-même ou un appel sans `subagent_type`
- **THEN** le hook se termine avec le code 2 et nomme l'agent refusé

#### Scenario: Agents refusés à project-lead
- **WHEN** `project-lead` lance `general-purpose`, `Explore`, `archgate:planner` ou `project-lead`
- **THEN** le hook se termine avec le code 2

#### Scenario: Agent nommé ou d'équipe
- **WHEN** un profil sans liste `namedAgents` lance un agent avec un `name` ou un `team_name`
- **THEN** le hook se termine avec le code 2

#### Scenario: Teammate de project-lead
- **WHEN** `project-lead` lance `architect` avec `name: "architect"`, avec ou sans `team_name`
- **THEN** le hook se termine avec le code 0

#### Scenario: Nom absent ou différent du type
- **WHEN** `project-lead` lance `architect` avec `name: "x"`, avec `team_name` seul, ou `second-opinion` avec `name: "second-opinion"`
- **THEN** le hook se termine avec le code 2

#### Scenario: Architect et qa-engineer
- **WHEN** `architect` ou `qa-engineer` lance un agent, y compris par l'outil `Task`
- **THEN** le hook se termine avec le code 2

#### Scenario: Liste absente
- **WHEN** un agent de la table sans liste `agents` lance n'importe quel agent
- **THEN** le hook se termine avec le code 2

### Requirement: Bornage des skills
Pour l'outil `Skill`, `profile-guard.mjs` SHALL refuser (code 2) un profil de la table dont le skill n'est pas dans sa liste `skills` (comparaison du nom exact), ou dont la liste est vide ou absente, sauf pour un profil à l'option `skillsOpen`, dont les skills ne sont pas bornés. `architect` peut lancer `archgate:adr-author`, `adr-options-comparison` et `arc42-update` ; `qa-engineer` peut lancer `spec-review` et `pr-readiness-review`, pas `archgate:reviewer` (agents `general-purpose`).

#### Scenario: Skill permis
- **WHEN** `architect` lance `archgate:adr-author`, `adr-options-comparison` ou `arc42-update`, ou `qa-engineer` lance `spec-review` ou `pr-readiness-review`
- **THEN** le hook se termine avec le code 0

#### Scenario: Skill non permis
- **WHEN** `qa-engineer` lance `archgate:reviewer`, `arc42-update` ou `/spec-review`, ou `architect` lance `archgate:onboard` ou `spec-review`
- **THEN** le hook se termine avec le code 2

#### Scenario: Skill de project-lead
- **WHEN** `project-lead` lance `archgate:lessons-learned` ou `opsx:explore`
- **THEN** le hook se termine avec le code 0

### Requirement: Garde-fous de project-lead
`project-lead.md` SHALL exiger l'accord de l'utilisateur pour toute écriture visible à l'extérieur (niveau 5 de l'échelle), porter l'échelle d'arbitrage et la répartition des rôles, et dire que le hook borne ses écritures, son shell et ses agents. Il MUST NOT lancer `/opsx:apply`, `/opsx:archive` ni `/opsx:sync` lui-même. Ses garde-fous restent doublés par `disallowedTools`.

#### Scenario: Pas de bornage de l'agent principal
- **WHEN** l'entrée du hook n'a pas d'`agent_type` (session sans réglage `agent`)
- **THEN** le hook se termine avec le code 0

#### Scenario: Consigne à jour
- **WHEN** `project-lead.md` est généré, en français ou en anglais
- **THEN** il ne contient ni « aucun hook ne te borne » ni « no hook bounds you », dit que le hook refuse l'écriture, limite le shell au pilotage et ne lance que les profils, et interdit à `project-lead` de lancer `/opsx:apply`, `/opsx:archive` et `/opsx:sync`

#### Scenario: Écritures visibles
- **WHEN** un projet est généré avec `github`
- **THEN** `project-lead.md` demande l'accord de l'utilisateur pour `gh issue create`, `gh pr create`, `gh pr merge` et les releases

#### Scenario: Limite consignée
- **WHEN** `docs/workflow.md` est généré avec `agent-profiles`
- **THEN** sa table des règles doublées cite `disallowedTools` et le hook de bornage pour « ne produit ni code ni spec », sans dire que l'effet n'est pas vérifié

### Requirement: Lancements demandés par les profils
Avec `archgate-plugin`, `project-lead` SHALL lancer `archgate:lessons-learned` en fin de tâche et confier à `architect` les ADR qui en ressortent. Il MUST NOT lancer `archgate:reviewer`, dont les agents `general-purpose` sont refusés ; la vérification ADR passe par `qa-engineer`. Il SHALL traiter les demandes de lancement (agent, skill) que les profils lui adressent, en les lançant ou en refusant explicitement.

#### Scenario: Skills d'Archgate
- **WHEN** un projet est généré avec `archgate-plugin`
- **THEN** `project-lead.md` demande de lancer `archgate:lessons-learned`, ne cite pas `archgate:reviewer`, et `qa-engineer.md` ne demande pas à l'agent principal de le lancer

#### Scenario: Demandes des profils
- **WHEN** `project-lead.md` est généré
- **THEN** il demande de traiter ce que le hook refuse aux profils

### Requirement: Réutilisation d'Archgate et d'OpenSpec
Les profils SHALL citer, selon les modules actifs, ce qu'ils réutilisent : le skill `archgate:adr-author` pour `architect`, `archgate review-context --base --run-checks` pour `qa-engineer`. Ils lancent les skills de leur table et demandent le reste à l'agent principal. Ils MUST NOT citer le skill `onboard` ni les agents `architecture-explorer`, `arc42-keeper`, `spec-reviewer` et `traceability-checker`. Une référence à un module absent MUST NOT apparaître.

#### Scenario: Module Archgate absent
- **WHEN** un projet est généré avec `agent-profiles` mais sans `archgate`, `openspec`, `github` ni `arc42`
- **THEN** les profils ne mentionnent aucun de ces modules ni leurs skills
