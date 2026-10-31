Issue: #82
ADR: ARCH-006

## Why

Le `ci.yml` généré invite chaque projet à y insérer, au milieu du fichier, l'installation de sa chaîne d'outils (langage, dépendances). Le projet modifie alors un fichier que le plugin met à jour : le moindre changement du modèle redevient un conflit. ARCH-006 (point 3) sépare ce qui est géré de ce qui appartient au projet : `ci.yml` reste entièrement géré, et l'installation va dans un fichier propre au projet.

## What Changes

- Le module `github` génère `.github/actions/project-setup/action.yml`, une action composite locale créée une seule fois avec une seule étape qui n'affiche qu'un message, et qui appartient ensuite au projet (`owned`).
- `ci.yml` appelle cette action, après le checkout et l'installation de Node, avant les commandes de `.bootstrap/checks.json`. Les noms des jobs et des checks ne changent pas.
- La règle Archgate d'épinglage des actions (ARCH-004) accepte les actions locales (`./…`) et couvre aussi `.github/actions/`.
- Le modèle de `docs/workflow.md` dit d'installer la chaîne d'outils dans `project-setup`, plus dans `ci.yml`.
- Documentation (`references/versioning.md`) et mise à jour de ce dépôt avec ses propres fichiers.

Hors périmètre (reste de #82, donc la PR utilise `Refs #82` et non `Closes`) : séparation du contenu géré de `CLAUDE.md` dans `.claude/rules/`, qui attend un essai en session réelle, et le contrôle `--detect` signalant un fichier de règles supprimé ou un `ci.yml` qui n'appelle plus `project-setup`. Hors périmètre aussi : le découpage de `docs/workflow.md` en contenu géré et propre au projet (#83) et les jobs supplémentaires du projet (autres fichiers de workflow).

## Capabilities

### New Capabilities
- `project-setup-action`: point d'extension de la CI générée où le projet installe sa chaîne d'outils sans modifier `ci.yml`.

### Modified Capabilities

## Impact

- Modèles : `.github/workflows/ci.yml`, `docs/workflow.md`, ARCH-004 (texte et `.rules.ts`), nouveau `.github/actions/project-setup/action.yml`.
- Catalogue : `skills/project-bootstrap/assets/modules.json` (nouveau fichier `owned` du module `github`).
- Tests : `tests/scaffold.test.mjs`. Documentation : `references/versioning.md`.
- Projets générés : un fichier de plus ; la mise à jour d'un projet existant remplace `ci.yml` s'il est resté tel que généré, le fusionne si la base le permet, sinon le signale en conflit (voir design D4).
- Contrainte GitHub : une action locale (`uses: ./…`) exige un checkout préalable ; vérifié en CI sur les trois systèmes. Les exécuteurs auto-hébergés sans `bash` ne sont pas couverts.
