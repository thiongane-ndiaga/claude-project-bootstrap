Issue: #28
ADR: ARCH-007

## Why

L'installation des CLI OpenSpec et Archgate est imposée en global (`npm install -g`) dans `SKILL.md`, `ci.yml` et la documentation « Nouveau poste ». Le préfixe global n'est pas toujours inscriptible (`/usr` sous Linux) et les versions peuvent diverger d'un poste à l'autre. Le plugin ne laisse pas le choix du mode, alors que le projet doit fonctionner sous Linux, macOS et Windows.

## What Changes

- Nouvelle clé `cliInstall` de `bootstrap.json` : `global` (défaut), `user` (préfixe utilisateur) ou `local` (opt-in explicite), consignée au manifeste seulement quand elle est présente.
- `user` : la section « Nouveau poste » de `docs/workflow.md` donne `--prefix ~/.local` et la vérification du `PATH`. Aucun autre fichier ne change.
- `local` : `package.json` construit par le générateur (sans `name`, `devDependencies` aux versions exactes, script `claude`; refusé sans module `openspec` ni `archgate`), `node_modules/` dans `.gitignore`, `npm ci` avec cache npm dans la CI au lieu de `npm install -g`, `node_modules/.bin` ajouté au `PATH` par `quality-gate.mjs` et par la CI, section « Nouveau poste » adaptée. Le lockfile est créé par le skill (`npm install --package-lock-only`) et commité.
- La phase 0 pose la question avec un défaut documenté (`user` si le préfixe npm n'est pas inscriptible, sinon `global`; `local` seulement sur demande).
- L'audit lit les versions dans `package.json` en mode `local` et contrôle `node_modules/.bin`; le contrôle du préfixe npm ne s'applique qu'aux modes `global` et `user`.
- La matrice de tests ajoute deux combinaisons (`default-cli-user`, `default-cli-local`) et une étape réseau (CI, ou `PB_NETWORK_TESTS=1`).
- ADR ARCH-007 et mise à jour d'arc42.

Hors périmètre : binaire autonome d'Archgate, changement de mode après coup (#27), gestionnaires autres que npm, mise à jour automatique des `devDependencies` (Dependabot ne couvre que `github-actions`).

## Capabilities

### New Capabilities
- `cli-install-modes`: choix du mode d'installation des CLI d'outillage dans un projet généré et ses effets sur les fichiers générés.

### Modified Capabilities
- `generator-test-suite`: deux combinaisons de la matrice (modes `user` et `local`).
- `project-audit`: les contrôles des versions épinglées et du préfixe npm dépendent du mode d'installation.

## Impact

- Modifiés : `scripts/scaffold.mjs` (clé, pseudo-modules, paramètres), `scripts/audit.mjs`, `assets/modules.json` (entrée `package.json`), modèles `ci.yml`, `.gitignore`, `.claude/hooks/quality-gate.mjs`, `docs/workflow.md`, `SKILL.md`, `references/bootstrap-config.md`, `references/pitfalls.md`, `references/verification.md`, `tests/scaffold.test.mjs`, `tests/matrix.test.mjs`.
- Nouveaux : ADR `ARCH-007`, instantanés `default-cli-user.json` et `default-cli-local.json`.
- Les instantanés existants ne changent pas (le mode par défaut produit les mêmes fichiers).
- Projets existants : mode `global` implicite, aucun effet.
