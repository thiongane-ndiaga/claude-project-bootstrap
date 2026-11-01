---
id: ARCH-012
title: Agents, skills et commandes lançables par un profil
domain: architecture
rules: false
files: ["skills/project-bootstrap/assets/modules/agent-profiles/**"]
---

# Agents, skills et commandes lançables par un profil

## Statut

Accepté. Complète ARCH-011 pour les outils `Agent`, `Skill` et pour les commandes de shell.

## Context

Les profils de `agent-profiles` (ARCH-011) sont bornés par un hook unique qui lit `agent_type`. Un agent lancé par un profil porte son propre `agent_type` et sort donc de la table du profil. Les essais de l'issue #113 (Claude Code 2.1.316) établissent :

- `tools: Agent(<types>)` restreint les agents lançables d'un agent principal, pas ceux d'un sous-agent ;
- un hook `PreToolUse` de `settings.json` reçoit les appels aux outils `Agent` et `Skill`, avec l'appelant (`agent_type`) et `subagent_type`, `name`, `team_name` ou `skill` ;
- un agent lancé par un sous-agent garde son hook de frontmatter, qui ne s'applique pas à un teammate ;
- `archgate:reviewer` lance des agents `general-purpose` ; `archgate:adr-author` n'en lance pas.

## Decision

1. **La liste des agents et des skills lançables vit dans la table `PROFILES` du hook** (champs `agents` et `skills`), pas dans `Agent(<types>)`. Liste vide ou absente : tout est refusé. Le hook couvre les outils `Agent`, `Task` (ancien nom) et `Skill`.
2. **Un profil ne lance que des sous-agents sans nom** : un appel avec `name` ou `team_name` est refusé, car un agent nommé est un teammate. Un `subagent_type` absent ou vide vaut `general-purpose` et est refusé.
3. **Les agents lançables sont dans la table avec leurs propres bornes**, sans dépendre de leur hook de frontmatter (inactif pour un teammate), et sans `agents` ni `skills` : ils ne lancent rien.
4. **`archgate:reviewer` reste lancé par l'agent principal** ; `archgate:adr-author` est permis à `architect`, qui s'en sert pour cadrer l'ADR et le crée avec `archgate adr create`.
5. **Tableau des droits** (source : la table du hook) :

| Profil ou agent | Écriture | Shell en plus de la lecture seule | Agents lançables | Skills |
|---|---|---|---|---|
| `architect` | `docs/architecture/` | `archgate adr create --title "…" --domain …`, `archgate adr domain list` | `architecture-explorer`, `arc42-keeper` | `archgate:adr-author` |
| `qa-engineer` | `tests/`, `test/` | `node .claude/hooks/quality-gate.mjs`, `node .bootstrap/run-checks.mjs`, `archgate review-context` (options `--staged`, `--run-checks`, `--verbose`, `--strict`, `--base [réf]`, `--domain <d>`) | `spec-reviewer` | aucun |
| `arc42-keeper` | `docs/architecture/arc42/` | aucun | aucun | aucun |
| `spec-reviewer` | aucune | lecture seule | aucun | aucun |
| `architecture-explorer` | aucune | aucun | aucun | aucun |

## Do's and Don'ts

### Do

- Ajouter un agent lançable à la table avec ses bornes avant de le lister dans `agents`.
- Revoir un skill de la table à chaque mise à jour de son plugin : un skill qui lance un agent ou fait un `context: fork` sort de la table.

### Don't

- Ne pas lister dans `agents` un agent qui dispose de l'outil `Agent` ou qui n'a pas d'entrée dans la table.
- Ne pas compter sur `Agent(<types>)` du frontmatter pour borner un profil.

## Consequences

### Positive

- `architect` et `qa-engineer` lancent seuls leurs agents d'appui sans élargir leurs droits, en sous-agent et en équipe.
- Les droits de chaque profil tiennent dans un tableau que `project-lead` peut citer.

### Negative

- Une entrée de table par agent lançable, à tenir à jour avec les modèles d'agents.
- Les droits d'écriture de `arc42-keeper` et la lecture seule de `spec-reviewer` existent à deux endroits (frontmatter et table).

### Risks

- Un agent utilisateur ou de plugin de même nom que `spec-reviewer` est borné par la table, quel que soit son fichier.
- Que le hook se déclenche sur l'outil `Agent` d'un teammate n'a pas été constaté en session d'équipe (il l'est pour les autres outils, #32) ; un essai d'équipe reste à faire.
- Les droits d'`openspec` et d'`archgate` au-delà du tableau (par exemple `archgate adr domain add`, demandé par `archgate:adr-author`) restent à l'agent principal.

## Compliance and Enforcement

Tests du module `agent-profiles` (`tests/profile-guard.test.mjs`) pour la table, les agents, les skills, `Task` et le défaut fermé ; tests de génération pour les outils des profils et le matcher ; essai réel consigné dans `references/agent-profiles-prototype.md`. Pas de règle Archgate.

## References

- Issue #113 ; changement OpenSpec `113-profile-launchable-agents`
- ARCH-011 (profils d'agents bornés par un hook unique)
