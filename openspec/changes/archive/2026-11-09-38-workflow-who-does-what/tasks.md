## 1. Modèles

- [x] 1.1 Étapes OpenSpec : `/opsx:explore`, `/opsx:update`, `/opsx:sync`, `skip_specs` (français et anglais)
- [x] 1.2 Sections « Qui fait quoi », « Échelle d'arbitrage », « Journal des décisions » sous `agent-profiles`
- [x] 1.3 Table « Double encodage » conditionnée aux modules porteurs de règles

## 2. Tests (français et anglais)

- [x] 2.1 Trois configurations (tous les profils, aucun, `agent-profiles` seul) : noms de la table = fichiers de `.claude/agents/`
- [x] 2.2 Échelle égale à celle de `project-lead` dans chaque langue
- [x] 2.3 Chaque ligne de la table : « consigne seulement » ou chemins existants ; chaque puce de `## Règles` a sa ligne ; section absente avec `core` seul
- [x] 2.4 Commandes OpenSpec présentes avec `openspec`, absentes sans
- [x] 2.5 Instantanés régénérés (`UPDATE_SNAPSHOTS=1`)

## 3. Documentation

- [x] 3.1 `pitfalls.md` : convention « règle de CLAUDE.md = ligne de table » ; arc42 section 8
- [x] 3.2 `node .bootstrap/run-checks.mjs` vert
