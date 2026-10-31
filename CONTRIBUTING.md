# Contribuer

## Avant de commencer
- Ouvre une issue (formulaire « Bug » ou « Fonctionnalité ») avant toute modification importante.
- Une PR par issue, depuis une branche `<type>/<issue>-<slug>` (ex. `fix/16-npm-prefix`).

## Conventions
- **Commits et titres de PR** : Conventional Commits, en anglais (`feat`, `fix`, `docs`, `chore`, …). Squash merge : le titre de la PR devient le message du commit.
- **Langue** : documentation, issues et descriptions de PR en français ; identifiants, noms de fichiers techniques, branches et commits en anglais.
- **Aucun nom de projet extérieur** (client, employeur, dépôt privé) dans les fichiers, issues, PR ou messages de commit.
- **Modèles** (`skills/project-bootstrap/assets/templates/`) : blocs conditionnels `@@module:…` et paramètres `{{…}}`. Toute modification de modèle incrémente la version dans `.claude-plugin/plugin.json` (le cache du plugin est indexé par cette version).
- Un piège découvert à l'usage va dans `skills/project-bootstrap/references/pitfalls.md`.

## Vérifier avant d'ouvrir la PR
```
node tests/scaffold.test.mjs
```
Node.js ≥ 20.19. Les tests doivent passer sous Linux, Windows et macOS (séparateurs de chemins, fins de ligne, bit exécutable).

## Licence
En contribuant, tu acceptes que ta contribution soit publiée sous la licence MIT du dépôt (`LICENSE`).
