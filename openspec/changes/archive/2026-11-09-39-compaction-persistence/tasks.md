## 1. ADR et modèles

- [x] 1.1 ARCH-013 amendé (décision 6, Do), ARCH-010 amendé (hooks de `settings.json`)
- [x] 1.2 `CLAUDE.md` (français et anglais) : échelle d'arbitrage, phrase sur « toi », renvoi à `profile-guard.mjs`, sous `agent-profiles`
- [x] 1.3 Module `compact-recall` : `module.json` (sans question), `compact-recall.mjs` (français et anglais)
- [x] 1.4 `buildSettings` : `SessionStart` à matcher `compact`, ajouté après l'entrée du mode `local`

## 2. Tests

- [x] 2.1 Aucune règle à `paths:` ni `CLAUDE.md` de sous-dossier sur la sélection complète
- [x] 2.2 Échelle de `CLAUDE.md` égale à celle de `project-lead` (deux langues), absente sans `agent-profiles`
- [x] 2.3 Module : fichier, déclaration, mode `local` (ordre), absence ; test du hook dans le dossier du module (changement en cours, sous-dossier, dépôt vide)
- [x] 2.4 Position des sections de `SKILL.md`
- [x] 2.5 Instantanés régénérés

## 3. Documentation

- [x] 3.1 `pitfalls.md` (survie à la compaction, non vérifié, retrait du module), `SKILL.md`, arc42 section 8
- [x] 3.2 `node .bootstrap/run-checks.mjs` vert
