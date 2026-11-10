## Context

L'essai de #114 (Claude Code 2.1.322) établit que l'entrée du hook porte `agent_type: "project-lead"` pour l'agent principal défini par le réglage `agent`. Les décisions (shell, agents, skills) sont dans le commentaire de #141 ; ARCH-011, ARCH-012 et ARCH-013 les portent. Ce document ne traite que l'implémentation.

## Decisions

- **Entrée de table** : `project-lead: { write: [], shell: [...], agents: [<profils>], namedAgents: [<profils sans second-opinion>], skills: [], skillsOpen: true }`. `write: []` refuse toute écriture, en doublon de `disallowedTools`. Le message de refus du shell ajoute un `shellHint` : déléguer à `developer` ou demander à l'utilisateur.
- **Shell** : une entrée de `shell` est un motif ancré sur la commande entière ou une fonction `(commande) => booléen`. Les commandes fixes sont des motifs : `openspec archive <id> --yes`, `node .claude/hooks/quality-gate.mjs`, `node .bootstrap/run-checks.mjs`, `archgate review-context` (options de `qa-engineer`), `archgate session-context` avec `--max-entries <n>`.
- **`gh issue|pr`** : une fonction `ghPilot` découpe la commande en jetons (mots du jeu fermé de `read-only-bash.mjs`, ou chaîne entre guillemets droits) et applique : verbe dans `create|comment|edit|close|reopen|merge|ready` ; chaîne entre guillemets seulement comme valeur de `--title`, `-t` ou `--subject` ; `--body-file` et `-F` avec un chemin relatif sans `..`, sans `:` ni `~` ; refus de tout jeton dont le nom (avant `=`) est `--admin`, `--web`, `--repo`, `--delete-last`, `--body`, `--editor`, et de toute option courte `-w`, `-R`, `-b`, `-e` ou groupée. Les chaînes se limitent aux lettres, chiffres, espaces et `,.:'’()_/#-` : ni `$`, ni accent grave, ni guillemet, ni saut de ligne, donc aucune substitution en Bash comme en PowerShell.
- **Agents** : la liste reprend les dix profils de la table autres que `project-lead` ; un profil absent du projet est sans effet. `general-purpose`, `Explore` et les agents de plugins sont refusés.
- **`namedAgents`** : liste des types qu'un `name` égal au type permet de lancer, avec ou sans `team_name`. Un `team_name` sans `name`, un `name` différent du type ou un type hors liste (`second-opinion`) est refusé. Sans l'option, le comportement est inchangé.
- **`skillsOpen`** : la liste `skills` n'est pas consultée. Un skill reste borné par les outils de la table, sauf s'il porte `context: fork` : il lance alors un agent sans passer par l'outil `Agent`.
- **`archgate:reviewer`** : retiré des tâches de `project-lead` et de la demande de `qa-engineer` ; la spec « Lancements demandés par les profils » et « Réutilisation d'Archgate et d'OpenSpec » suivent.
- **Archivage** : `/opsx:archive` et `/opsx:sync` éditent et déplacent des fichiers, donc échouent sous `project-lead`. Avec `agent-profiles`, `workflow.md` et le `CLAUDE.md` généré prescrivent `openspec archive <id> --yes`.
- **Mise à jour** : le hook est un fichier géré ; la fusion à trois voies s'applique, sans migration.

## Risks / Trade-offs

- La liste fermée de commandes peut refuser une commande de pilotage utile : le message dit de la déléguer à `developer` ou de la demander à l'utilisateur.
- Les outils MCP d'écriture (GitHub) et les skills `context: fork` échappent au hook : limites consignées.
- Un `name` égal au `subagent_type` ne prouve pas que le teammate soit borné par sa propre entrée si le profil n'existe pas dans la table : limite déjà documentée (ARCH-011).
- `read-only-bash.mjs` teste `-w` sur le jeton exact : une option groupée y échappe, sans autre effet que l'ouverture d'un navigateur.
