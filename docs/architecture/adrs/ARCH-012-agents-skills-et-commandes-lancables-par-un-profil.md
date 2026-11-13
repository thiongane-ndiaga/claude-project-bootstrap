---
id: ARCH-012
title: Agents, skills et commandes lançables par un profil
domain: architecture
rules: false
files: ["skills/project-bootstrap/assets/modules/agent-profiles/**"]
---

# Agents, skills et commandes lançables par un profil

## Statut

Accepté. Complète ARCH-011 pour les outils `Agent`, `Skill` et pour les commandes de shell. ARCH-014 ajoute à la table les profils optionnels.

## Context

Les profils de `agent-profiles` (ARCH-011) sont bornés par un hook unique qui lit `agent_type`. Un agent lancé par un profil porte son propre `agent_type` et sort donc de la table du profil. Les essais de l'issue #113 (Claude Code 2.1.316) établissent :

- `tools: Agent(<types>)` restreint les agents lançables d'un agent principal, pas ceux d'un sous-agent ;
- un hook `PreToolUse` de `settings.json` reçoit les appels aux outils `Agent` et `Skill`, avec l'appelant (`agent_type`) et `subagent_type`, `name`, `team_name` ou `skill` ;
- un agent lancé par un sous-agent garde son hook de frontmatter, qui ne s'applique pas à un teammate ;
- `archgate:reviewer` lance des agents `general-purpose` ; `archgate:adr-author` n'en lance pas.

## Decision

1. **La liste des agents et des skills lançables vit dans la table `PROFILES` du hook** (champs `agents` et `skills`), pas dans `Agent(<types>)`. Liste vide ou absente : tout est refusé. Le hook couvre `Agent`, `Task` (ancien nom) et `Skill`, et refuse à tout profil de la table un skill invalide ou à `context: fork` (introuvable : permis ; illisible : refusé).
2. **Un profil ne lance que des sous-agents sans nom**, sauf les types de sa liste `namedAgents`, avec un `name` égal au `subagent_type` (ARCH-011) : tout autre nom est refusé. Un `subagent_type` absent ou vide vaut `general-purpose` et est refusé.
3. **Seul `project-lead` lance des agents** (ARCH-013) : les listes `agents` des autres profils sont vides. Le mécanisme reste pour un agent qu'un projet ajoute à la table avec ses propres bornes. Les profils lancent les skills de leur ligne du tableau.
4. **`archgate:reviewer` et l'agent `archgate:planner` ne sont lancés par personne** : le premier lance des agents `general-purpose` que le hook refuse, le second n'a pas de `tools:` et porte donc tous les outils (`Agent` et `Write` compris), sa lecture seule ne tenant qu'à son texte. La vérification ADR passe par `qa-engineer` (`archgate review-context`), la planification par `architect`. `archgate:adr-author` et `archgate:cli-reference` sont permis à `architect` : le premier cadre l'ADR, qu'il crée avec `archgate adr create`, le second donne les commandes d'`archgate` et l'API des règles `.rules.ts`.
5. **`developer` lance le skill d'apply d'OpenSpec**, `openspec-apply-change` ou `opsx:apply`, et aucun autre : il ne lance pas d'agent et son shell est déjà non borné, de sorte que le skill, qui n'a pas `context: fork` et n'en lance aucun, n'élargit pas ses droits réels. `opsx:sync` et `opsx:archive` restent à `project-lead` (`openspec archive <id> --yes`), car ils déplacent des fichiers interdits à `developer`.
6. **Tableau des droits** (source : la table du hook) :

| Profil ou agent | Écriture | Shell en plus de la lecture seule | Agents lançables | Skills |
|---|---|---|---|---|
| `architect` | `docs/architecture/` | `archgate adr create --title "…" --domain …`, `archgate adr domain list` | aucun | `archgate:adr-author`, `archgate:cli-reference`, `adr-options-comparison`, `arc42-update` |
| `developer` | tout sauf les dossiers de gouvernance | non borné | aucun | `openspec-apply-change`, `opsx:apply` |
| `qa-engineer` | `tests/`, `test/` | `node .claude/hooks/quality-gate.mjs`, `node .bootstrap/run-checks.mjs`, `archgate review-context` (options `--staged`, `--run-checks`, `--verbose`, `--strict`, `--base [réf]`, `--domain <d>`) | aucun | `spec-review`, `pr-readiness-review` |
| `project-lead` | aucune | `openspec archive <id> --yes`, contrôles de `qa-engineer`, `gh issue` ou `gh pr` d'écriture bornés (spec `agent-profiles`) | profils nommés comme leur type (hors `second-opinion`) | tous |

## Do's and Don'ts

### Do

- Ajouter un agent lançable à la table avec ses bornes avant de le lister dans `agents`.
- Revoir un skill de la table à chaque mise à jour de son plugin ou d'OpenSpec : un skill qui lance un agent ou passe à `context: fork` sort de la table.

### Don't

- Ne pas lister dans `agents` un agent qui dispose de l'outil `Agent` ou qui n'a pas d'entrée dans la table.
- Ne pas compter sur `Agent(<types>)` du frontmatter pour borner un profil.

## Consequences

### Positive

- Les droits de `architect` et de `qa-engineer` ne dépendent d'aucun agent d'appui.
- Les droits de chaque profil tiennent dans un tableau que `project-lead` peut citer.

### Negative

- Une entrée de table par agent lançable qu'un projet ajoute, à tenir à jour avec son modèle d'agent.

### Risks

- Un ancien agent resté dans un projet (fichier modifié, migration `0003`) n'est plus dans la table et n'est pas borné par le hook.
- Un skill `context: fork` introuvable (chemins de `plugin.json`, `--plugin-dir`, `--add-dir`) n'est pas refusé : ses outils portent `agent_type: "general-purpose"`, hors table (essai de #143).
- Que le hook se déclenche sur l'outil `Agent` d'un teammate n'a pas été constaté en session d'équipe (il l'est pour les autres outils, #32) ; un essai d'équipe reste à faire.
- Les droits d'`openspec` et d'`archgate` au-delà du tableau (par exemple `archgate adr domain add`, demandé par `archgate:adr-author`) restent à l'agent principal.

## Compliance and Enforcement

Tests du module `agent-profiles` (`tests/profile-guard.test.mjs`) pour la table, les agents, les skills, `Task` et le défaut fermé ; tests de génération pour les outils des profils et le matcher ; essai réel consigné dans `references/agent-profiles-prototype.md`. Pas de règle Archgate.

## References

- Issue #113 ; changement OpenSpec `113-profile-launchable-agents`
- ARCH-011 (profils d'agents bornés par un hook unique)
