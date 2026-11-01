## Context

`assets/modules.json` décrit les 12 modules (dépendances, défaut, description) et liste les 50 fichiers avec leurs conditions `when`. Les modèles sont dans `assets/templates/` (50 fichiers) et `assets/templates.en/` (43), rangés par chemin de destination. `SKILL.md` recopie un tableau des modules. `scaffold.mjs` lit le catalogue, les tests (`scaffold.test.mjs`, `matrix.test.mjs`) aussi, et plusieurs tests copient le plugin pour modifier `modules.json` ou un modèle. Les fichiers transverses (`CLAUDE.md`, `docs/workflow.md`, formulaires, PR template) contiennent des blocs `@@module:…` qui citent plusieurs modules. `.claude/settings.json` et `package.json` sont construits en code. La décision d'ensemble est l'ADR ARCH-010.

## Goals / Non-Goals

**Goals:**
- Ajouter un module sans modifier un fichier du plugin hors de son dossier.
- Sortie du générateur strictement identique (fichiers, manifeste, rapports).
- Un catalogue validé, des messages d'erreur qui nomment le fichier fautif.

**Non-Goals:**
- Modules hors du plugin, versionnement séparé, déplacement des tests transverses.
- Rendre indépendants du dossier du module les permissions de `settings.json`, les étapes de `state.mjs`, les contrôles de `audit.mjs`, les migrations et les blocs `@@module` des fichiers transverses (limite assumée).

## Decisions

1. **Dossier `assets/modules/<nom>/`** avec `module.json`, `templates/`, `templates.<lang>/`, `tests/`. Alternative écartée : garder les arbres de modèles communs et ne répartir que les descripteurs (un module resterait réparti sur deux endroits).
2. **Propriété d'un fichier = le module qui le déclare, `when` = modules supplémentaires.** Condition de génération : module propriétaire et tous les `when` actifs, donc égale à l'ancien `when` complet (propriétaire en tête, doublons et propriétaire cité dans `when` ignorés). **Table de propriété explicite** plutôt qu'une règle mécanique : `core` (6 : `.gitignore`, `.gitattributes`, `CLAUDE.md`, `docs/workflow.md`, `.bootstrap/checks.json`, `.bootstrap/run-checks.mjs`), `claude` (2 hooks), `openspec` (agent `spec-reviewer`, `when: claude`), `archgate` (11 : `.archgate/*`, ARCH-001 à ARCH-005 avec leurs règles, `when` = `arc42`, `openspec` ou `github` selon l'ADR, agent `architecture-explorer`), `arc42` (14 : les 12 sections, `arc42-keeper`, `restrict-path.mjs`), `github` (11 : formulaires dont `architecture-decision.yml` avec `when: archgate`, labels, CI, `project-setup`, scripts, agent `traceability-checker`), `release` (3), `dependabot` (1), `githooks` (1). Les versions anglaises suivent le même propriétaire. Regrouper la série d'ADR dans `archgate` garde un seul espace de numéros `ARCH-NNN`.
3. **`scripts/catalog.mjs`** assemble les descripteurs en un catalogue de même forme que l'ancien (`modules`, `files` avec `when` complet, `merge`, `owned`, dossier source, `languages`). `scaffold.mjs` et les tests s'en servent sans autre changement de logique. Ordre : modules `core` d'abord puis alphabétique ; **fichiers triés par chemin** (déterminisme des rapports, indépendant de l'ordre des dossiers).
4. **Validation stricte** au chargement (code 1, fichier fautif nommé) : descripteur lisible, clés connues, `description` présente, `requires`/`conflicts` vers de vrais modules (un pseudo-module n'y est pas permis), `when` vers des modules ou pseudo-modules, pas d'incompatibilité avec soi-même ni avec un module requis, nom de dossier valide et distinct d'un pseudo-module, modèle présent pour chaque fichier, aucun modèle non déclaré, chemin unique (casse comprise), numéro d'ADR unique, `merge` valide.
5. **Chemins sûrs** : refus des chemins absolus, avec antislash, avec segment vide, `.` ou `..`, des caractères et noms réservés de Windows, d'un point ou d'une espace final ; refus des **chemins réservés au générateur** (`.claude/settings.json`, `package.json`, `.bootstrap/manifest.json`, `.bootstrap/base/**`, `.bootstrap/local/**`, `.git/**`), sinon un module écrirait deux fois le même fichier ; refus de tout lien symbolique dans un dossier de module (jamais suivi). Les dossiers `.x` et `_x` sont ignorés (outillage, brouillons).
6. **Langues** : une langue est disponible si le module `core` a `templates.<lang>/` ; un `templates.<lang>` d'un autre module absent de `core` est refusé (sinon la langue serait disponible avec le reste en français) ; `templates.fr` est refusé ; une version localisée sans modèle de référence dans le même module est refusée. Un modèle localisé oublié retombe sur le français sans erreur : `full-en` et le test de parité sont le filet.
7. **`--list-modules`** remplace le tableau de `SKILL.md` : JSON par défaut (avec les langues), `--format table` pour du markdown (questions comprises) ; il ne demande ni `--target` ni `--config`. Le skill pose à la phase 0 les `questions` des modules choisis (texte ; les réponses ne sont pas enregistrées dans un schéma propre au module). `--catalog <dossier>` désigne un dossier de modules alternatif ; le catalogue est chargé et validé avant toute commande, `--detect` comprise.
8. **Tests de module** : `tests/modules.test.mjs` lance chaque `assets/modules/*/tests/*.test.mjs` (`--root` pour une copie du plugin), échoue en nommant le module ; lancé par `.bootstrap/checks.json`. Les tests existants restent transverses.
9. **Migration par script jetable** (non conservé) : `git mv` des modèles vers leur module (les renommages gardent l'historique), descripteurs générés depuis l'ancien catalogue, puis déplacement des ADR et du formulaire selon la table. Preuves d'identité : instantanés de la matrice inchangés, et comparaison ponctuelle avec l'ancien plugin (`main`) des fichiers, du manifeste et des rapports pour quatre configurations (complète, publique en anglais, mode `local`, `core` seul).
10. **Module de démonstration** : un test copie le plugin, y ajoute un module (descripteur, modèles français et anglais, questions, test), vérifie qu'il est listé, généré (avec et sans son `when`), localisé, que son test est lancé (et qu'un échec est nommé), et que la copie ne diffère que par son dossier. Les instantanés de la matrice sont des artefacts de test regénérés par `UPDATE_SNAPSHOTS=1`, pas des fichiers du plugin.

## Risks / Trade-offs

- Un fichier mal rangé n'est pas détecté par la génération (même chemin) mais l'est par `--list-modules` et la relecture ; `CONTRIBUTING` documente la table de propriété.
- Les fichiers transverses continuent à connaître les autres modules par leurs blocs, et `buildSettings`, `state.mjs`, `audit.mjs` et les migrations par leur nom : un nouveau module qui veut y apparaître les modifie. Seule la génération de **ses** fichiers est indépendante.
- Un refactor de 93 fichiers déplacés : l'historique git suit les renommages ; la matrice, les 380 assertions du générateur et la comparaison avec l'ancien plugin sont le filet.
- Les copies locales du plugin sont remplacées à la mise à jour du plugin.

## Migration Plan

Aucune migration côté projets générés : les fichiers produits sont les mêmes (`--update` et les bases de fusion sont indexés par chemin).

## Open Questions

Aucune.
