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

## Briques liées aux modules

- `skills/project-bootstrap/assets/modules/<nom>/` : un module ; `module.json` (description, `requires`, `default`, `conflicts`, `questions`, `files`), `templates/`, `templates.<lang>/`, `tests/*.test.mjs`. Le dossier `core` est obligatoire.
- `skills/project-bootstrap/scripts/catalog.mjs` : découvre les dossiers, valide les descripteurs (messages qui nomment le fichier fautif) et assemble le catalogue.
- `skills/project-bootstrap/scripts/scaffold.mjs` : utilise le chargeur ; `--list-modules` produit le tableau des modules.
- `tests/modules.test.mjs` : lance les tests de chaque module ; `tests/scaffold.test.mjs` valide le chargeur et `tests/matrix.test.mjs` la matrice.
- Hors du dossier d'un module : permissions de `.claude/settings.json` (`buildSettings`), étapes de `state.mjs`, contrôles de `audit.mjs`, migrations, blocs `@@module` des fichiers transverses.

Voir [ARCH-010](../adrs/ARCH-010-modules-auto-decrits.md).

## Briques liées à `docLanguage`

- `skills/project-bootstrap/assets/modules/<nom>/templates/` : modèles de référence (français).
- `skills/project-bootstrap/assets/modules/<nom>/templates.<code>/` (ex. `templates.en/`) : version traduite, mêmes chemins de fichiers ; un fichier absent est lu dans `templates/` du même module.
- `skills/project-bootstrap/scripts/scaffold.mjs` : déduit les langues disponibles des dossiers `templates.*` du module `core`, refuse une langue indisponible, résout les paramètres textuels dans une table par langue et consigne `config.docLanguage` au manifeste seulement si la clé est présente ; `--update` reprend la langue du manifeste.
- `tests/scaffold.test.mjs` (parité) et `tests/matrix.test.mjs` (combinaisons `default-en` et `full-en`, instantanés dans `tests/snapshots/`).

Voir [ARCH-008](../adrs/ARCH-008-modeles-de-documentation-par-langue.md).

## Briques liées à la reprise

- `skills/project-bootstrap/scripts/state.mjs` : commandes `init`, `config`, `step`, `show`, `next`, `resume`, `effect`, `effects [--undo]` ; écrit `state.json` et `effects.json` (format versionné) dans `.bootstrap/local/`, dont le `.gitignore` vaut `*`. Réponses en JSON ; n'exécute jamais une action ni son annulation.
- `skills/project-bootstrap/scripts/scaffold.mjs` : `--detect` rapporte `resumable` ; la génération laisse l'état intact.
- `skills/project-bootstrap/SKILL.md` : appelle `resume` en début de session, `step` avant chaque étape et `effect` avant chaque action globale.
- `tests/state.test.mjs` : arrêt simulé après chaque étape, preuves réelles, journal, liste blanche des clés, état intact après `scaffold.mjs`.

Voir [ARCH-009](../adrs/ARCH-009-etat-de-reprise-et-journal-des-effets.md).

## Briques liées aux profils d'agents

- `skills/project-bootstrap/assets/modules/agent-profiles/` : le module ; trois profils, `architect`, `qa-engineer` et `project-lead`, générés dans `.claude/agents/`, avec des références conditionnelles aux autres modules (blocs `@@module`).
- `.claude/agents/project-lead.md` : chef de projet, toujours généré (français et anglais), hors de la table `PROFILES`. Il délègue à `architect` et `qa-engineer` et porte dans son prompt l'échelle d'arbitrage et les règles de sécurité.
- Clé de configuration facultative `mainAgent` (seule valeur : `project-lead`) : présente, `buildSettings` écrit `"agent": "project-lead"` dans `.claude/settings.json` ; absente, aucune clé `agent`. Elle est consignée au manifeste seulement si présente, héritée par `--update`, et refusée sans le module `agent-profiles`. Aucun champ `conflicts` avec `archgate-plugin`.
- `.claude/hooks/profile-guard.mjs` (modèle du module) : hook unique de bornage. Il porte la table `PROFILES` (préfixes d'écriture, commandes de shell, agents et skills lançables permis par profil) que le projet adapte à sa stack.
- `.claude/settings.json` : `buildSettings` y déclare le hook (événement `PreToolUse`) quand le module est actif ; le fichier reste réservé au générateur.
- `.claude/hooks/read-only-bash.mjs` (module `claude`) : `profile-guard.mjs` lui délègue la lecture seule du shell. Le module `agent-profiles` dépend donc de `claude` pour ce seul fichier ; il ne dépend pas de `restrict-path.mjs`, qui appartient à `arc42`.
- Agents existants du module `claude` (`architecture-explorer`, `arc42-keeper`, `spec-reviewer`, `traceability-checker`) : inchangés ; ils coexistent avec les profils, dont `architect` qui écrit aussi dans `docs/architecture/arc42/`.
- `skills/project-bootstrap/assets/modules/agent-profiles/tests/profile-guard.test.mjs` : teste la table avec un `agent_type` de sous-agent et de teammate ; `tests/matrix.test.mjs` vérifie les profils et la déclaration dans `settings.json`.

Voir [ARCH-011](../adrs/ARCH-011-profils-d-agents-bornes-par-un-hook-unique.md) et [ARCH-013](../adrs/ARCH-013-chef-de-projet-comme-agent-principal-active-par-mainagent.md).

_Le reste de la section reste à rédiger._
