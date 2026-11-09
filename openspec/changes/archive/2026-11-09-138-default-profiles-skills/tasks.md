## 1. Catalogue et configuration

- [x] 1.1 `catalog.mjs` : `developer` quitte `OPTIONAL_PROFILES` ; `scaffold.mjs` : `developer` listé dans `profiles` retiré avec avertissement avant la validation ; avertissement de l'advisor adapté
- [x] 1.2 `module.json` d'`agent-profiles` : `developer.md` sans condition, quatre skills conditionnées par module, question de phase 0 sur sept profils

## 2. Modèles

- [x] 2.1 Quatre `SKILL.md` en français et en anglais (méthodes reprises de `architect` et `qa-engineer`, exception Dependabot dans `pr-readiness-review`)
- [x] 2.2 `architect` et `qa-engineer` (français et anglais) : méthodes remplacées par le lancement des skills, `Skill` pour `qa-engineer`
- [x] 2.3 `project-lead` : orchestrateur, `disallowedTools`, délégation sans condition ; `devops-engineer` et modèles d'ADR : noms des skills
- [x] 2.4 `workflow.md` (français et anglais) : skills aux étapes, ligne `developer` sous `agent-profiles`
- [x] 2.5 `profile-guard.mjs` : listes `skills` de `architect` et `qa-engineer`

## 3. Tests

- [x] 3.1 Génération : developer par défaut, quatre skills selon les modules, format, corps des profils, absence sans `agent-profiles`
- [x] 3.2 `profiles` avec `developer` (avertissement, manifeste) ; question de phase 0 ; `--update` d'un projet ancien
- [x] 3.3 Test du hook (skills permises et refusées) ; outils des profils ; `project-lead` sans `tools` et avec `disallowedTools`
- [x] 3.4 Instantanés régénérés ; combinaison `full-legacy` inchangée

## 4. Documentation

- [x] 4.1 `SKILL.md` (phase 0 et 1), `pitfalls.md` (limite de `disallowedTools`, skills sans contexte séparé), arc42 sections 5 et 8 via `arc42-keeper`
- [x] 4.2 `node .bootstrap/run-checks.mjs` et `node .claude/hooks/quality-gate.mjs` verts

## 5. Suites de la revue de spec

- [x] 5.1 `developer` rédige les specs sans `business-analyst`, `project-lead` archive par `openspec archive` et délègue `/opsx:apply` ; pas de `developer` en worktree
- [x] 5.2 Avertissement de l'advisor retiré (`advisor-module`), `ADVISOR_PROFILES` retiré
- [x] 5.3 `developer` filtré de `profiles` seulement avec `agent-profiles` ; test de nom de bloc inconnu
- [x] 5.4 ARCH-011 amendé, Purposes des specs `agent-profiles` et `legacy-agents` alignés à l'archivage
