## 1. Générateur et catalogue

- [x] 1.1 `catalog.mjs` : `OPTIONAL_PROFILES` et pseudo-modules `profile-<nom>`
- [x] 1.2 `scaffold.mjs` : clé `profiles` (validation, normalisation, héritage, désactivation, dépendance à `openspec`), modules actifs
- [x] 1.3 `state.mjs` : `profiles` parmi les réponses conservées

## 2. Profils et hook

- [x] 2.1 `product-owner`, `developer`, `business-analyst` (français et anglais)
- [x] 2.2 `module.json` : fichiers conditionnels, question de phase 0
- [x] 2.3 `profile-guard.mjs` : entrées de table, `writeExcept` étendue, `shellOpen`, chemin réel, refus des flux NTFS, formes des skills OpenSpec

## 3. Tests

- [x] 3.1 Tests du module : trois profils, dossiers de gouvernance, contournements (casse, points finals), chemins voisins et hors projet, commandes et skills de `business-analyst`
- [x] 3.2 `scaffold.test.mjs` : clé `profiles` (absente, liste, doublons, refus, `--update`, désactivation), contenu des profils, absence de référence aux modules inactifs, anglais
- [x] 3.3 Matrice : combinaison `agent-profiles-optional`, instantanés
- [x] 3.4 Essai réel (Claude Code 2.1.316) : `developer` écrit dans `src/`, refusé dans `.claude/` et `docs/architecture/`

## 4. Documentation

- [x] 4.1 `SKILL.md`, `bootstrap-config.md`, `pitfalls.md`, ARCH-012 (renvoi)
- [x] 4.2 arc42 (5, 8, 11) via `arc42-keeper`

## 5. Validation

- [x] 5.1 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `openspec validate --all --strict`
