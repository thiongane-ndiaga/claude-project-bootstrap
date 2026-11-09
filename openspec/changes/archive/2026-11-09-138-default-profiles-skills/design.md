## Context

ARCH-016 (#110) a déplacé les méthodes des quatre anciens agents dans `architect` et `qa-engineer`. L'issue #138 les sort des prompts : une skill de projet par méthode, conditionnée par le module dont elle dépend. Les décisions sont dans ARCH-016, ARCH-013, ARCH-014 et ARCH-012 ; ce document ne porte que les points d'implémentation.

## Decisions

- **Génération** : les skills sont des fichiers du module `agent-profiles` (`templates{,.en}/.claude/skills/<nom>/SKILL.md`), chacun avec `when: ["<module>"]`. Le chemin n'entre en collision avec aucun skill d'OpenSpec (`openspec-*`) ni d'Archgate.
- **`developer`** : le fichier perd son `when: ["profile-developer"]`. `developer` sort de `OPTIONAL_PROFILES` (donc de `PSEUDO_MODULES`) ; les textes qui testaient `profile-developer` testent `agent-profiles`. Dans `scaffold.mjs`, un `developer` présent dans `profiles` est retiré de la configuration avec un avertissement avant la validation, pour que le manifeste ne le consigne pas.
- **Avertissement de l'advisor** : `advisor: true` sans profil optionnel sonnet ou haiku n'avertit plus quand `agent-profiles` est sélectionné, `developer` (sonnet) étant toujours généré.
- **`project-lead`** : `disallowedTools` est une liste de refus, car une liste `tools` retirerait aussi les outils d'équipe (`SendMessage`, tâches). Le corps répète la règle : l'effet sur l'agent principal n'est pas documenté et le hook ne le voit pas (ARCH-013).
- **Table du hook** : `architect.skills` ajoute `adr-options-comparison` et `arc42-update`, `qa-engineer.skills` reçoit `spec-review` et `pr-readiness-review`. Une skill permise mais non générée (module absent) est sans effet.
- **Lancement** : le corps du profil dit quand lancer la skill ; le champ `skills` du frontmatter n'est pas utilisé (non appliqué aux teammates).
- **Mise à jour** : aucun fichier n'est retiré, `--update` suffit. Les fichiers modifiés par le projet suivent la fusion à trois voies existante.

## Risks / Trade-offs

- Une skill est une consigne : le profil peut ne pas la lancer. Les tests vérifient que le corps du profil la cite.
- `project-lead` peut écrire si `disallowedTools` n'est pas appliqué à l'agent principal : limite consignée dans `pitfalls.md`, essai réel dans #114.
- Le contexte de la revue de spec reste celui de `qa-engineer` (perte déjà assumée par ARCH-016).
