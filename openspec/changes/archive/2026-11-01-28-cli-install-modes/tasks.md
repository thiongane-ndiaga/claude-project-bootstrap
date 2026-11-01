## 1. Générateur

- [x] 1.1 `scaffold.mjs` : lire `cliInstall` (valeurs `global|user|local`, sinon code 1), refuser `local` sans `openspec` ni `archgate`, ajouter `cli-user` / `cli-local` à l'ensemble actif, ne consigner la clé au manifeste que si elle est présente.
- [x] 1.2 `scaffold.mjs` : valider les entrées `when` du catalogue (module ou pseudo-module connu).
- [x] 1.3 `scaffold.mjs` : `buildPackageJson` (JSON construit en code, sans `name`, `private`, script `claude`, `devDependencies` des modules choisis aux versions exactes) , ajouté aux sorties comme `settings.json` (propre au projet, sans entrée au catalogue) ; `--detect` expose `packageJson`.

## 2. Modèles

- [x] 2.1 `.gitignore` : `node_modules/` en mode `local`.
- [x] 2.2 `ci.yml` : mode `local` (`cache: npm`, `npm ci`, étape `shell: bash` vers `$GITHUB_PATH`, pas de versions dans `env`, `OPENSPEC_TELEMETRY` conservé, pas de bloc `env` vide) ; modes `global` et `user` inchangés.
- [x] 2.3 `quality-gate.mjs` : en mode `local`, `PATH` du processus préfixé par `node_modules/.bin` (chemin depuis `import.meta.url`, clé insensible à la casse, `path.delimiter`).
- [x] 2.4 `docs/workflow.md` : « Nouveau poste » par mode (`global`, `user` avec `--prefix ~/.local` et la note Windows, `local` avec `npm ci` et `npm run claude`).

## 3. Audit

- [x] 3.1 `audit.mjs` : exécuteur avec `PATH` préfixé en mode `local` ; `checkVersions` lit `package.json` (indépendant de `ci.yml`), signale une `devDependency` absente, correction adaptée au mode (`user`, `local`).
- [x] 3.2 `audit.mjs --workstation` : préfixe npm pour `global` et `user` seulement ; `node_modules/.bin/<cli>[.cmd]` pour `local`.

## 4. Skill et documentation

- [x] 4.1 `SKILL.md` : question de phase 0 avec test d'écriture du préfixe npm et défaut, phase 2 par mode (lockfile `npm install --package-lock-only` en `local`, `package.json` existant), `bootstrap-config.md` (clé `cliInstall`).
- [x] 4.2 `references/pitfalls.md` (limite `npm run claude`, lockfile absent, `package.json` existant, second `npm ci` d'un `project-setup`, changement de mode manuel, montée de version en `local`) et `references/verification.md` (parcours par mode, Linux et Windows, invite Ctrl+C du shim `.cmd`).
- [x] 4.3 arc42 : section 9 et sections concernées via `arc42-keeper` après l'ADR ARCH-007.

## 5. Tests

- [x] 5.1 `tests/scaffold.test.mjs` : valeur invalide refusée, mode absent identique à `global` (manifeste sans la clé), `user` ne change que `workflow.md` et le manifeste, `local` (`package.json` valide pour chaque combinaison de CLI, `.gitignore`, `ci.yml` sans `npm install -g`, avec `shell: bash` et sans bloc `env` vide, hook avec `.bin`, `workflow.md`), `local` sans CLI refusé, `package.json` existant conservé, mise à jour rejouant le mode, audit par mode (versions, `devDependency` absente, `PATH`, `--workstation`), validation du catalogue.
- [x] 5.2 `tests/matrix.test.mjs` : combinaisons `default-cli-user` et `default-cli-local`, dénombrement mis à jour ; instantanés (`UPDATE_SNAPSHOTS=1`), relire le diff (aucun instantané existant ne change) ; étape réseau (`npm install --package-lock-only`, `npm ci`, `openspec validate`, `archgate check`) exigée en CI, exécutée en local avec `PB_NETWORK_TESTS=1`, sinon ignorée avec un message.
- [x] 5.3 `node .bootstrap/run-checks.mjs`, `openspec validate --all --strict --no-interactive`, `archgate check`.

## 6. Livraison

- [ ] 6.1 Archiver le changement, renseigner le `Purpose` de `cli-install-modes`, ouvrir la PR `feat(scaffold): cli install modes (global, user prefix, local)` avec `Closes #28`.
