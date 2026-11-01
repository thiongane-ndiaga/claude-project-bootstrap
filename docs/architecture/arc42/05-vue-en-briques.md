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

## Briques liées à la reprise

- `skills/project-bootstrap/scripts/state.mjs` : commandes `init`, `config`, `step`, `show`, `next`, `resume`, `effect`, `effects [--undo]` ; écrit `state.json` et `effects.json` (format versionné) dans `.bootstrap/local/`, dont le `.gitignore` vaut `*`. Réponses en JSON ; n'exécute jamais une action ni son annulation.
- `skills/project-bootstrap/scripts/scaffold.mjs` : `--detect` rapporte `resumable` ; la génération laisse l'état intact.
- `skills/project-bootstrap/SKILL.md` : appelle `resume` en début de session, `step` avant chaque étape et `effect` avant chaque action globale.
- `tests/state.test.mjs` : arrêt simulé après chaque étape, preuves réelles, journal, liste blanche des clés, état intact après `scaffold.mjs`.

Voir [ARCH-009](../adrs/ARCH-009-etat-de-reprise-et-journal-des-effets.md).

_Le reste de la section reste à rédiger._
