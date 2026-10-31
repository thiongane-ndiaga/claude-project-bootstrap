---
name: project-bootstrap
description: Met en place, dans un dépôt neuf ou déjà existant, un outillage de développement assisté par IA complet et modulaire — Claude Code (CLAUDE.md, settings, hooks Node, agents), OpenSpec (spec-driven), Archgate (ADR exécutables), arc42, GitHub Free (formulaires d'issues, template de PR, labels, CI, Projects) et release-please — avec un workflow documenté de l'issue à la release, portable Windows/Linux, sans choisir de stack. À utiliser dès que l'utilisateur veut démarrer un nouveau projet avec ce workflow, initialiser/bootstrapper un dépôt avec ce workflow, recréer cette configuration ailleurs, ajouter une de ces briques (OpenSpec, Archgate, arc42, release-please, agents de revue) à un dépôt qui ne l'a pas encore, ou reconfigurer / compléter / mettre à jour un dépôt déjà bootstrappé (ajouter un module, changer la configuration, passer à une nouvelle version du plugin) — même s'il ne nomme pas le skill.
---

# project-bootstrap

Recrée l'outillage d'un projet piloté par Claude Code : la stack applicative n'est **jamais** choisie ici (ce sera l'objet d'ADR du projet) ; Node.js n'est qu'un prérequis d'outillage.

Travaille en phases et arrête-toi à chaque **[STOP]** pour obtenir une validation explicite. L'utilisateur garde la main sur tout ce qui est global à sa machine ou visible à l'extérieur (installations globales, `archgate login`, toute écriture sur GitHub).

Lis `references/pitfalls.md` avant la phase 2 : chaque piège qui y figure a déjà coûté du temps.

## Modules

Le catalogue fait foi : `assets/modules.json` (dépendances `requires`, incompatibilités `conflicts`, fichiers, valeurs par défaut). Aucun module n'est incompatible avec un autre pour l'instant ; un module qui déclare `conflicts: ["x"]` ne peut pas être sélectionné avec `x`, et `scaffold.mjs` refuse la configuration (code de sortie 2, aucun fichier écrit).

| Module | Apporte | Requiert | Incompatible avec |
|---|---|---|---|
| `core` (toujours) | `.gitignore`, `.gitattributes`, `CLAUDE.md`, `docs/workflow.md` | — | — |
| `claude` | `.claude/settings.json`, hooks Node, agents du projet | — | — |
| `openspec` | `openspec init` + conventions `<issue>-<slug>` | — | — |
| `archgate` | `.archgate/`, ADR d'outillage + règles dans `docs/architecture/adrs/` | — | — |
| `archgate-plugin` | plugin Claude Code d'Archgate (compte Archgate) | archgate, claude | — |
| `arc42` | 12 sections avec questions-guides | — | — |
| `github` | formulaires d'issues, template de PR, labels, `ci.yml`, dépôt | — | — |
| `release` | release-please (changelog, SemVer, tags, Releases) | github | — |
| `projects` | tableau GitHub Projects | github | — |
| `githooks` | `pre-push` Node qui rejoue le contrôle qualité | claude | — |
| `agent-teams` | flag expérimental dans `.claude/settings.local.json` | claude | — |

Les agents générés dépendent des modules : `spec-reviewer` (openspec), `traceability-checker` (github), `architecture-explorer` (archgate), `arc42-keeper` (arc42).

## Dépôt existant ou déjà bootstrappé

`scaffold.mjs` écrit `.bootstrap/manifest.json` (version du plugin, modules, réponses de la phase 0 et empreinte de chaque fichier généré) : il se commite avec le reste. Sur un dépôt qui a déjà du contenu, les mêmes phases s'appliquent, avec ces règles :

| Situation du fichier | Action |
|---|---|
| absent | créé |
| identique au modèle | rien |
| resté tel que généré (empreinte du manifeste) | remplacé par le modèle actuel (ex. `ci.yml` quand on ajoute un module) |
| `.gitignore`, `.gitattributes`, `.claude/settings.json`, `.archgate/config.json` | **fusionné** avec l'existant : règles ajoutées, clés et tableaux réunis, rien retiré |
| modifié par le projet, ou déjà présent sans manifeste | **conflit** signalé (code 3), diff avec `--diff`, jamais écrasé |
| listé dans `keep` de `bootstrap.json` | conservé tel quel et consigné |

- **Ajouter un module** : relance avec `modules` complété ; seuls les fichiers du module sont créés, les fichiers non modifiés sont mis à jour, les fichiers personnalisés restent intacts. Le retrait d'un module n'est pas géré (suppression de fichiers : à faire à la main).
- **Dépôt déjà équipé** (CI, linter, `CLAUDE.md`, formulaires) : pour chaque conflit, propose conserver (`keep`), remplacer ou fusionner à la main, et consigne la décision dans `keep`. Ne duplique pas une CI existante : propose de brancher les commandes du projet dans `.bootstrap/checks.json`.
- **Phase 1 [STOP]** obligatoire avant de modifier un fichier existant : présente le dry-run (`--dry-run --diff`) fichier par fichier.
- La mise à jour d'un projet vers une nouvelle version du plugin : phase 5.

## Phase 0 — Cadrage

1. Inspecte le dossier cible avec `node scripts/scaffold.mjs --detect --target <dépôt>` (aucune écriture) : dépôt git ? déjà bootstrappé (manifeste) ? code, CI ou `.claude/` déjà présents ? données sensibles (elles pèsent sur le choix public/privé) ? Voir « Dépôt existant ou déjà bootstrappé » ci-dessous.
2. Pose les questions (AskUserQuestion), recommandation en premier :
   - nom et description en une phrase ;
   - stack : déjà connue (la décrire en une ligne, elle remplace « la stack n'est pas choisie » dans `CLAUDE.md`) ou à décider plus tard ;
   - visibilité : **privé** si des données réelles ou sensibles sont présentes, sinon public (CI Windows gratuite et protection de branche disponible) ;
   - modules (multi-sélection, défauts de `modules.json`) ; ne propose pas deux modules incompatibles (colonne « Incompatible avec ») ;
   - langue de la documentation (modèles fournis en français) ;
   - Windows natif ou WSL (recommandé : natif ; jamais un même clone partagé entre les deux).
3. Relève les versions : `claude --version`, `node --version` (≥ 20.19), `git --version`, `gh --version`, `gh auth status` (scope `project` si module projects).
4. **Revérifie les conditions du plan GitHub Free** dans la doc actuelle (voir `references/github-free.md`) au lieu de citer des chiffres de mémoire.

## Phase 1 — Plan [STOP]

1. `node scripts/resolve-versions.mjs` → dernières versions stables des CLI ; SHA des actions publiées depuis ≥ 14 jours (le filtre d'ancienneté protège les actions épinglées, pas les CLI).
2. Écris `bootstrap.json` dans le scratchpad (schéma : `references/bootstrap-config.md`).
3. `node scripts/scaffold.mjs --config bootstrap.json --target <dépôt> --dry-run --diff` : fichiers créés, mis à jour, fusionnés, conservés et en conflit (avec le diff de chacun).
4. Présente : modules et dépendances, fichiers à créer, conflits, commandes globales à approuver, actions GitHub prévues, ce qui restera manuel. **[STOP]**

## Phase 2 — Mise en place

Un commit Conventional Commits par étape (anglais). Demande l'accord avant chaque action globale ou GitHub.

1. **git** : `git init -b main` si besoin ; vérifie `user.name`/`user.email` (ne les invente pas : demande).
2. **CLI** (accord requis) : `npm install -g @fission-ai/openspec@<v> archgate@<v>` aux versions de `bootstrap.json`. Avant, vérifie que le préfixe npm (`npm config get prefix`) est inscriptible par l'utilisateur (test d'écriture dans `<préfixe>/lib/node_modules`, ou dans `<préfixe>` sous Windows). S'il ne l'est pas (typiquement `/usr` sous Linux), propose `npm install -g --prefix ~/.local …` après avoir vérifié que `~/.local/bin` est dans le `PATH` (sinon, indique la ligne à ajouter au profil du shell, sans la modifier toi-même). Ne lance jamais `sudo` sans demande explicite de l'utilisateur. `gh` s'installe avec winget (élévation requise sous Windows) ou le gestionnaire de paquets Linux.
3. **Génération** : `scaffold.mjs` sans `--dry-run`. Code de sortie 3 = conflits : montre-les (`--diff`), ne les écrase pas. Si la langue n'est pas le français, traduis ensuite les fichiers générés (sauf identifiants, commandes et marqueurs techniques).
4. **openspec** : `openspec init --tools claude --language <code> --no-animation`, puis complète `openspec/config.yaml` avec `references/openspec-config.md`. Ne touche jamais `.claude/skills/openspec-*` ni `.claude/commands/opsx/`.
5. **archgate** : **ne lance pas `archgate init`** (voir pièges) ; les fichiers générés suffisent. `archgate check` doit passer et génère `docs/architecture/rules.d.ts` (ignoré par git).
6. **archgate-plugin** (accord requis) : `archgate login` (flux device, l'utilisateur valide dans son navigateur), puis, en portée `local` (limitée au clone, sans effet sur les autres projets de la machine), `claude plugin marketplace add https://plugins.archgate.dev/archgate.git` et `claude plugin install archgate@archgate --scope local`. N'utilise pas `archgate plugin install --editor claude` : il installe en portée `user`. Ensuite, retire tout `"agent": "archgate:developer"` de `.claude/settings.local.json` et aligne les `Skill(archgate:…)` autorisés sur les skills réellement fournis (`claude plugin details archgate@archgate`).
7. **githooks** : `git config core.hooksPath .githooks` et `git update-index --chmod=+x .githooks/pre-push` après le premier `git add`.
8. **agent-teams** : `"env": {"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"}` dans `.claude/settings.local.json` (jamais dans `settings.json` partagé : le flag change la délégation ordinaire).
9. **Contrôle** : `node .claude/hooks/quality-gate.mjs` renvoie 0.
10. **GitHub** (accord pour chaque action ; voir `references/github-setup.md`) : création du dépôt et push, labels (`node scripts/sync-labels.mjs` : **réutiliser avant de créer**, voir ci-dessous), permissions Actions pour release-please, Project, protection de branche si public. Si un classificateur de permissions bloque une commande, ne la contourne pas : donne-la à l'utilisateur pour qu'il la lance avec `!`.

    **Réutiliser avant de créer** (labels, statuts, types de ticket, colonnes — GitHub aujourd'hui, tout module de forge ou de suivi demain) : liste d'abord ce que l'outil fournit déjà, réutilise l'existant quand le sens correspond (`bug`, `enhancement`, `documentation`…), ne crée que ce qui manque et signale-le avec les autres actions visibles. Pour GitHub, `labels.json` marque les labels natifs (`"native": true`) : `sync-labels.mjs` ne les crée que s'ils manquent et ne les modifie jamais ; il met à jour les seuls labels du plugin (`adr`, `chore`).
11. Dis à l'utilisateur de **redémarrer Claude Code** dans le dépôt (depuis un terminal ouvert après l'installation de gh) : agents et plugins ne se chargent qu'au démarrage.

**[STOP]** Journal concis (commande → résultat), écarts par rapport au plan.

## Phase 3 — Vérification

Suis `references/verification.md` : chaîne issue → spec → PR → CI rouge puis verte → merge → Done → release, règles Archgate en échec puis en succès, subagent et teammates. Rapporte ce qui a marché, échoué, et les contournements.

**Audit** : termine par `node scripts/audit.mjs --target <dépôt>` (lecture seule, ne répare rien). Il liste chaque écart connu avec sa correction : manifeste et mise à jour en attente, hooks git (bit exécutable, `core.hooksPath`), labels des formulaires, versions des CLI et des actions, `archgate check`, `openspec validate` et `openspec doctor`. Présente les écarts et leurs corrections à l'utilisateur ; un contrôle « non vérifiable » (outil absent, pas de manifeste) n'est pas un écart. Avec l'accord de l'utilisateur, ajoute `--forge` (lecture seule : labels du dépôt, protection de `main`, migrations en attente, automatisations du Project avec `--project <n> --owner <login>`) ; `--workstation` ajoute les contrôles du poste (Node, git, `gh` et son scope `project`, préfixe npm, plugin Archgate). Auditer un projet exécute son outillage (`archgate check` charge ses règles) : réserve-le aux dépôts de confiance.

## Phase 4 — Suite

Les ADR d'outillage générés sont au statut **Proposé** : l'utilisateur les relit, puis les passe à « Accepté ». Sur un dépôt dont `main` est protégée, l'acceptation passe par une issue et une PR (accord requis pour chaque action GitHub) :

1. Issue avec le label `adr` (formulaire `architecture-decision`, ou son texte reproduit dans `--body-file`).
2. Branche `docs/<n>-accept-tooling-adrs`.
3. Dans chaque ADR, remplace le contenu de `## Statut` par « Accepté (issue #<n>) » : ARCH-003 demande d'y citer l'issue.
4. `node .claude/hooks/quality-gate.mjs` renvoie 0.
5. PR `docs(adr): accept tooling ADRs` avec `Closes #<n>`, puis squash merge. Un titre `docs:` ne déclenche pas de release.

Propose ensuite de rédiger arc42 §1 à §3, puis d'ouvrir la première issue « Décision d'architecture » pour la stack.

## Phase 5 — Mise à jour d'un projet déjà bootstrappé

À lancer quand le plugin a été mis à jour (`claude plugin update project-bootstrap@thiongane-ndiaga`, puis redémarrage) ou quand l'utilisateur demande de « mettre à jour le bootstrap ». Politique de version et ce qu'une release change pour les projets : `references/versioning.md`.

1. **Détecter** : `node scripts/scaffold.mjs --detect --target <dépôt>` ; `updateAvailable: true` si la version du manifeste diffère de celle du plugin. Sans manifeste (projet antérieur) : adoption, voir plus bas.
2. **Simuler** : `node scripts/scaffold.mjs --update --target <dépôt> --dry-run --diff`. La configuration est lue dans le manifeste. Pour relever aussi les versions épinglées des CLI et des actions, relance `scripts/resolve-versions.mjs`, fusionne le résultat dans une copie de la configuration du manifeste et passe-la avec `--config` au lieu de `--update`.
3. **Présenter** [STOP], en citant `fromVersion` → `toVersion` :
   - `created` : nouveaux fichiers du modèle, ajoutés après accord ;
   - `updated` : fichiers restés tels que générés, remplacés par le nouveau modèle ;
   - `merged` : fichiers partagés fusionnés ;
   - `reconciled` : fichiers modifiés par le projet, fusionnés avec le nouveau modèle à partir de leur base (`.bootstrap/base/`) ; à relire, surtout `ci.yml` et les hooks ;
   - `conflicts` : fichiers modifiés par le projet **dont le modèle a changé** et qui n'ont pas pu être fusionnés ; avec `--diff`, `diffs` contient la proposition de fusion avec marqueurs (jamais écrite dans le fichier) ; `baseInvalid` liste les bases altérées ;
   - `customized` : fichiers modifiés dont le modèle n'a pas changé (rien à faire) ;
   - `retired` : fichiers que le modèle ne produit plus (jamais supprimés automatiquement).
   Ces fichiers contiennent du code qui s'exécute (hooks, CI, `pre-push`) : l'utilisateur relit le diff avant d'appliquer.
4. **Appliquer** : même commande sans `--dry-run`, un commit pour la mise à jour (`chore: update project-bootstrap to <version>`), le manifeste inclus. Pour chaque conflit, l'utilisateur fusionne à la main le nouveau modèle dans son fichier ; relance ensuite avec `--update --adopt` pour le consigner (il ne sera plus signalé tant que le modèle ne change pas).
5. **Migrations hors fichiers** (réglages côté forge) : `node scripts/migrate.mjs --target <dépôt>` simule et liste les actions ; **accord explicite** de l'utilisateur, puis `--apply`. Chaque migration vérifie l'état réel et ne propose rien s'il est déjà conforme ; celles appliquées sont consignées dans le manifeste. Une migration peut aussi renvoyer des `notes` (informations, jamais exécutées) : présente-les à l'utilisateur avec la simulation. Une migration qui supprime (par exemple `0002-native-labels` : anciens labels `type:*` remplacés par `bug`, `enhancement`, `adr`, `chore`) le dit clairement dans la simulation ; la suppression d'un label le retire de toutes les issues et PR et ne se défait pas.
6. **Contrôle** : `node .claude/hooks/quality-gate.mjs` renvoie 0, puis `node scripts/audit.mjs --target <dépôt>` (phase 3, section Audit) sans écart, puis PR comme d'habitude. Relancer la mise à jour sur un projet à jour ne change rien.

**Projet sans manifeste** : `node scripts/scaffold.mjs --config bootstrap.json --target <dépôt> --adopt` crée les fichiers absents, fusionne les fichiers partagés, consigne comme `adopted` chaque fichier existant qui diffère du modèle (traité comme personnalisé) et écrit le manifeste. La reconnaissance automatique des fichiers non modifiés d'une version antérieure du plugin n'existe pas : tout fichier qui diffère est adopté tel quel.
