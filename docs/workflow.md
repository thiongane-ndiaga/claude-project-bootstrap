# Workflow du dépôt

Chaque couche a un rôle :
**issue** = le besoin,
**Claude Code** = l'exécution,
**PR + CI** = la validation,
**Release** = la livraison.

## Étapes

- **Issue** via un formulaire : *Fonctionnalité* ou *Bug* (labels `bug` et `enhancement` posés par le formulaire).
- **Branche** `<type>/<N>-<slug>` (ex. `feat/12-password-reset`).
- **PR** : titre Conventional Commit, corps avec `Closes #N`. Le titre est contrôlé par la CI (job `pr-title`).
- **Squash merge** : le titre de PR devient le commit sur `main` ; l'issue se ferme.
- **Release** : release-please tient à jour une PR « chore(main): release X.Y.Z » (`CHANGELOG.md`, `.release-please-manifest.json`). La merger crée le tag `vX.Y.Z` et la GitHub Release. Pas de déploiement : le plugin est installé depuis ce dépôt (marketplace).

## Conventions de traçabilité

| Élément | Format | Exemple |
|---|---|---|
| Issue | `#N` | `#12` |
| Corps de PR | `Closes #N` | |
| Branche | `<type>/N-<slug>` | `feat/12-password-reset` |
| Commit / titre de PR | `<type>(<scope>): <description>` | `feat(auth): add password reset` |

Types : `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`, `perf`, `style`, `revert`.
Avant 1.0.0 : `feat` → patch, `feat!` → minor.

## Contrôles

| Où | Quoi | Bloquant |
|---|---|---|
| Hook Claude `TaskCompleted` (agent teams) | `node .claude/hooks/quality-gate.mjs` | oui (tâche non close) |
| `.githooks/pre-push` (activé par `git config core.hooksPath .githooks`, une fois par clone) | même contrôle | oui (push annulé) |
| CI `ci.yml` | mêmes commandes (`.bootstrap/checks.json`) sur Linux, Windows et macOS + titre de PR (`scripts/check-pr-title.mjs`) | oui : la protection de `main` exige ces checks |
| PR de release-please | la CI attend une approbation (*Approve and run*) car déclenchée par le bot `github-actions` | — |

### Commandes du projet (tests, linter, types, build)

Les commandes propres à la stack se déclarent **à un seul endroit**, `.bootstrap/checks.json`, et sont exécutées par `.bootstrap/run-checks.mjs`, lu par le contrôle qualité local (donc le hook `TaskCompleted` et le `pre-push`) et par la CI :

```json
{ "name": "tests", "command": "node tests/scaffold.test.mjs" }
```

- `os` (facultatif) restreint la commande à certains systèmes ; `blocking: false` la signale sans bloquer.
- `ciOs` fixe les systèmes de la matrice de la CI (noms de runners GitHub).
- Pour les commandes qui exigent une chaîne d'outils (langage, dépendances), ajouter l'étape d'installation dans `ci.yml`, avant l'étape « Commandes du projet ».
- Ce fichier est propre au projet : une mise à jour du plugin ne doit pas l'écraser.

Claude Code utilise `gh` en lecture sans demander ; `gh issue create`, `gh pr create`, `gh pr merge`, `gh release create` demandent toujours une approbation.

## Nouveau poste (Windows natif ou Linux)

1. **Prérequis** : Node.js ≥ 20.19 et git.
   Installer aussi [gh](https://cli.github.com), puis `gh auth login -h github.com -s project`.
1. **Hooks git** : dans le clone, `git config core.hooksPath .githooks`.
1. **Vérifier** : `node .claude/hooks/quality-gate.mjs` renvoie 0.

Ne jamais partager un même clone entre Windows et WSL.
