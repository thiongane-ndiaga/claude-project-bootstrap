Issue: #141
ADR: ARCH-013 (amendé : `project-lead` borné par la table), ARCH-011 (amendé : options `namedAgents` et `shell` fonctionnelle), ARCH-012 (amendé : décisions 2 à 4, ligne `project-lead` du tableau), ARCH-016 (décision 7 précisée)

## Why

L'essai de #114 montre que le hook de bornage reçoit `agent_type: "project-lead"` pour l'agent principal. `project-lead` n'est pourtant pas dans la table `PROFILES` : seul `disallowedTools` le borne. Son shell reste libre (il peut écrire par `Bash`) et il lance sans refus `general-purpose` ou un agent de plugin, ce qui contredit son rôle d'orchestrateur.

## What Changes

- La table `PROFILES` reçoit une entrée `project-lead` : aucune écriture ; shell limité à la lecture seule et à des commandes de pilotage (archivage OpenSpec, contrôles, `gh issue|pr` d'écriture sous conditions) ; agents limités aux profils de la table ; skills non bornés.
- `namedAgents` : liste des agents que le profil peut nommer, à condition que le `name` égale le `subagent_type` (le teammate porte le nom de son profil) ; `second-opinion` en est exclu.
- Une entrée `shell` de la table peut être une fonction, pour les commandes `gh`.
- `archgate:reviewer` n'est plus lancé par `project-lead` : le skill lance des agents `general-purpose`, refusés. La vérification ADR passe par `qa-engineer` (`archgate review-context --run-checks`).
- `project-lead.md` ne dit plus « aucun hook ne te borne », ne lance ni `/opsx:apply`, ni `/opsx:archive`, ni `/opsx:sync` ; `docs/workflow.md` et le `CLAUDE.md` généré prescrivent `openspec archive <id> --yes` avec `agent-profiles`.
- Pas de migration : `scaffold.mjs --update` fusionne le hook.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `agent-profiles` : bornage de `project-lead`, commandes de pilotage, agents nommés, skills, garde-fous, lancements demandés par les profils, réutilisation d'Archgate.

## Impact

- Module `agent-profiles` (`profile-guard.mjs` français et anglais, son test, `project-lead.md`, `qa-engineer.md`), modèles `workflow.md` et `CLAUDE.md` du module `core`, `SKILL.md`, `pitfalls.md`, tests et instantanés, ARCH-011, ARCH-012, ARCH-013, ARCH-016, arc42 (sections 8 et 11).
- Hors périmètre : borner les outils MCP d'écriture ; borner `Explore` ou un teammate nommé autrement ; `git add|commit|push|pull|fetch` pour `project-lead` (ils restent à `developer`, la décision de l'issue réduit « git de pilotage » à la lecture seule) ; les skills `context: fork`, qui lancent un agent sans passer par l'outil `Agent` ; un `agent` personnel dans `settings.local.json`.
