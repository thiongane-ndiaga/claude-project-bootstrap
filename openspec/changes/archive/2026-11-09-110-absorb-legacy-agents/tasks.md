## 1. Catalogue et modules

- [x] 1.1 Pseudo-module `legacy-agents` (`catalog.mjs`, `scaffold.mjs`) ; `when` des cinq fichiers dans `archgate`, `arc42`, `openspec`, `github`
- [x] 1.2 Textes conditionnés des deux côtés : `workflow.md`, ARCH-001, ARCH-002, `project-lead`, `devops-engineer`, mentions Dependabot (français et anglais)

## 2. Profils

- [x] 2.1 `architect` : méthode d'exploration et règles arc42 ; `qa-engineer` : revue de spec et contrôle de traçabilité (français et anglais)
- [x] 2.2 `Agent` retiré des `tools` d'`architect` et `qa-engineer` ; `profile-guard.mjs` (deux copies) : entrées retirées, `agents` vides ; test du module adapté

## 3. Migration

- [x] 3.1 `migrations/0003-absorb-legacy-agents.mjs` : comparaison à `.bootstrap/base`, retrait du fichier, de sa copie et de son entrée de manifeste, notes sinon
- [x] 3.2 `migrate.mjs` : dépôt GitHub résolu à la demande ; en-tête, `SKILL.md` étape 5, `references/versioning.md`

## 4. Tests et documentation

- [x] 4.1 Tests de génération (avec et sans `agent-profiles`), aucun nom orphelin, méthodes présentes, commandes acceptées par le hook
- [x] 4.2 Tests de la migration (intact, modifié, sans base, après `--update`, absent, idempotence, sans remote) ; combinaison `full-legacy` ; instantanés (seuls ceux listés en D10 changent)
- [x] 4.3 `SKILL.md`, `verification.md`, `pitfalls.md`, arc42 5, 8 et 11 ; ARCH-011, ARCH-012, ARCH-015
- [x] 4.4 `node .bootstrap/run-checks.mjs` vert
