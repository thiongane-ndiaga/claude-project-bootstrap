Issue: #24
ADR: ARCH-007 (amendé : installation des CLI dans un préfixe de l'espace de travail sur un agent auto-hébergé), ARCH-006 et ARCH-010 (appliqués tels quels), ARCH-004 (non modifié : `ci.yml` reste la CI de référence)

## Why

Des équipes disposent déjà d'un serveur Jenkins et veulent y rejouer les contrôles du workflow sans quitter GitHub. Aujourd'hui seul `ci.yml` (GitHub Actions) les exécute. Le module est un complément de `ci.yml`, non un remplacement (le remplacement relève de #25).

L'issue cite `quality-gate.mjs` ; le `Jenkinsfile` rejoue, comme `ci.yml`, les mêmes contrôles que lui par leurs commandes (`openspec validate`, `archgate check`, `.bootstrap/run-checks.mjs`) et le script du titre de PR.

## What Changes

- Nouveau module optionnel `jenkins` (`requires: github`, `default: false`, sans question de phase 0) qui génère `Jenkinsfile`, `scripts/jenkins-setup.sh` (propre au projet, jamais écrasé) et `docs/jenkins.md`.
- Le `Jenkinsfile` est un pipeline déclaratif aux étapes nommées de `ci.yml` : `Node`, `Titre de PR`, `CLI d'outillage`, `OpenSpec validate`, `Archgate check`, `Chaîne d'outils du projet`, `Commandes du projet`. Mêmes blocs conditionnels, mêmes versions épinglées, `archgate check --output console`.
- Installation des CLI sans toucher au préfixe npm de l'agent : `npm ci` en mode local, sinon `npm install -g --prefix` dans l'espace de travail.
- Titre de PR passé par `withEnv`, jamais interpolé dans une chaîne `sh`.
- `docs/jenkins.md` (français et anglais) liste les étapes manuelles et les limites, selon la visibilité et le mode d'installation ; une ligne du tableau des contrôles de `docs/workflow.md` y renvoie.
- Aucune écriture dans `.claude/settings.json`, aucun hook, aucun secret.
- Tests : génération, étapes, parité avec `ci.yml`, script de vérification de Node exécuté, fichier `owned`, conflit et ajout par `--update` ; instantanés de matrice dont une combinaison en mode local.

## Capabilities

### New Capabilities

- `jenkins-module` : module optionnel `jenkins`, son `Jenkinsfile`, son script propre au projet et sa documentation.

### Modified Capabilities

Aucune.

## Impact

- Nouveau dossier `skills/project-bootstrap/assets/modules/jenkins/` (modèles français et anglais, `tests/jenkins.test.mjs`), `tests/scaffold.test.mjs`, `tests/matrix.test.mjs` et instantanés (`full`, `full-en`, `full-public`, `full-legacy` gagnent les trois fichiers), modèles `core` (`docs/workflow.md`), `SKILL.md` (étape « ce qui restera manuel »), `pitfalls.md`, ARCH-007, arc42 sections 5 et 8.
- Hors périmètre : exécuter le `Jenkinsfile` (aucun Jenkins en CI), installer ou configurer Jenkins, les agents Windows, le remplacement de `ci.yml` et toute autre forge (#25), `tools { nodejs … }` (nom propre au serveur), la reconnaissance des contextes Jenkins par l'audit `forge-protection` et le contrôle des versions du `Jenkinsfile` par `audit.mjs` (#147).
