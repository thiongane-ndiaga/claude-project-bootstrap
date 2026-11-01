## Contexte

`model` est posé sur huit agents sur neuf (seul `project-lead` n'en a pas), jamais `effort` ni `maxTurns`. La documentation des sous-agents (consultée le 2026-11-01) liste les champs camelCase reconnus ; un champ inconnu est ignoré en silence. ARCH-015 (point 5) laisse ces champs au projet, avec une valeur par défaut documentée et son coût.

## Décisions

- **D1. Valeurs fixes, pas de clé de configuration.** Éditer le frontmatter ou surcharger par l'environnement suffit (décision du propriétaire) : aucune surface de configuration, aucun état à hériter.
- **D2. Table de départ** (inspirée de #31, ajustée aux rôles réels) :

| Agent | model | effort | maxTurns |
|---|---|---|---|
| `architect` | opus | high | 40 |
| `qa-engineer` | opus | high | 40 |
| `spec-reviewer` | opus | high | 30 |
| `architecture-explorer` | opus | high | 40 |
| `developer` | sonnet | high | 60 |
| `business-analyst` | sonnet | high | 40 |
| `product-owner` | sonnet | medium | 20 |
| `arc42-keeper` | sonnet | medium | 30 |
| `traceability-checker` | sonnet | medium | 25 |

  `project-lead` n'en a pas : agent principal, il suit la session. Les `maxTurns` sont des bornes de coût prudentes ; selon la documentation, un sous-agent arrêté par la limite rend une sortie marquée partielle, qu'on peut reprendre. Aucun corps d'agent ne le prévoit : ce comportement est celui de Claude Code, non vérifié ici.
- **D3. Validation sur la génération complète.** Le test génère tous les modules avec tous les profils optionnels, lit chaque `.claude/agents/*.md` et applique la liste blanche : `name`, `description`, `tools`, `disallowedTools`, `model`, `permissionMode`, `maxTurns`, `autoCompactWindow`, `skills`, `mcpServers`, `hooks`, `memory`, `background`, `omitClaudeMd`, `effort`, `isolation`, `color`, `initialPrompt`, `experimental`. `effort` ∈ {low, medium, high, xhigh, max}. `maxTurns` entier ≥ 1. Fichier : `^[a-z0-9]+(-[a-z0-9]+)*\.md$`, `name` égal au nom sans extension. Seules les clés de premier niveau (colonne 0) sont examinées : `hooks` porte des clés imbriquées. Les cas négatifs passent par une fonction appelée sur un texte et un nom fournis, car sous Windows `Developer.md` et `developer.md` désignent le même fichier. La liste est celle d'un agent de projet ; elle serait trop large pour un agent de plugin (`hooks`, `mcpServers`, `permissionMode` y sont ignorés).
- **D4. Effort selon le modèle.** Les niveaux disponibles dépendent du modèle ; les valeurs choisies (`medium`, `high`) existent sur Sonnet et Opus.
- **D6. Surcharge de modèle.** `CLAUDE_CODE_SUBAGENT_MODEL` peut remplacer le modèle d'un profil : un profil sonnet passé en opus porte encore la consigne de l'advisor, et un niveau `effort` peut ne pas exister sur le modèle de remplacement (non vérifié).
- **D5. Règle de l'advisor inchangée** : `model:` reste le critère, la table ne change aucun modèle.

## Risques

- Un compte sans accès à `opus` : le sous-agent retombe sur l'ordre de modèles de Claude Code ; l'utilisateur édite le frontmatter. Documenté dans `pitfalls.md`.
- `effort: high` sur Opus coûte plus ; la valeur est documentée dans ARCH-015 et surchargeable par `CLAUDE_CODE_EFFORT_LEVEL`.
- `maxTurns` trop bas tronque un travail long (voir D2).
- Teammates : `pitfalls.md` ne cite que `tools`, `disallowedTools`, `model` et le corps comme repris, et `effort` en in-process seulement. Pour `maxTurns`, la reprise par un teammate n'est pas constatée : la borne ne vaut sûrement qu'en sous-agent.
- Les copies propres au dépôt (`.claude/agents/`) sont hors périmètre et se resynchronisent par `--update`.
