## 1. Catalogue et modèle

- [x] 1.1 Vérifier la prise en charge de `cooldown`, `include: scope` et `directories` pour `github-actions` : couverts, rien à noter dans `pitfalls.md`.
- [x] 1.2 Ajouter le module `dependabot` à `assets/modules.json` (`requires: ["github"]`, `default: false`, description) et le fichier `.github/dependabot.yml` (`when: ["dependabot"]`).
- [x] 1.3 Créer `assets/templates/.github/dependabot.yml` : `github-actions`, répertoires `/` et `/.github/actions/*`, `interval: weekly`, groupe `actions` (`patterns: ["*"]`), `cooldown.default-days: 14`, `commit-message.prefix: "ci"` avec `include: "scope"`, label `chore`.

## 2. Documentation

- [x] 2.1 Ajouter la ligne `dependabot` au tableau des modules de `SKILL.md` (requiert `github`, opt-in).
- [x] 2.2 Documenter dans `references/versioning.md` la règle de choix des versions (numéro, délai de 14 jours, commentaire `# <tag>`) et le rôle du module.
- [x] 2.3 Noter dans `references/github-free.md` que les PR de Dependabot consomment des minutes Actions en dépôt privé, et dans `references/verification.md` une vérification de bout en bout optionnelle (Dependabot ouvre une PR, `pr-title` vert). Aucune action d'activation : le fichier suffit.

## 3. Audit et traçabilité

- [x] 3.1 Adapter `checkActions` de `audit.mjs` : pas de comparaison au manifeste quand `dependabot` est actif.
- [x] 3.2 Ajouter les blocs `@@module:dependabot` (exception de traçabilité) à `docs/workflow.md`, ARCH-005 et `traceability-checker.md`.

## 4. Tests

- [x] 4.1 Ajouter à `tests/scaffold.test.mjs` : fichier absent sans le module, présent avec, refus (code 1) sans `github`, contenu attendu, aucun résidu `{{…}}`/`@@`, titre `ci(deps)` accepté, audit avec `dependabot` (SHA différent du manifeste accepté, SHA différent entre workflows refusé).
- [x] 4.2 Ajouter : variante groupée du titre (`ci(deps): bump the actions group across 1 directory with 2 updates`), exception de traçabilité présente avec le module et absente sans, ajout du module à un projet existant (seul `.github/dependabot.yml` créé).
- [x] 4.3 Régénérer les instantanés (`UPDATE_SNAPSHOTS=1 node tests/matrix.test.mjs`) : `dependabot.json` nouveau, `full.json` et `full-public.json` modifiés ; relire le diff (aucun autre instantané ne change).
- [x] 4.4 Lancer `node .bootstrap/run-checks.mjs` et `openspec validate --all --strict --no-interactive`.

## 5. Livraison

- [x] 5.1 Archiver le changement (`/opsx:archive`) dans la PR, vérifier `archgate check`.
- [x] 5.2 Ouvrir la PR `feat(templates): optional dependabot module for pinned actions` avec `Closes #51`.
