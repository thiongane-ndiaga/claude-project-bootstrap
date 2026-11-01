## Context

OpenSpec et Archgate sont installés en global : `SKILL.md` (phase 2), `ci.yml` (`npm install -g` à chaque run), `docs/workflow.md` (« Nouveau poste »). `quality-gate.mjs` appelle `openspec` et `archgate` par leur nom (avec `shell: true` pour les shims `.cmd` de Windows). Les skills `/opsx:*` générés par `openspec init` appellent aussi `openspec` depuis le `PATH` et ne doivent pas être modifiés. L'audit lance les CLI par leur nom et lit les versions dans `OPENSPEC_VERSION` et `ARCHGATE_VERSION` de `ci.yml`. Les blocs conditionnels des modèles s'appuient sur des modules et des pseudo-modules (`visibility-*`, `stack-*`), et `scaffold.mjs` classe un fichier `owned` déjà présent en `kept` sans conflit. La décision d'ensemble est l'ADR ARCH-007.

## Goals / Non-Goals

**Goals:**
- Trois modes (`global`, `user`, `local`), choisis à la phase 0, qui fonctionnent sous Linux, macOS et Windows.
- Un seul mode d'appel des CLI (par leur nom) dans tous les fichiers générés.
- Le mode par défaut ne change rien pour les projets existants.

**Non-Goals:**
- Binaire autonome d'Archgate, autres gestionnaires de paquets, changement de mode après coup (#27).
- Faire du mode `local` le défaut (il ajoute `package.json` et lockfile, en tension avec « aucune stack »).
- Mise à jour automatique des `devDependencies` : Dependabot (#51) ne couvre que `github-actions` ; l'ajouter à l'écosystème npm créerait un écart permanent avec le manifeste.

## Decisions

1. **Clé `cliInstall`** (`global` par défaut, valeurs validées) et deux pseudo-modules `cli-user` / `cli-local` ajoutés à l'ensemble actif de `scaffold.mjs`. Le mode est consigné dans `config` du manifeste **seulement quand la clé est présente** (le défaut n'est pas écrit : manifeste et instantanés des projets existants inchangés), donc rejoué à la mise à jour. `local` sans module `openspec` ni `archgate` est refusé (code 1). La validation du catalogue vérifie en plus que chaque entrée `when` cite un module ou un pseudo-module connu.
2. **`user` ne touche que `docs/workflow.md`** (et le manifeste) : les exécuteurs hébergés de la CI ont un préfixe inscriptible, donc `ci.yml` garde `npm install -g`. Sous Windows, `~/.local` n'a pas de sens et le préfixe npm est déjà propre à l'utilisateur : `user` y équivaut à `global`, ce que la documentation dit. On garde `--prefix` plutôt que `npm config set prefix` (qui modifie la configuration npm globale de l'utilisateur, à consentir) ; la correction de l'audit en mode `user` inclut le préfixe.
3. **`local` : `PATH` plutôt que `npx`** (ARCH-007). Remplacer chaque appel par `npx --no-install openspec` toucherait les agents, les autorisations de `settings.json`, la liste du hook lecture seule, les ADR et les skills `/opsx:*` (non modifiables). `node_modules/.bin` ajouté au `PATH` laisse tous les appels inchangés : `quality-gate.mjs` le fait pour tout le processus, donc aussi pour `runChecks()` (chemin calculé depuis `import.meta.url`, pas depuis le répertoire courant ; clé `PATH` retrouvée sans tenir compte de la casse, car c'est `Path` sous Windows ; `path.delimiter`), la CI via `$GITHUB_PATH`, l'audit via son exécuteur, et les sessions Claude Code démarrent avec `npm run claude` (`npm run claude -- <options>` pour les options). Alternative non retenue : un hook `SessionStart` qui écrit `PATH` dans `CLAUDE_ENV_FILE` (non vérifié côté outil PowerShell). Limite assumée : une session démarrée autrement ne trouve pas `openspec` pour les skills `/opsx:*`.
4. **`package.json` construit par le générateur**, comme `settings.json` (`buildPackageJson`), pas par un modèle à blocs (virgules finales invalides selon la combinaison). Contenu : `private: true`, script `claude`, `devDependencies` des seuls modules choisis à la version exacte, sans `name` (un `projectName` libre ferait un nom npm invalide). Entrée `owned` du catalogue : créée une fois, jamais remplacée. S'il existe déjà, il est `kept` : le skill lit le champ `packageJson` de `--detect` et donne la commande `npm install --save-dev --save-exact`, et l'audit signale une `devDependency` absente.
5. **Lockfile créé par le skill**, pas par `scaffold.mjs` : `npm install --package-lock-only`, avec l'accord de l'utilisateur, avant le premier push (`npm ci` et `cache: npm` échouent sans lockfile).
6. **CI en mode `local`** : `setup-node` avec `cache: npm`, étape `npm ci`, étape `shell: bash` qui ajoute `${{ github.workspace }}/node_modules/.bin` à `$GITHUB_PATH` (aussi sur `windows-latest`), puis `openspec validate` et `archgate check` sans installation. `OPENSPEC_VERSION` et `ARCHGATE_VERSION` disparaissent de l'`env` (la source de vérité est `package.json`) ; `OPENSPEC_TELEMETRY` reste, et le bloc `env` n'existe que s'il a au moins une clé (cas `archgate` seul).
7. **Audit** : le mode vient du manifeste. `checkVersions` lit `package.json` en `local` sans dépendre de `ci.yml`, et signale une `devDependency` absente. L'exécuteur de l'audit préfixe son `PATH` par `<cible>/node_modules/.bin` en `local` (sonde de version, `archgate check`, `openspec validate`, `doctor`). Le contrôle du préfixe npm ne s'applique qu'à `global` et `user` ; en `local`, `--workstation` vérifie `node_modules/.bin/<cli>[.cmd]`.
8. **Phase 0** : le test d'écriture du préfixe npm (décrit aujourd'hui en phase 2) est fait dès la phase 0 pour fixer le défaut : `user` si non inscriptible hors Windows, sinon `global`. `local` seulement sur demande.
9. **Matrice** : `default-cli-user` et `default-cli-local` (sélection par défaut avec le mode) s'ajoutent aux combinaisons déduites du catalogue ; le test de dénombrement est mis à jour. Les instantanés existants ne changent pas. Une étape réseau (`npm install --package-lock-only` puis `npm ci`, `openspec validate`, `archgate check` dans le projet généré) s'exécute en CI et, en local, quand `PB_NETWORK_TESTS=1` ; sinon elle est ignorée avec un message.

## Risks / Trade-offs

- Une session Claude Code lancée sans `npm run claude` en mode `local` ne trouve pas `openspec` pour les skills `/opsx:*` : documenté. Sous Windows, si `claude` est un shim `.cmd`, `npm run` peut afficher l'invite « Terminer le programme de commandes (O/N) ? » au Ctrl+C : à vérifier dans `verification.md`.
- `package.json` apparaît dans un projet « sans stack » : mode opt-in, `private` et sans `name` ni `main`.
- Une stack Node avec son propre `project-setup` peut lancer un second `npm ci` : consigné dans `pitfalls.md`.
- `quality-gate.mjs` modifie `process.env` en mode local : le bloc ne vit que dans ce mode, le mode `global` reste textuellement identique.

## Migration Plan

Aucune migration : un projet existant est en mode `global` implicite. Passer à un autre mode après coup (#27) n'est pas géré; la procédure manuelle (ajouter la clé, relancer `--update`, `npm install --package-lock-only`) est décrite dans `references/pitfalls.md`.

## Open Questions

Aucune.
