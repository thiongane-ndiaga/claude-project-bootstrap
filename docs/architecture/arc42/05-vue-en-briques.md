# 5. Vue en briques

> Décomposition statique du système en briques (modules, composants) et leurs dépendances.

## 5.1 Niveau 1 — système global
- Quelles briques composent le système et quelle est la responsabilité de chacune ?
- Quelles interfaces exposent-elles ?

## 5.2 Niveaux suivants
- Quelles briques méritent d'être détaillées, et pourquoi ?

## Briques liées à `cliInstall`

- `skills/project-bootstrap/scripts/scaffold.mjs` : génère, en mode `local`, le `package.json` du projet (propre au projet, sans `name`) et consigne `config.cliInstall` au manifeste ; la clé est absente en mode `global`.
- `.claude/hooks/quality-gate.mjs` (modèle) : ajoute `node_modules/.bin` au `PATH` en mode `local`.
- `.github/workflows/ci.yml` (modèle) : idem ; les versions viennent de `package.json` en `local`.
- `skills/project-bootstrap/scripts/audit.mjs` : idem, et contrôle `--workstation`.

Voir [ARCH-007](../adrs/ARCH-007-installation-des-cli-d-outillage.md).

## Briques liées à `docLanguage`

- `skills/project-bootstrap/assets/templates/` : modèles de référence (français).
- `skills/project-bootstrap/assets/templates.<code>/` (ex. `templates.en/`) : version traduite, mêmes chemins de fichiers ; un fichier absent est lu dans `assets/templates/`.
- `skills/project-bootstrap/scripts/scaffold.mjs` : déduit les langues disponibles des dossiers `templates.*`, refuse une langue indisponible, résout les paramètres textuels dans une table par langue et consigne `config.docLanguage` au manifeste seulement si la clé est présente ; `--update` reprend la langue du manifeste.
- `tests/scaffold.test.mjs` (parité) et `tests/matrix.test.mjs` (combinaisons `default-en` et `full-en`, instantanés dans `tests/snapshots/`).

Voir [ARCH-008](../adrs/ARCH-008-modeles-de-documentation-par-langue.md).

_Le reste de la section reste à rédiger._
