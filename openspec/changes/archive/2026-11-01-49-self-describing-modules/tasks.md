## 1. Chargeur et migration

- [x] 1.1 `scripts/catalog.mjs` : découverte de `assets/modules/*/module.json`, validation (champs, références, pseudo-modules, modèles présents et non déclarés, chemin unique à la casse près, numéro d'ADR unique, chemins sûrs et réservés, liens symboliques, langues fournies par `core`), assemblage trié par chemin.
- [x] 1.2 Migration (script jetable) : `git mv` des 50 modèles français et 43 anglais vers `assets/modules/<propriétaire>/templates*/`, descripteurs depuis `modules.json`, ADR d'outillage dans `archgate` et formulaire d'ADR dans `github`, suppression de `assets/modules.json` et des arbres communs.
- [x] 1.3 `scaffold.mjs` : catalogue via le chargeur, modèle lu dans le dossier du module (`templates.<lang>` puis `templates`), langues du catalogue, `--catalog <dossier>`, `--list-modules` (JSON, `--format table`) sans `--target`, validation avant toute commande.

## 2. Skill et documentation

- [x] 2.1 `SKILL.md` : le tableau des modules est remplacé par `--list-modules` ; la phase 0 pose les `questions` des modules choisis.
- [x] 2.2 `CONTRIBUTING.md` (format d'un module, table de propriété, chemins réservés, limites, procédure d'ajout, procédure d'ajout d'une langue), `README.md`, `CLAUDE.md`, `references/versioning.md`, `references/bootstrap-config.md`, ADR ARCH-008 (organisation par module), ADR ARCH-010.
- [x] 2.3 arc42 par `arc42-keeper` (sections 4, 5, 8, 11).

## 3. Tests

- [x] 3.1 `tests/scaffold.test.mjs` et `tests/matrix.test.mjs` : catalogue via le chargeur (importé, `--catalog` désormais un dossier, copies du plugin qui modifient un descripteur ou un modèle par assistants `templateIn` / `dropFile` / `addFile`), import de `sync-labels.mjs` depuis le module `github`, hook et agents retrouvés dans leurs modules pour chaque langue, parité fichier par fichier, `NO_BASE` de la matrice depuis le catalogue assemblé ; instantanés inchangés.
- [x] 3.2 Chargeur : chaque cause de refus (descripteur illisible, clé inconnue, `description` absente, références inconnues, pseudo-module dans `requires`, conflits, modèle manquant ou non déclaré, chemin dupliqué, casse, `core` absent, `when` inconnu, `merge`, chemins réservés, chemins invalides, numéro d'ADR dupliqué, dossier pseudo-module, nom de dossier invalide, langue absente de `core`, `templates.fr`, version localisée orpheline, lien symbolique), `when` toléré, catalogue réel (12 modules, triés, propriétaires, langues).
- [x] 3.3 `--list-modules` (JSON, tableau, sans `--target`, `--catalog` invalide, `--detect` avec catalogue invalide) et module de démonstration dans une copie du plugin (listé, généré avec et sans son `when`, localisé, test lancé, échec nommé, seul son dossier ajouté).
- [x] 3.4 `tests/modules.test.mjs` et son entrée dans `.bootstrap/checks.json`.
- [x] 3.5 Comparaison ponctuelle avec l'ancien plugin : fichiers, manifeste et rapports identiques pour quatre configurations.
- [x] 3.6 `node .bootstrap/run-checks.mjs`, `openspec validate --all --strict --no-interactive`, `archgate check`, `node .claude/hooks/quality-gate.mjs`.

## 4. Livraison

- [x] 4.1 Archiver le changement, renseigner le `Purpose` de `module-catalog`, ouvrir la PR `feat(scaffold): self-describing module folders` avec `Closes #49`.
