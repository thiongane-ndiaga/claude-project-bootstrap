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
- `skills/project-bootstrap/assets/modules/jenkins/templates{,.en}/Jenkinsfile`  (module `jenkins`) : en mode `local`, `npm ci` et `node_modules/.bin` en tête du `PATH` ; en `global` et `user`, `npm install -g --prefix "$WORKSPACE/.ci-tools"` à la version épinglée et `.ci-tools/bin` en tête du `PATH` (décision 6).

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

- `skills/project-bootstrap/assets/modules/agent-profiles/` : le module ; quatre profils par défaut, `architect`, `qa-engineer`, `developer` et `project-lead`, et des profils optionnels (`product-owner`, `business-analyst`, et cinq profils en lecture seule : `acceptance-tester`, `scout`, `second-opinion`, `devops-engineer` et `compliance-reviewer`), générés dans `.claude/agents/`, avec des références conditionnelles aux autres modules (blocs `@@module`).
- Clé de configuration `profiles` (liste de noms de profils optionnels) : seuls les profils listés sont générés ; absente, aucun ; `[]` ou `null` la désactive (ni héritée ni consignée). Un nom inconnu, une valeur qui n'est pas une liste ou la clé sans le module `agent-profiles` font échouer `scaffold.mjs`. La liste est consignée au manifeste triée et sans doublon, et héritée par `--update`. Chaque profil a un pseudo-module `profile-<nom>`, cité dans le `when` de son fichier ; `business-analyst` exige le module `openspec`. Retirer un profil le signale (`retired`) sans supprimer son fichier.
- Profils `devops-engineer` et `compliance-reviewer` : `devops-engineer` (`sonnet`) lit la CI, les PR et les releases ; la traçabilité est renvoyée à `qa-engineer`. `compliance-reviewer` (`opus`) relit specs et ADR face aux exigences d'un domaine réglementé et exige la clé `regulatedDomain`.
- Clé de configuration `regulatedDomain` (texte libre) : posée par une question de phase 0, validée par liste blanche de caractères, injectée dans le corps du profil `compliance-reviewer` seulement (jamais dans le frontmatter) et donc visible dans le dépôt. Sans le profil, elle est sans effet et `scaffold.mjs` avertit. `null` la désactive ; elle est héritée par `--update` et conservée dans l'état de reprise.
- `.claude/agents/project-lead.md` : chef de projet, toujours généré (français et anglais), hors de la table `PROFILES`. Il est un orchestrateur : il ne produit ni code ni spec, déclare `disallowedTools` (`Write`, `Edit`, `MultiEdit`, `NotebookEdit`) et garde `Bash` (l'effet de `disallowedTools` sur l'agent principal n'est pas vérifié). Il délègue à `architect`, `qa-engineer` et `developer`, et à `acceptance-tester`, `scout`, `second-opinion`, `devops-engineer` et `compliance-reviewer` lorsque ces profils existent, archive par `openspec archive <id> --yes`, et porte dans son prompt l'échelle d'arbitrage et les règles de sécurité. Sans `business-analyst`, `developer` rédige les specs.
- Clé de configuration facultative `mainAgent` (seule valeur : `project-lead`) : présente, `buildSettings` écrit `"agent": "project-lead"` dans `.claude/settings.json` ; absente, aucune clé `agent`. Elle est consignée au manifeste seulement si présente, héritée par `--update`, et refusée sans le module `agent-profiles`. Aucun champ `conflicts` avec `archgate-plugin`.
- `.claude/hooks/profile-guard.mjs` (modèle du module) : hook unique de bornage. Il porte la table `PROFILES` (préfixes d'écriture, commandes de shell, agents et skills lançables permis par profil) que le projet adapte à sa stack.
- `.claude/settings.json` : `buildSettings` y déclare le hook (événement `PreToolUse`) quand le module est actif ; le fichier reste réservé au générateur.
- `.claude/hooks/read-only-bash.mjs` (module `claude`) : `profile-guard.mjs` lui délègue la lecture seule du shell. Le module `agent-profiles` dépend donc de `claude` pour ce seul fichier ; il ne dépend pas de `restrict-path.mjs`, qui appartient à `arc42`.
- Agents historiques (`architecture-explorer`, `arc42-keeper`, `spec-reviewer`, `traceability-checker`) et hook `restrict-path.mjs` (propre à `arc42-keeper`) : générés seulement sans le module `agent-profiles`, par le pseudo-module `legacy-agents` (actif quand `agent-profiles` est absent) cité dans le `when` de leurs fichiers. Avec `agent-profiles`, ni `architect` ni `qa-engineer` n'a d'agent lançable ; leurs méthodes sont quatre skills de projet (ci-dessous).
- Skills de méthode : le module génère dans `.claude/skills/<nom>/SKILL.md` (`templates{,.en}/`) `adr-options-comparison` (condition : `archgate`), `arc42-update` (`arc42`), `spec-review` (`openspec`) et `pr-readiness-review` (`github`). `architect` lance les deux premières, `qa-engineer` les deux autres (il reçoit l'outil `Skill`) ; elles figurent dans la table `PROFILES` du hook. Le corps du profil dit quand les lancer ; le champ `skills` du frontmatter n'est pas utilisé. Une skill permise mais non générée (module absent) est sans effet.
- `skills/project-bootstrap/migrations/0003-absorb-legacy-agents.mjs` : dans un projet déjà généré avec `agent-profiles`, retire ces fichiers (et `restrict-path.mjs` s'il n'est cité par aucun autre fichier de `.claude/`) seulement s'ils sont égaux à leur copie de `.bootstrap/base` ; un fichier modifié ou sans copie est conservé et signalé par une note.
- `tests/matrix.test.mjs` : la combinaison `full-legacy` (tous les modules sauf `agent-profiles` et `advisor`) couvre la génération des anciens agents ; `tests/scaffold.test.mjs` teste la migration.
- Module `advisor` (`requires: agent-profiles`, `default: false`) : sans fichier propre, comme `agent-teams`. Une question de phase 0 pose la clé de configuration `advisor` (`true`), à laquelle correspond le pseudo-module `advisor-on`. Son contenu tient dans des blocs `@@module:advisor-on` : la consigne de consulter l'advisor, portée par les profils dont le modèle est `sonnet` ou `haiku` (`product-owner`, `developer`, `business-analyst`, `acceptance-tester`, `scout`, `devops-engineer`) et non par `architect`, `qa-engineer` ni `project-lead`, et l'étape optionnelle « Advisor » du « Nouveau poste » de `docs/workflow.md` (module `core`). Un test vérifie la cohérence de cette consigne avec le `model:` de chaque profil. Le plugin n'écrit aucun réglage `advisorModel` et ne définit jamais `DISABLE_TELEMETRY` ([ARCH-015](../adrs/ARCH-015-le-plugin-n-ecrit-pas-de-reglage-payant-ou-experimental.md)).
- Frontmatter des agents générés : les agents générés (les profils `architect`, `qa-engineer`, `product-owner`, `developer`, `business-analyst`, `acceptance-tester`, `scout`, `second-opinion`, `devops-engineer`, `compliance-reviewer`, et les quatre agents historiques quand `legacy-agents` est actif) déclarent `model`, `effort` et `maxTurns` avec des valeurs fixes, sans clé de configuration ; `project-lead`, agent principal, suit la session. La table est dans `skills/project-bootstrap/references/pitfalls.md`, le coût dans [ARCH-015](../adrs/ARCH-015-le-plugin-n-ecrit-pas-de-reglage-payant-ou-experimental.md). Un test génère tous les modules et profils et valide le frontmatter de chaque `.claude/agents/*.md` (champs documentés, `effort`, `maxTurns`, nommage).
- `skills/project-bootstrap/assets/modules/agent-profiles/tests/profile-guard.test.mjs` : teste la table avec un `agent_type` de sous-agent et de teammate ; `tests/matrix.test.mjs` vérifie les profils et la déclaration dans `settings.json`.

Voir [ARCH-011](../adrs/ARCH-011-profils-d-agents-bornes-par-un-hook-unique.md), [ARCH-012](../adrs/ARCH-012-agents-skills-et-commandes-lancables-par-un-profil.md), [ARCH-013](../adrs/ARCH-013-chef-de-projet-comme-agent-principal-active-par-mainagent.md), [ARCH-014](../adrs/ARCH-014-profils-optionnels-choisis-par-la-cle-profiles.md) et [ARCH-016](../adrs/ARCH-016-les-profils-absorbent-les-agents-historiques.md) (absorption des agents historiques, skills de méthode, migration).

## Briques liées à la persistance après compaction

- Module `compact-recall` (`requires: claude`, `default: false`) : sans clé de configuration ni question de phase 0. Il apporte un seul fichier, `skills/project-bootstrap/assets/modules/compact-recall/templates{,.en}/.claude/hooks/compact-recall.mjs`.
- `skills/project-bootstrap/scripts/scaffold.mjs` : `buildSettings` déclare, quand le module est actif, un hook `SessionStart` à matcher `compact`, placé après l'entrée du mode local (`session-path.mjs`).
- `skills/project-bootstrap/assets/modules/compact-recall/tests/compact-recall.test.mjs` : exécute le hook ; `tests/matrix.test.mjs` vérifie la déclaration dans `settings.json`.

Voir [ARCH-013](../adrs/ARCH-013-chef-de-projet-comme-agent-principal-active-par-mainagent.md) et [ARCH-010](../adrs/ARCH-010-modules-auto-decrits.md).

_Le reste de la section reste à rédiger._

## Briques liées à Jenkins

- Module `jenkins` (`requires: github`, `default: false`) : sans clé de configuration ni question de phase 0. Il apporte `skills/project-bootstrap/assets/modules/jenkins/templates{,.en}/Jenkinsfile`, `scripts/jenkins-setup.sh` (`owned`) et `docs/jenkins.md`.
- `Jenkinsfile` : mêmes étapes dans le même ordre, mêmes blocs `@@module` et mêmes paramètres de version que `.github/workflows/ci.yml`, qui est la CI de référence ; `scripts/check-pr-title.mjs` (module `github`) est réutilisé. Sa chaîne d'outils vient de `scripts/jenkins-setup.sh`, fichier du projet.
- `skills/project-bootstrap/assets/modules/jenkins/tests/jenkins.test.mjs` : exécute le script de l'étape `Node` et compare commandes et versions à `ci.yml` ; `tests/scaffold.test.mjs` couvre la génération, le conflit et `--update` ; `tests/matrix.test.mjs` les combinaisons `jenkins` et `jenkins-cli-local`.

Voir [ARCH-007](../adrs/ARCH-007-installation-des-cli-d-outillage.md) et [ARCH-010](../adrs/ARCH-010-modules-auto-decrits.md).

## Briques liées à Sonar

- Module `sonar` (`requires: github`, `default: false`) : apporte `sonar-project.properties` (`owned`), `docs/sonar.md` et le bloc `@@module:sonar` de `.github/workflows/ci.yml` (job `sonar` sur `ubuntu-latest`, action `SonarSource/sonarqube-scan-action`). Le service (SonarCloud ou serveur) est externe.
- Clé de configuration `sonar` (`cloud` ou `server`) : absente, `cloud` (non consignée) ; toute autre valeur, ou la clé sans le module `sonar`, fait échouer `scaffold.mjs`. Elle est héritée du manifeste par `--update` ; `sonar: null` la retire.
- Pseudo-modules `sonar-cloud` et `sonar-server`, dérivés de cette clé et cités dans les blocs `@@module` de `ci.yml` et de `sonar-project.properties` (`sonar.organization` en `cloud`, `SONAR_HOST_URL` et analyse limitée à `push` en `server`).
- Épinglage : `resolve-versions.mjs` résout et consigne toujours `actions.sonarScan` comme les autres actions ; sans elle dans la configuration, la génération échoue quand `sonar` est actif.
- `skills/project-bootstrap/assets/modules/sonar/tests/sonar.test.mjs` : tests du module ; les cas de `--update` et le refus de la clé sont dans `tests/scaffold.test.mjs`, les combinaisons `sonar` et `sonar-server` dans `tests/matrix.test.mjs`.

Voir [ARCH-004](../adrs/ARCH-004-github-comme-forge-avec-actions-et-releases.md) et [ARCH-010](../adrs/ARCH-010-modules-auto-decrits.md).

## Briques liées à Jira

- Module `jira` (`requires: github`, `default: false`) : apporte `scripts/check-jira-key.mjs`, `docs/jira.md` (avec la table de lecture) et le champ facultatif « Clé Jira » des formulaires d'issues. Le Jira lui-même est externe.
- Deux clés de configuration, refusées sans le module `jira`, héritées du manifeste par `--update` et retirées par `null` (la reprise de session les conserve, `state.mjs`) : `jira` (clé de projet) et `jiraSource` (`github` ou `jira` ; absente, `github`).
- Deux pseudo-modules complémentaires, déclarés dans `catalog.mjs` : `jira-source` (actif quand `jiraSource` vaut `jira`) et `issue-source` (actif sinon, y compris sans le module, ce qui laisse les textes `Closes #N` inchangés). Ils portent les paramètres `JIRA_KEY_RE` et `JIRA_KEY_EXAMPLE`.
- `scripts/check-jira-key.mjs` : étape du job `pr-title` de `.github/workflows/ci.yml`, après `scripts/check-pr-title.mjs` (module `github`).
- Fichiers à variantes `jira-source` / `issue-source` : gabarit de PR, formulaires d'issues, `docs/workflow.md`, `CLAUDE.md`, `traceability-checker`, skills `pr-readiness-review` et `spec-review`, agent `spec-reviewer`, `openspec-config.md`, ADR générés ARCH-002, ARCH-003 et ARCH-005.
- Tests : tests du module dans `skills/project-bootstrap/assets/modules/jira/tests/` ; refus des clés, `--update` et reprise dans `tests/scaffold.test.mjs` et `tests/state.test.mjs` ; combinaisons de la matrice dans `tests/matrix.test.mjs`.

Voir [ARCH-017](../adrs/ARCH-017-source-du-besoin-github-ou-jira-au-choix-par-projet.md), [ARCH-005](../adrs/ARCH-005-conventions-de-branches-commits-et-versionnement.md) et [ARCH-010](../adrs/ARCH-010-modules-auto-decrits.md).
