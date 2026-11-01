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
- le plugin Archgate impose `"agent": "archgate:developer"` par son propre `settings.json`, mais le réglage `agent` du `.claude/settings.json` du projet l'emporte ;
- l'entrée d'un hook ne porte pas d'`agent_type` pour l'agent principal, qui n'est donc pas borné par la table de ARCH-011.

## Decision

1. **`project-lead.md` est toujours généré** avec `agent-profiles`, en français et en anglais. Il n'est pas dans la table `PROFILES` : l'agent principal reste sous le contrôle de l'utilisateur, et ses garde-fous (délégation, arbitrage, accord pour les écritures visibles) sont dans son prompt, donc des consignes et non des mécanismes.
2. **Activation par `mainAgent`** : la clé facultative `mainAgent` de la configuration vaut `"project-lead"` (seule valeur). Présente, `settings.json` reçoit `"agent": "project-lead"` ; absente, aucune clé `agent` n'est écrite. `null` désactive explicitement la clé (ni héritée ni consignée), ce qui permet de retirer le module. La clé est consignée au manifeste seulement quand elle est présente, héritée par `--update`, et refusée sans le module `agent-profiles`. Un `agent` déjà déclaré par le projet est conservé (ARCH-006) et signalé par un avertissement du rapport et par l'audit.
3. **Pas de conflit avec `archgate-plugin`** : le réglage de projet l'emporte sur l'agent du plugin. Les deux modules se combinent sans champ `conflicts`.
4. **Délégation** : `project-lead` délègue à `architect` et à `qa-engineer` ; il écrit lui-même le code et les specs OpenSpec tant que les profils `developer` et `business-analyst` n'existent pas dans `.claude/agents/`, et leur délègue ensuite. « Qui écrit ne relit pas » : la relecture revient toujours à `qa-engineer`.
5. **Savoir-faire d'`archgate:developer` réparti** : décider et rédiger les ADR revient à `architect` ; `project-lead` lance `lessons-learned` (non permis à `architect`, ARCH-012) et lui en confie les ADR ; valider (`archgate check`, `review-context --run-checks`, skill reviewer) à `qa-engineer` ; lire les ADR avant d'écrire à celui qui écrit, dont le brief joint les briefings ; les ADR sont des bloquants (niveau 1 de l'échelle d'arbitrage).
6. **Règles critiques dans le prompt de l'agent** : l'échelle d'arbitrage, les règles de sécurité et la répartition des rôles figurent dans `project-lead.md`, qui survit à la compaction.

## Do's and Don'ts

### Do

- Écrire `agent` dans `settings.json` uniquement quand `mainAgent` est présent.
- Garder les règles critiques dans le prompt de `project-lead`.

### Don't

- Ne pas déclarer `conflicts` entre `agent-profiles` et `archgate-plugin`.
- Ne pas compter sur le hook de bornage pour `project-lead`.
- Ne pas recopier dans `project-lead` la validation ni la rédaction d'ADR d'Archgate : elles appartiennent aux profils.

## Consequences

### Positive

- Un projet peut adopter `agent-profiles` sans changer l'agent de ses sessions ; l'activation est un choix explicite et réversible.
- Aucun projet existant ne change : la clé est absente par défaut.

### Negative

- Quand `project-lead` écrit lui-même le code, rien ne l'empêche mécaniquement de relire son propre travail : seule la consigne et `qa-engineer` le garantissent.

### Risks

- Le réglage `agent` du projet s'applique à toutes les sessions du clone ; le retirer à la main (avec `mainAgent: null` pour ne pas le réécrire) redonne l'agent par défaut. `settings.local.json` l'emporte sur `settings.json` : un `agent` personnel y annule `mainAgent`.
- L'audit `agent-impose` signale `archgate:developer` et tout `agent` qui diffère de `mainAgent` du manifeste.

## Compliance and Enforcement

Tests de génération (`mainAgent` absent, présent, sans module, héritage par `--update`), contenu de `project-lead.md` vérifié par des assertions, instantanés de la matrice. Pas de règle Archgate.

## References

- Issue #35 ; changement OpenSpec `35-project-lead-main-agent`
- Issue #32 et `skills/project-bootstrap/references/agent-profiles-prototype.md`
- ARCH-011 (bornage par un hook unique), ARCH-012 (agents, skills et commandes lançables)
