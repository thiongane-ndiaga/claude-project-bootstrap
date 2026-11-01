## 1. Générateur

- [x] 1.1 `scaffold.mjs` : lire `docLanguage` (défaut `fr`), langues disponibles (`fr` + dossiers `templates.*` hors `templates.fr`), refuser une langue indisponible (code 1, langues listées), ne consigner la clé que si elle est présente.
- [x] 1.2 `scaffold.mjs` : lecture d'un modèle dans `templates.<lang>/` avec repli sur `templates/` ; table de paramètres par langue (`VISIBILITY_LABEL`, `CI_OS_TEXT`, `CI_BLOCKING_NOTE`, note de crédit et `DOC_LANGUAGE_NAME` par défaut).
- [x] 1.3 Renommer `VISIBILITY_FR` et `CI_OS_FR` dans ARCH-004 (sortie française et instantanés inchangés).
- [x] 1.4 `--update` : `docLanguage` et `cliInstall` hérités du manifeste quand `--config` ne les définit pas ; `--detect` expose `languages` et la langue/le mode du manifeste.

## 2. Modèles anglais

- [x] 2.1 `templates.en/` : `CLAUDE.md`, `docs/workflow.md`, `.gitignore`, `.gitattributes`, `.github/pull_request_template.md`, formulaires d'issues (`architecture-decision`, `bug`, `feature`), `labels.json`, `ci.yml`, `dependabot.yml`, `project-setup/action.yml`.
- [x] 2.2 `templates.en/` : ADR ARCH-001 à ARCH-005 (`.md`), règles `.rules.ts` d'ARCH-001, ARCH-003 (statuts et section anglais) et ARCH-004, sections arc42 01 à 12.
- [x] 2.3 `templates.en/` : agents `arc42-keeper`, `architecture-explorer`, `spec-reviewer`, `traceability-checker`.
- [x] 2.4 `templates.en/` : `quality-gate`, `read-only-bash`, `restrict-path`, `run-checks`, `check-pr-title`, `sync-labels`, `pre-push`.

## 3. Skill et documentation

- [x] 3.1 `SKILL.md` : langues disponibles à la phase 0, retrait de la traduction (phase 2), `openspec init --language <code>`, section de statut des ADR selon la langue (phase 4) ; `bootstrap-config.md` (`docLanguage`, `docLanguageName` à omettre).
- [x] 3.2 `CONTRIBUTING.md` : parité, ajout d'une langue, règle « modifier les deux versions dans la même PR », ce qui n'est pas traduit.
- [x] 3.3 ADR ARCH-008 (fait) ; arc42 par `arc42-keeper`.

## 4. Tests

- [x] 4.1 `tests/scaffold.test.mjs` : clé absente, langue indisponible, anglais généré (texte, libellé `private`, aucun résidu accentué), mêmes chemins fr/en, reproductibilité, `docLanguageName` explicite prioritaire, héritage à `--update` (langue et mode), `--detect`.
- [x] 4.2 Parité : marqueurs, paramètres, squelette de code (regex conservées pour les scripts), YAML, JSON, titres, accents, orphelins ; le test détecte chaque sorte d'écart.
- [x] 4.3 Comportement des scripts anglais : hook lecture seule, `restrict-path`, `check-pr-title`, `sync-labels` ; agents anglais en lecture seule ne citant que des commandes acceptées.
- [x] 4.4 `tests/matrix.test.mjs` : `default-en` et `full-en` (valeurs françaises de la base retirées), dénombrement, instantanés, validation par les CLI réelles de `full-en` ; aucun instantané existant ne change.
- [x] 4.5 `node .bootstrap/run-checks.mjs`, `openspec validate --all --strict --no-interactive`, `archgate check`.

## 5. Livraison

- [x] 5.1 Archiver le changement, renseigner le `Purpose` de `doc-languages`, ouvrir la PR `feat(templates): english templates and doc language setting` avec `Closes #48`.
