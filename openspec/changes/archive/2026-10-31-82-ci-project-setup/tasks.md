## 1. Modèles, catalogue et règle d'épinglage

- [x] 1.1 Ajouter le modèle `.github/actions/project-setup/action.yml` (composite, une étape `shell: bash`) et son entrée `owned` du module `github` dans `modules.json` ; tests : fichier créé, statut `kept`, modèle valide (`name`, `description`, `composite`, `shell` par étape `run`), jamais touché ni signalé après personnalisation et changement du modèle, recréé s'il est supprimé, absent sans le module `github`.
- [x] 1.2 Remplacer le commentaire d'installation du modèle `ci.yml` par l'appel `./.github/actions/project-setup` avant « Commandes du projet » ; test : l'appel est après `actions/checkout` et avant l'étape des commandes, et les noms de jobs `plan`, `checks`, `pr-title` sont inchangés.
- [x] 1.3 Mettre à jour le modèle `docs/workflow.md` (section « Commandes du projet ») pour désigner `project-setup` ; test : le texte généré cite l'action.
- [x] 1.4 Adapter la règle d'épinglage d'ARCH-004 (modèle et ce dépôt) : `./…` accepté, `.github/actions/` couvert ; `archgate check` passe sur ce dépôt avec l'action locale, et le test d'épinglage des modèles tolère `./…`.

## 2. Migration, documentation et ce dépôt

- [x] 2.1 Tests de migration : `ci.yml` resté tel que généré (`updated`, action `created`), modifié loin (`reconciled`), modifié à l'emplacement remplacé ou sans base (`conflicts`, code 3, action créée), deuxième mise à jour sans effet.
- [x] 2.2 Documenter dans `references/versioning.md` le point d'extension, la migration (D4) et le rappel de relire `ci.yml` après `reconciled`.
- [x] 2.3 Mettre à jour ce dépôt avec l'outil (`scaffold.mjs --update`) : `ci.yml`, action `project-setup`, `docs/workflow.md`, bases de fusion ; `node .claude/hooks/quality-gate.mjs` renvoie 0.

## 3. Vérification en CI

- [x] 3.1 Pousser la branche : la CI de la PR exécute `project-setup` sur ubuntu, windows et macos et les trois checks `checks (<système>)` sont verts ; consigner le résultat dans ARCH-006 (Risks) et dans #82.

## Workflow follow-up
- `/opsx:archive` dans la PR, avant le merge. PR avec `Refs #82` : le reste de #82 (`CLAUDE.md`, `--detect`) demeure ouvert.
