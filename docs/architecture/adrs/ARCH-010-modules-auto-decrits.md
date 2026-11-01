---
id: ARCH-010
title: Modules auto-décrits
domain: architecture
rules: false
files: ["skills/project-bootstrap/**"]
---

# Modules auto-décrits

## Statut

Accepté.

## Context

Un module du plugin (claude, openspec, github, release…) est décrit à quatre endroits : le catalogue central, deux arbres de modèles communs (français et anglais) et le tableau de `SKILL.md`. Ajouter un module modifie ces quatre endroits, ce qui rend les contributions extérieures difficiles et les conflits fréquents. Des modules comme sonar, jira ou jenkins sont attendus.

## Decision

1. **Un module est un dossier** `assets/modules/<nom>/` : `module.json` (description, `requires`, `default`, `conflicts`, `questions` de phase 0, liste `files`), ses modèles dans `templates/` et `templates.<lang>/`, ses tests dans `tests/*.test.mjs`. Le dossier `core` est obligatoire.
2. **Propriété des fichiers** : un fichier appartient au module qui le déclare ; `when` ne liste que les modules **supplémentaires** nécessaires. Les ADR d'outillage ARCH-001 à ARCH-005 (et leurs règles) appartiennent à `archgate`, les formulaires d'issues à `github`, les fichiers transverses (`CLAUDE.md`, `docs/workflow.md`) à `core`.
3. **Un chargeur** (`scripts/catalog.mjs`) découvre les dossiers, valide les descripteurs et assemble le catalogue ; `scaffold.mjs`, les tests et la matrice l'utilisent. Le tableau des modules n'est plus recopié : `scaffold.mjs --list-modules` le produit.
4. **Chemins réservés au générateur** : `.claude/settings.json`, `package.json`, `.bootstrap/manifest.json`, `.bootstrap/base/**`, `.bootstrap/local/**` et `.git/**` sont écrits par le générateur ou par `state.mjs` et ne peuvent pas être déclarés par un module.
5. **Langues** : une langue est disponible si le module `core` a son dossier `templates.<lang>/` ; un module sans version localisée retombe sur son `templates/`. Un `templates.<lang>` absent de `core` est refusé, et `templates.fr` n'existe pas (ARCH-008).
6. **Sortie inchangée** : la condition de génération d'un fichier est le module propriétaire et tous ses `when`, donc la même que celle du catalogue central ; les instantanés de la matrice le prouvent.

## Do's and Don'ts

### Do

- Ajouter un module en créant un dossier, sans modifier un fichier du plugin hors de ce dossier (les instantanés de la matrice se régénèrent par `UPDATE_SNAPSHOTS=1`).
- Réserver un seul propriétaire par chemin et un seul numéro `ARCH-NNN` par ADR.

### Don't

- Ne pas déclarer un chemin réservé au générateur.
- Ne pas suivre de lien symbolique dans un dossier de module.

## Consequences

### Positive

- Un module se contribue, se relit et se teste dans un seul dossier.
- Le catalogue est validé au chargement avec des messages qui nomment le fichier fautif.

### Negative

- Ce qui reste codé hors du dossier d'un module : les permissions de `.claude/settings.json` par module (`buildSettings`), les étapes de `state.mjs`, les contrôles de `audit.mjs`, les migrations et les blocs `@@module` des fichiers transverses.
- Les réponses aux `questions` d'un module ne sont pas consommées par un schéma de configuration : elles guident le skill, sans paramètre de génération propre au module.

### Risks

- Un fichier mal rangé n'est pas détecté par la génération (le chemin reste le même) mais l'est par `--list-modules` et la relecture.
- Un modèle localisé oublié retombe sur le français sans erreur : les combinaisons `full` et `full-en` de la matrice et le test de parité le détectent.

## Compliance and Enforcement

Validation du chargeur (`tests/scaffold.test.mjs`), instantanés et combinaisons de la matrice, `tests/modules.test.mjs` pour les tests de module. Pas de règle Archgate : le sujet est la structure du plugin.

## References

- Issue #49 ; changement OpenSpec `49-self-describing-modules`
- ARCH-008 (modèles de documentation par langue)
