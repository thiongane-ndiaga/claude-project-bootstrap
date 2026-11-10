---
id: ARCH-013
title: Chef de projet comme agent principal activé par mainAgent
domain: architecture
rules: false
files: ["skills/project-bootstrap/assets/modules/agent-profiles/**"]
---

# Chef de projet comme agent principal activé par mainAgent

## Statut

Accepté.

## Context

Le module `agent-profiles` (ARCH-011, ARCH-012) génère des profils bornés. Le chef de projet `project-lead` orchestre : dialogue avec l'utilisateur, brief, délégation, arbitrage. Pour agir, il doit être l'agent principal de la session (`"agent": "project-lead"` dans `.claude/settings.json`). Les essais de #32 et #35 (Claude Code 2.1.316) établissent :

- le prompt d'un agent principal personnalisé remplace le prompt système : sans consigne de délégation écrite, un profil qui a les outils d'écriture écrit lui-même ;
- le plugin Archgate pose `"agent": "archgate:developer"` comme réglage par défaut de plugin dans son `settings.json`, et le réglage `agent` du `.claude/settings.json` du projet l'emporte ;
- l'entrée d'un hook porte `agent_type: "project-lead"` pour l'agent principal défini par le réglage `agent` (essai de #114, Claude Code 2.1.322) : la table de ARCH-011 le borne (décision 1) ;
- `disallowedTools` retire `Write` et `Edit` de la liste d'outils de l'agent principal (essai de #114, Claude Code 2.1.318).

## Decision

1. **`project-lead.md` est toujours généré** avec `agent-profiles`, en français et en anglais. Il est dans la table `PROFILES` (ARCH-012) : écritures refusées, shell réduit au pilotage, agents réduits aux profils ; ses autres garde-fous (délégation, arbitrage, accord pour les écritures visibles) sont dans son prompt, donc des consignes et non des mécanismes.
2. **Activation par `mainAgent`** : la clé facultative vaut `"project-lead"` (seule valeur). Présente, `settings.json` reçoit `"agent": "project-lead"` ; absente, aucune clé `agent`. `null` la désactive (ni héritée ni consignée). Elle est consignée au manifeste quand elle est présente, héritée par `--update`, refusée sans `agent-profiles`. Un `agent` déjà déclaré par le projet est conservé (ARCH-006) et signalé par le rapport et l'audit.
3. **Pas de conflit avec `archgate-plugin`** : le réglage de projet l'emporte sur celui du plugin ; aucun champ `conflicts`.
4. **Orchestrateur** : `project-lead` ne produit ni code ni spec. Il délègue à `architect`, `qa-engineer` et `developer`, toujours générés, et à `business-analyst` pour les specs quand il existe (sinon `developer`). Il lance `openspec archive <id> --yes`, les specs vivantes étant interdites à `developer`. `disallowedTools` refuse `Write`, `Edit`, `MultiEdit` et `NotebookEdit` (une liste `tools` retirerait aussi les outils d'équipe), et son corps le dit. `qa-engineer` relit tout.
5. **Savoir-faire d'`archgate:developer` réparti** : `architect` décide et rédige les ADR ; `project-lead` lance `lessons-learned` (non permis à `architect`, ARCH-012) et lui en confie les ADR ; `qa-engineer` valide (`archgate check`, `review-context --run-checks`) ; le brief joint les briefings d'ADR, bloquants.
6. **Règles critiques doublées** : l'échelle d'arbitrage figure dans `project-lead.md` et dans le `CLAUDE.md` racine, relu depuis le disque après une compaction ; la documentation ne garantit pas la survie du corps d'un agent principal personnalisé.

## Do's and Don'ts

### Do

- Écrire `agent` dans `settings.json` uniquement quand `mainAgent` est présent.
- Garder les règles critiques dans le prompt de `project-lead` et l'échelle d'arbitrage dans le `CLAUDE.md` racine.

### Don't

- Ne pas déclarer `conflicts` entre `agent-profiles` et `archgate-plugin`.
- Ne pas compter sur le hook de bornage pour les outils MCP d'écriture ni pour les skills `context: fork` de `project-lead`.
- Ne pas recopier dans `project-lead` la validation ni la rédaction d'ADR d'Archgate : elles appartiennent aux profils.

## Consequences

### Positive

- Un projet peut adopter `agent-profiles` sans changer l'agent de ses sessions ; l'activation est un choix explicite et réversible.
- Aucun projet existant ne change : la clé est absente par défaut.

### Negative

- Le hook borne `project-lead` ; les outils MCP d'écriture et les skills `context: fork` y échappent, et la liste de commandes de pilotage peut refuser une commande utile, qu'il faut alors déléguer à `developer` ou demander à l'utilisateur.

### Risks

- Le réglage `agent` du projet s'applique à toutes les sessions du clone ; le retirer à la main (avec `mainAgent: null` pour ne pas le réécrire) redonne l'agent par défaut. `settings.local.json` l'emporte sur `settings.json` : un `agent` personnel y annule `mainAgent`.
- L'audit `agent-impose` signale `archgate:developer` et tout `agent` qui diffère de `mainAgent` du manifeste.

## Compliance and Enforcement

Tests de génération (`mainAgent` absent, présent, sans module, héritage par `--update`), contenu de `project-lead.md` vérifié par des assertions, instantanés de la matrice. Pas de règle Archgate.

## References

- Issue #35 ; changement OpenSpec `35-project-lead-main-agent`
- Issue #32 et `skills/project-bootstrap/references/agent-profiles-prototype.md`
- ARCH-011 (bornage par un hook unique), ARCH-012 (agents, skills et commandes lançables)
