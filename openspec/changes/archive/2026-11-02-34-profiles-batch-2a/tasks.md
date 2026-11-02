## 1. Générateur et hook

- [x] 1.1 `catalog.mjs` : trois noms dans `OPTIONAL_PROFILES` ; `module.json` : fichiers `when` et question de phase 0 (six noms)
- [x] 1.2 `profile-guard.mjs` : trois entrées de la table
- [x] 1.3 `scaffold.mjs` : avertissement `advisor` quand aucun profil sonnet ou haiku n'est choisi

## 2. Modèles

- [x] 2.1 `acceptance-tester`, `scout`, `second-opinion` (français et anglais), blocs `advisor-on` pour les deux premiers, blocs `github` et `openspec` pour `acceptance-tester`, règle « qui écrit ne relit pas »
- [x] 2.2 `project-lead` : délégation, Parcours (`scout`, recette, contre-avis des niveaux 3 et 4) et neutralité du brief (français et anglais)

## 3. Tests

- [x] 3.1 `scaffold.test.mjs` : liste `all` et nom inconnu fictif, génération sur choix, outils, valeurs de départ (`TABLE`), consigne advisor (cinq profils) et avertissement avec `second-opinion` seul, modules `github` et `openspec` absents, délégation, règle de relecture
- [x] 3.2 `profile-guard.test.mjs` : lecture seule, lancements refusés et cas teammate pour les trois profils
- [x] 3.3 Matrice : listes `profiles` d'`agent-profiles-optional`, `advisor-on` et `full-en` avec les six profils, instantanés relus

## 4. Documentation

- [x] 4.1 `SKILL.md`, `bootstrap-config.md`, `pitfalls.md` (limites, nom `scout`, `Explore`, `WebFetch`, `effort` sur haiku), table des valeurs
- [x] 4.2 ARCH-014 (liste des noms) et ARCH-015 (valeurs) amendés ; arc42 (5) via `arc42-keeper`

## 5. Validation

- [x] 5.1 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `openspec validate --all --strict`
