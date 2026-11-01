Issue: #113
ADR: ARCH-012

## Why

Les profils de `agent-profiles` (#33) n'ont ni `Agent` ni `Skill` : ils demandent à l'agent principal de lancer `arc42-keeper`, `architecture-explorer`, `spec-reviewer` ou un skill. Pour un rôle censé travailler seul, c'est lourd. Les essais de #113 (Claude Code 2.1.316) montrent que `tools: Agent(<types>)` ne restreint pas un sous-agent, mais que le hook de `settings.json` voit les appels aux outils `Agent` et `Skill` avec le profil appelant et le `subagent_type` demandé.

## What Changes

- Le hook `profile-guard.mjs` borne aussi les outils `Agent`, `Task` et `Skill` : chaque profil a une liste d'agents lançables et de skills permis, tout le reste est refusé (code 2).
- `architect` peut lancer `architecture-explorer` et `arc42-keeper` et le skill `archgate:adr-author` ; `qa-engineer` peut lancer `spec-reviewer`. Les profils reçoivent les outils `Agent` (et `Skill` pour `architect`).
- Les agents lançables entrent dans la table avec leurs propres bornes, pour ne plus dépendre de leur hook de frontmatter (inactif pour un teammate).
- Un profil ne lance jamais un agent nommé (équivalent teammate).
- `archgate:reviewer` reste lancé par l'agent principal : il lance des agents `general-purpose` que la table interdit.
- Nouvel ADR ARCH-012 avec le tableau des droits par profil ; ARCH-011 en renvoie les décisions sur `Agent` et `Skill`.

## Capabilities

### New Capabilities

(aucune)

### Modified Capabilities

- `agent-profiles` : outils `Agent` et `Skill` bornés par la table, déclaration du hook étendue, agents lançables bornés par la table, profils qui lancent eux-mêmes leurs agents.

## Impact

- Modèles `profile-guard.mjs`, `architect.md`, `qa-engineer.md` (français et anglais) ; `buildSettings` dans `scaffold.mjs` ; ARCH-011, ARCH-012, arc42 (8, 11), `pitfalls.md`, `agent-profiles-prototype.md`.
- Instantanés `agent-profiles`, `full`, `full-en`, `full-public` ; les autres restent identiques.
- Hors périmètre : choix de l'agent principal (#35), profils optionnels (#34), droits d'écriture d'`openspec` et d'`archgate` au-delà du tableau d'ARCH-012 (par exemple `archgate adr domain add`, qui reste à l'agent principal), essai du déclenchement du hook sur l'outil `Agent` d'un teammate en session d'équipe (suite de #113).
