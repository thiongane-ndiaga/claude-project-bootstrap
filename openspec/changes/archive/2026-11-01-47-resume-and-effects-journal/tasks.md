## 1. Script

- [x] 1.1 `scripts/state.mjs` : bibliothèque et CLI JSON (`init`, `config`, `step`, `show`, `next`, `resume`, `effect`, `effects`), dossier `.bootstrap/local/` qui s'ignore seul, écriture atomique avec nouvelles tentatives, garde-fous (cible existante, `init` refusé si l'état existe, état illisible ou version inconnue), codes de sortie 0/1.
- [x] 1.2 Étapes ordonnées avec leur condition sur les modules (`phase4-adr` : `archgate` et `github`), ordre adapté au mode `local`, preuves vérifiables, déduction sans état, `resume` en lecture seule.
- [x] 1.3 Journal des effets : cinq types, valeur précédente lue par un exécuteur injectable, annulation en chaîne et en tableau d'arguments, annulation prudente des plugins et marketplaces, liste blanche des entrées, `--done` / `--failed`, `effects --undo`.
- [x] 1.4 `scaffold.mjs --detect` : champ `resumable`.

## 2. Skill et documentation

- [x] 2.1 `SKILL.md` : `resume`, `config --out`, `init`, `step --status doing` puis `done`, `effect` / `effect --done` autour des actions globales (une entrée par paquet), `effects --undo` en fin de phase 2.
- [x] 2.2 `README.md`, `CLAUDE.md`, `CONTRIBUTING.md` et `.github/pull_request_template.md` : le script et son fichier de tests.
- [x] 2.3 ADR ARCH-009 ; arc42 par `arc42-keeper` ; piège « ne pas relancer `init` » dans `references/pitfalls.md`.

## 3. Tests

- [x] 3.1 `tests/state.test.mjs` : arrêt simulé après chaque étape (six sélections de modules, deux modes de CLI), preuves réelles, preuve manquante, `doing` et `failed`, état absent, lecture seule, cible inexistante.
- [x] 3.2 Journal : valeurs précédentes présentes et absentes pour git et npm, plugin et marketplace (déjà présent, absent, illisible), `custom`, `--done` et `--failed`, ordre de `effects --undo`, aucune exécution, liste blanche.
- [x] 3.3 État intact après `scaffold.mjs` et `--update` ; configuration restituée à l'identique ; clés hors schéma ignorées ; `git status` propre ; `SKILL.md` cite les appels attendus ; `.bootstrap/checks.json` lance `tests/state.test.mjs`.
- [x] 3.4 `node .bootstrap/run-checks.mjs`, `openspec validate --all --strict --no-interactive`, `archgate check`.

## 4. Livraison

- [x] 4.1 Archiver le changement, renseigner le `Purpose` de `session-resume`, ouvrir la PR `feat(skill): resume state and global effects journal` avec `Closes #47`.
