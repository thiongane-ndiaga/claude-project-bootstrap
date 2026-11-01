---
id: ARCH-007
title: Installation des CLI d'outillage des projets générés
domain: architecture
rules: false
files: ["skills/project-bootstrap/**"]
---

# Installation des CLI d'outillage des projets générés

## Statut

Accepté.

## Context

OpenSpec et Archgate sont des CLI npm que les projets générés appellent depuis le `PATH` : hook de contrôle qualité, `pre-push`, CI, agents, et skills `/opsx:*` que `openspec init` génère (le plugin ne les modifie pas). Le plugin imposait `npm install -g`, qui échoue quand le préfixe npm n'est pas inscriptible (`/usr` sous Linux) et laisse les versions diverger d'un poste à l'autre. Le mode local (`devDependencies`) règle la dérive mais ajoute `package.json`, lockfile et `node_modules`, en tension avec la contrainte « aucune stack » (arc42, section 2).

Alternatives pour le mode local : remplacer chaque appel par `npx --no-install <cli>` (touche agents, autorisations, hook lecture seule, ADR, et laisse les skills `/opsx:*` inchangeables, donc cassés), ou mettre `node_modules/.bin` dans le `PATH`.

## Decision

1. Trois modes, choisis à la phase 0 et consignés au manifeste (`config.cliInstall`, absent = `global`) : `global` (défaut), `user` (préfixe `~/.local` ; sous Windows, équivalent à `global`), `local` (opt-in explicite, jamais le défaut).
2. Les CLI sont appelées par leur nom dans tous les modes. En `local`, `node_modules/.bin` est ajouté au `PATH` par `quality-gate.mjs`, par la CI et par l'audit ; le hook `SessionStart` `session-path.mjs` l'ajoute au `PATH` de l'outil Bash des sessions Claude Code, et `npm run claude` couvre l'outil PowerShell et le terminal personnel.
3. Seul le mode `local` crée un fichier de plus : `package.json` (propre au projet, `owned`), sans `name`, avec des versions exactes ; le lockfile est créé par le skill avec l'accord de l'utilisateur. Le mode `local` exige au moins un module `openspec` ou `archgate`.
4. En `local`, la source de vérité des versions est `package.json` (plus de `OPENSPEC_VERSION` ni `ARCHGATE_VERSION` dans `ci.yml`).
5. npm est le seul gestionnaire géré ; le changement de mode après coup n'est pas automatisé.

## Do's and Don'ts

### Do

- Garder les appels `openspec` et `archgate` identiques dans tous les modes.
- Construire le `PATH` avec `path.delimiter` et retrouver la clé `PATH` sans tenir compte de la casse (`Path` sous Windows). Le fichier `CLAUDE_ENV_FILE` est lu par Bash : la ligne qu'y écrit `session-path.mjs` utilise `:` et la forme `/c/...` sous Windows.
- Refuser tout `sudo` dans les commandes proposées.

### Don't

- Ne pas faire du mode `local` le défaut.
- Ne pas remplacer les appels par `npx` dans les fichiers générés.
- Ne pas écrire `cliInstall: global` dans le manifeste quand la clé est absente.

## Consequences

### Positive

- Choix explicite de l'installation, versions reproductibles en `local`.
- Aucun fichier ne change pour les projets existants (mode `global` implicite).

### Negative

- En mode `local`, l'outil PowerShell de Claude Code et un terminal personnel ne trouvent pas `openspec` sans `npm run claude` ou `npx` ; la documentation générée, qui peut citer `npx`, ne contrevient pas au Don't ci-dessus, lequel vise les appels des fichiers générés.
- Un `package.json` existant est conservé tel quel : les `devDependencies` s'ajoutent à la main.

### Risks

- Dependabot ne couvre que `github-actions` : mettre à jour les `devDependencies` reste manuel (`npm install --save-exact`).

## Compliance and Enforcement

Tests du générateur et de l'audit par mode, combinaisons `default-cli-user` et `default-cli-local` de la matrice (instantanés), contrôle `--workstation` de l'audit. Pas de règle Archgate : le sujet est du contenu de modèles, couvert par les instantanés.

## References

- Issue #28 ; changement OpenSpec `28-cli-install-modes`
- ARCH-006 (mise à jour des fichiers générés)
- Issue #104 ; changement OpenSpec `104-local-path-session-hook` (hook de session du mode local)
