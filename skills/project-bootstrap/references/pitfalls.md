# Pièges connus

Constatés lors de la mise en place de référence (Claude Code 2.1.31x, OpenSpec 1.15, Archgate 0.61, gh 2.103, Windows 11 natif). Revérifie ceux qui dépendent d'une version.

## Archgate
- **`archgate init` installe le plugin tout seul** si une session `archgate login` existe sur la machine (`--install-plugin` vaut « auto »), écrit `"agent": "archgate:developer"` dans `.claude/settings.local.json` (toutes les sessions deviennent cet agent) et y autorise des skills qui n'existent pas. Il crée aussi un exemple `GEN-001` dans `.archgate/adrs/` même quand `paths.adrs` pointe ailleurs. → Ne pas lancer `archgate init` : `.archgate/config.json` et `.archgate/lint/README.md` suffisent (la CLI repère le projet grâce au dossier `.archgate/lint/`).
- **`archgate adr create --rules` écrit `rules: false`** tout en créant le `.rules.ts`. Avec `rules: false`, les règles de l'ADR sont **ignorées en silence**. → Corriger le frontmatter ; la règle ARCH-003 `adr-format` le détecte.
- `paths.adrs` est configurable (`.archgate/config.json`) ; `rules.d.ts` est alors généré dans le dossier parent des ADR, ce qui fait résoudre `/// <reference path="../rules.d.ts" />`.
- Pas de champ `status` dans le frontmatter Archgate : le statut vit dans `## Statut`.
- `archgate check` n'a besoin ni de TypeScript ni de node_modules (binaire autonome).
- Le plugin exige `archgate login` (compte Archgate) ; la CLI seule, non.
- **`archgate login` échoue à stocker le jeton sans credential helper git** (« Signed in, but the credentials could not be stored ») : l'autorisation dans le navigateur réussit, mais `archgate login status` répond « Not logged in ». → Vérifier `git config --show-origin --get-all credential.helper`, puis, avec l'accord de l'utilisateur, `git config --global credential.https://auth.archgate.dev.helper store` (limité à ce domaine, jeton en clair dans `~/.git-credentials`), et relancer `archgate login`. Sous Linux, l'utilisateur lance la commande avec `!` : elle attend 120 s la validation dans le navigateur.

## OpenSpec
- `openspec init` génère `.claude/skills/openspec-*` et `.claude/commands/opsx/` : ne pas les éditer, `openspec update` les régénère.
- `--language <code>` existe et écrit la consigne de langue dans `openspec/config.yaml`.
- `openspec validate --all --strict --no-interactive` renvoie 0 sur un projet sans changement : utilisable en CI dès le départ.
- `design.md` est conditionnel ; une capability se nomme d'après un comportement durable, pas d'après la tâche. Si le nom diffère de celui annoncé dans l'issue, le signaler dans l'issue.

## Claude Code
- Les définitions de `.claude/agents/` et les plugins **ne sont chargés qu'au démarrage** : redémarrer après les avoir créés.
- Les règles de permission `Bash(...)` et `PowerShell(...)` sont distinctes : déclarer les deux formes.
- Hooks : forme exec (`"command": "node"`, `"args": [...]`) pour la portabilité ; `${CLAUDE_PROJECT_DIR}` est développé dans `args`.
- Les **hooks de frontmatter d'un agent ne sont pas garantis quand il tourne en teammate** : la documentation des agent teams n'en dit rien, et aucune vérification n'a été faite ici. En équipe, fais reposer la protection sur les règles allow/deny du lead, que les teammates in-process appliquent en direct. Sont repris : `tools`, `disallowedTools`, `model`, le corps ; `effort` en in-process seulement. Le champ `skills` n'est pas appliqué à un teammate.
- Un teammate se lance en passant `name` à l'outil Agent (flag actif, session interactive) ; pas de teammates en `-p`.
- Le classificateur du mode auto peut refuser `gh repo create --push` ou une installation de plugin : ne pas contourner, faire lancer la commande par l'utilisateur avec `!`.
- Un hook « lecture seule » par liste blanche doit refuser sauts de ligne, guillemets, redirections, et les options abrégées (`git diff --outp=x`) : le modèle `read-only-bash.mjs` le fait.
- Ce même hook n'autorise que les caractères `[\w ./:@^~=,#+-]` : `git log --format=%s` (le `%`) est refusé avec « caractère non autorisé », alors que `git log main..HEAD` passe. Le `traceability-checker` doit donc éviter `--format=` ; l'outil Read, lui, n'est pas soumis au hook.

## Windows
- `winget install GitHub.cli` échoue (MSI 1603) sans élévation : l'utilisateur doit le lancer en administrateur.
- Une session Claude Code lancée depuis un terminal ouvert **avant** l'installation de gh n'a pas gh dans son PATH : rouvrir un terminal.
- `Set-Content -NoNewline` peut échouer selon la version de PowerShell : préférer `[IO.File]::WriteAllText`.
- Ne jamais partager un même clone entre Windows et WSL.

## Linux
- `npm install -g` échoue (`The operation was rejected by your operating system`) quand le préfixe npm est `/usr`, qui appartient à root. → Détecter avec `npm config get prefix` et un test d'écriture, puis `npm install -g --prefix ~/.local …` avec `~/.local/bin` dans le `PATH`. Pas de `sudo` sans demande de l'utilisateur.
- Le `--prefix` n'est pas mémorisé : les mises à jour ultérieures de ces CLI doivent le répéter.

## Mode d'installation des CLI (`cliInstall`)
- `user` : `~/.local` n'a pas de sens sous Windows (le préfixe npm y est déjà propre à l'utilisateur) ; le mode y équivaut à `global`.
- `local` : les skills `/opsx:*` appellent `openspec` par son nom. Le hook `SessionStart` `session-path.mjs` place `node_modules/.bin` dans le `PATH` de l'outil Bash (par `CLAUDE_ENV_FILE`), donc `claude` suffit. L'outil PowerShell et un terminal personnel ne reçoivent pas ce `PATH` (Claude Code ne transmet pas à PowerShell une valeur contenant `/` ou `\`) : `npm run claude` ou `npx`. Un shell Cygwin (`/cygdrive/c`) n'est pas géré. Options de Claude Code : `npm run claude -- <options>`. Sous Windows, si `claude` est un shim `.cmd`, `npm run` peut afficher « Terminer le programme de commandes (O/N) ? » au Ctrl+C.
- `local` : `npm ci` et `cache: npm` échouent sans `package-lock.json` commité. Créer le lockfile (`npm install --package-lock-only`) avant le premier push.
- `local` : un `package.json` existant est conservé (`kept`), jamais modifié : ajouter les `devDependencies` à la main. Pour monter une version : `npm install --save-dev --save-exact <paquet>@<version>` (Dependabot ne couvre que `github-actions`).
- `local` avec une action `project-setup` qui lance elle aussi `npm ci` : le second `npm ci` est inutile, le retirer de l'action.
- Changer de mode après coup n'est pas géré : ajouter ou changer `cliInstall`, relancer `scaffold.mjs --update --config`, créer le lockfile, puis retirer à la main les anciennes installations globales.

## GitHub
- En **privé sur Free** : ni branches protégées ni rulesets → le blocage se fait en local (`pre-push`).
- `gh` ne remplit pas les formulaires d'issue YAML en mode non interactif : reproduire leurs sections dans `--body-file`.
- `gh project link` exige `--owner <login>` explicite (pas `@me`) quand le dépôt est cité.
- La colonne *In Review* s'ajoute par la mutation GraphQL `updateProjectV2Field`. Les automatisations de Projects (auto-add, item added → Todo, item closed / PR merged → Done) **se règlent dans l'interface web** ; *item closed* et *PR merged* peuvent être désactivés par défaut.
- *Auto-add to project* peut cibler un **autre dépôt** (constaté : le dépôt d'un projet précédent) : vérifier le dépôt cible dans ⋯ → Workflows. Il ne rattrape pas les issues créées avant la correction ; les ajouter avec `gh project item-add <n> --owner <login> --url <issue>`, le workflow *Item added → Todo* leur donne alors le statut Todo.
- `gh auth refresh -s project` échoue hors terminal interactif (« --hostname required ») : utiliser `gh auth refresh -h github.com -s project`.
- `git update-index --chmod=+x .githooks/pre-push` ne change que l'index : si le fichier est en 644 sur disque, git ignore le hook (« le crochet a été ignoré parce qu'il n'est pas marqué comme exécutable ») et un `git commit -a` n'enregistre pas le mode. → Faire aussi `chmod +x .githooks/pre-push` avant le premier push, puis vérifier avec `git ls-tree HEAD .githooks/` (100755).

## release-please
- Sans release précédente, la première version proposée est **1.0.0** : fixer `"initial-version": "0.0.1"` (déjà dans le modèle).
- Il faut autoriser les Actions à créer des PR (`can_approve_pull_request_reviews=true`).
- La CI de sa PR de release reste en `action_required` (run déclenché par le bot) : *Approve and run* dans l'interface.
- Seuls `feat` et `fix` apparaissent dans le changelog ; des commits uniquement `docs`/`chore` ne proposent pas de release.
- Une action peut publier un correctif sur une **ancienne majeure** après la dernière majeure : choisir les versions par numéro, pas par date (`resolve-versions.mjs` le fait).

## Reprise et journal des effets (`state.mjs`)
- `state.mjs init` est refusé quand un état existe : après un redémarrage, lancer `resume` (et `config --out` pour restituer `bootstrap.json`), jamais `init --force`, qui efface l'avancement.
- `resume` ne croit pas aveuglément l'état : une étape faite dont la preuve manque (`.git`, manifeste, `openspec/config.yaml`, `core.hooksPath`) redevient la prochaine.
- Sans état, la déduction se fonde sur le dépôt : un `.git` ou un manifeste antérieurs au bootstrap donnent de fausses preuves.
- Le journal n'annule rien tout seul. Une annulation de plugin ou de marketplace est omise si l'élément existait avant l'action, car d'autres projets peuvent l'utiliser ; l'installation de `gh` n'est annulable que si l'outil était absent.
- `--prefix` n'a pas de sens sous Windows : `state.mjs effect --kind npm-global` le refuse (mode `user` = mode `global`).

## Profils d'agents (constats de #32, Claude Code 2.1.316, OpenSpec 1.16.0)
- `operations.apply.guidance` et `operations.archive.guidance` de `openspec/config.yaml` sont des **listes** de chaînes ; une chaîne seule n'est pas restituée par `openspec instructions apply|archive --json` (`operationGuidance`).
- Un profil d'agent principal (`"agent"` dans `.claude/settings.json`) qui a les outils d'écriture et aucune consigne de délégation écrit lui-même : la délégation doit être dite dans son corps.
- Dans un schéma local (`openspec schema fork`), un artefact ajouté se place **avant** le bloc `apply:` du `schema.yaml`, sinon le YAML est invalide.
- Dans un dépôt dont la boîte de confiance n'a pas été acceptée (`claude -p` dans un dossier neuf), les règles `permissions.allow` du projet sont ignorées et le hook de frontmatter d'un agent de `.claude/agents/` n'est pas déclenché : valider les agents « lecture seule » dans un dépôt approuvé, où il bloque bien en subagent.
- Le hook d'un agent « lecture seule » doit cibler `Bash|PowerShell` : `cat` est un alias de PowerShell sous Windows.
- **Le hook de frontmatter d'un agent ne s'applique pas à un teammate** (constaté : `cat` et une commande composée exécutés par un teammate `qa-engineer`, bloqués en subagent). Seules les règles `permissions.allow` / `deny` protègent un teammate : elles refusent bien une écriture hors du chemin permis (`docs/**`).
- `/agents` n'existe plus (2.1.316) : vérifier un profil en l'invoquant.
- Un hook `SessionStart` sans `matcher` est rejoué après `/compact` (`source=compact`).
- L'advisor (`/advisor`) est appelé par le lead ; sur un teammate, l'appel n'a pu être établi que par son propre rapport. Trois niveaux de subagents imbriqués écrivent, le quatrième n'a rien écrit sans message d'erreur.

## Module agent-profiles (profils `architect` et `qa-engineer`, ARCH-011)
- Le bornage est un garde-fou contre l'erreur d'un agent, pas un bac à sable : `qa-engineer` peut écrire `tests/x.test.mjs` puis lancer `node .bootstrap/run-checks.mjs` (qui l'exécute), et `architect` peut écrire une règle `*.rules.ts` puis lancer `archgate check` (qui l'exécute). Relire les changements reste la garantie.
- Un teammate doit porter le nom de son profil (`qa-engineer`) : `agent_type` vaut le nom du teammate, et un autre nom n'est pas borné. Le profil intégré `Explore` reçoit tout l'outillage en équipe et n'est pas borné non plus.
- En équipe, `Bash` n'est pas limité par le frontmatter : seule la table `PROFILES` de `.claude/hooks/profile-guard.mjs` borne le shell d'un profil. Sans ce hook, un profil « lecture seule » qui garde `Bash` peut écrire.
- `tools: Agent(<types>)` du frontmatter restreint les agents lançables d'un agent principal, pas ceux d'un sous-agent (essai de #113, 2.1.316) : la liste des agents et skills qu'un profil lance vient de la table `PROFILES` du hook (ARCH-012), qui couvre aussi `Task`, l'ancien nom de l'outil `Agent`. Un profil ne lance que des sous-agents sans nom (un agent nommé est un teammate), sauf `project-lead`, dont la liste `namedAgents` admet un `name` égal au `subagent_type` (`second-opinion` exclu). Les agents de la table ont leurs propres bornes dans la table, sans `agents` ni `skills`. `archgate:reviewer` lance des agents `general-purpose`, refusés à tous les profils, `project-lead` compris : la vérification ADR passe par `qa-engineer` (`archgate review-context --run-checks`). `archgate:adr-author` sert à cadrer l'ADR ; il écrit sous le dossier d'ADR d'Archgate et demande `archgate adr domain add`, que le hook refuse à `architect` : créer l'ADR avec `archgate adr create`. Revoir un skill de la table à chaque mise à jour de son plugin (un skill qui lance un agent sort de la table ; un `context: fork` est refusé par le hook, #143). Le déclenchement du hook sur l'outil `Agent` d'un teammate n'est pas constaté en session d'équipe.
- Un teammate isolé dans un worktree écrit sous `.claude/worktrees/<nom>/` : le chemin est calculé depuis `CLAUDE_PROJECT_DIR`, donc ses écritures légitimes sont refusées. `Tests/` est aussi refusé (la casse compte, y compris sous Windows) et les liens ou jonctions ne sont pas résolus.
- Le titre d'`archgate adr create` d'`architect` se limite aux lettres, chiffres et `,.:'’_-` : PowerShell évalue les parenthèses et traite les guillemets typographiques comme des guillemets doubles.
- Le hook s'exécute à chaque écriture et commande de shell de la session (un `node`, plus un second pour une commande hors table). Retirer le module ne retire ni le hook déjà déclaré dans `settings.json` ni les fichiers générés.
- `mainAgent: "project-lead"` (module `agent-profiles`) écrit `"agent": "project-lead"` dans `.claude/settings.json` : le réglage de projet l'emporte sur `"agent": "archgate:developer"` du plugin Archgate (essai de #35), donc aucun conflit entre les modules. Il vaut pour toutes les sessions du clone ; le retirer à la main redonne l'agent par défaut, avec `mainAgent: null` pour que le générateur ne le réécrive pas. `settings.local.json` l'emporte sur `settings.json` : un `agent` personnel y annule `mainAgent` (l'audit le signale). Un `agent` déjà déclaré par le projet est conservé et signalé par `warnings`. L'entrée du hook porte `agent_type: "project-lead"` pour lui (essai de #114) : la table le borne (écritures refusées, shell réduit à la lecture et au pilotage, agents réduits aux profils), ses autres garde-fous sont des consignes de son prompt.
- Clé `profiles` (module `agent-profiles`) : seuls les profils listés sont générés ; la retirer de la configuration ne les retire pas (la liste est héritée du manifeste), il faut `profiles: []`, après quoi les fichiers sont signalés (`retired`) et sortent du manifeste, mais restent sur le disque : supprime-les à la main, car `project-lead` délègue tant qu'ils existent. `business-analyst` exige `openspec`.
- `developer` est borné par une **liste d'exclusion** (`writeExcept` de `profile-guard.mjs`) : il écrit partout sauf dans les dossiers de gouvernance, comparés sans tenir compte de la casse ni des points et espaces finals d'un segment (Windows). Son shell n'est pas borné : il peut écrire dans ces dossiers par la ligne de commande, et les liens ou jonctions ne sont pas résolus. Un dossier de gouvernance ajouté plus tard n'est protégé qu'une fois listé dans la table. `openspec/changes/` reste ouvert pour cocher les tâches.
- Le nom d'un skill OpenSpec varie selon l'installation (`opsx:propose`, `openspec-propose`) : la table de `business-analyst` liste les deux formes. Un skill de la table à revoir à chaque mise à jour d'OpenSpec.
- Les entrées de la table du hook des profils optionnels (dont `scout`, nom courant) s'appliquent même sans la clé `profiles` : un agent du projet qui porte l'un de ces noms est borné (le nommer autrement l'en dispense). Avec `keep` sur `profile-guard.mjs`, les profils choisis ne sont bornés que par ta version du hook (le rapport avertit).
- La liste d'exclusion de `developer` résout le chemin réel (liens, jonctions, noms courts 8.3, casse) et refuse un segment avec `:` ; elle ne couvre pas un dossier de gouvernance ajouté plus tard tant qu'il n'est pas listé, et un teammate isolé dans un worktree (`.claude/worktrees/`) se voit tout refuser. Revoir la table de `business-analyst` après chaque `openspec update` (noms de skills, formes des commandes).

## Module advisor (documentation lue le 2026-11-01)
- L'advisor (`/advisor`, `"advisorModel"`, `--advisor`) est expérimental et réservé à l'API Anthropic (pas Bedrock, Google Cloud ni Foundry). Le plugin n'écrit jamais `advisorModel` : le réglage est payant et accepté dans n'importe quel fichier de réglages, donc l'écrire dans le projet l'imposerait à tous.
- La documentation ne donne pas de version minimale pour la fonction de base : « 2.1.260 » est la version de `/advisor` hors terminal (`-p`, SDK, desktop). Ne pas la citer comme minimum.
- `DISABLE_TELEMETRY` (comme `DISABLE_GROWTHBOOK`, `DO_NOT_TRACK` et `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, des variables qui sautent la récupération des feature flags) laisse l'advisor désactivé ; `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` le coupe aussi. Le plugin ne définit aucune de ces variables. Ne pas confondre avec la télémétrie d'OpenSpec et d'Archgate.
- C'est Claude qui décide de l'appeler : aucun réglage ne l'impose ni ne le plafonne. La consigne portée par les profils sonnet et haiku (clé `advisor`) est une incitation, pas un mécanisme. Un sous-agent à liste `tools:` fermée dispose quand même de l'outil advisor quand la session en a un (essai de #126, 2.1.316 : `tools: [Read]` donne `Read` et `advisor`) ; pour un teammate, l'appel n'est pas garanti (#114). Le plugin ne peut pas activer l'advisor par profil : c'est un réglage de session, les sous-agents l'héritent. `architect`, `qa-engineer` (opus) et `project-lead` n'ont pas la consigne ; la règle est vérifiée par un test sur le `model:` des modèles de profils. `CLAUDE_CODE_SUBAGENT_MODEL` peut faire passer un profil sonnet en opus alors qu'il porte encore la consigne (l'advisor doit être au moins aussi capable que le modèle appelant).
- Le modèle de l'advisor doit être au moins aussi capable que le modèle principal ; sinon Claude Code ne l'attache pas, sans erreur. Il voit toute la conversation : il n'est pas indépendant de l'orchestrateur.
- Les sous-agents héritent de l'advisor (coût multiplié) ; pour les teammates, la documentation est muette et l'usage n'est établi que par leur rapport (#114).

## Modèle, effort et maxTurns des agents (#37, documentation lue le 2026-11-01)
- Les agents générés portent des valeurs de départ fixes, sans clé de configuration :

  | Agent | model | effort | maxTurns |
  |---|---|---|---|
  | `architect`, `qa-engineer`, `architecture-explorer` | opus | high | 40 |
  | `second-opinion`, `compliance-reviewer` | opus | high | 30 |
  | `spec-reviewer` | opus | high | 30 |
  | `developer` | sonnet | high | 60 |
  | `business-analyst` | sonnet | high | 40 |
  | `product-owner` | sonnet | medium | 20 |
  | `acceptance-tester`, `devops-engineer` | sonnet | medium | 25 |
  | `scout` | haiku | medium | 20 |
  | `arc42-keeper` | sonnet | medium | 30 |
  | `traceability-checker` | sonnet | medium | 25 |

  `project-lead`, agent principal, suit la session et n'en déclare aucun. Pour changer une valeur, édite le frontmatter du projet.
- Surcharges : le paramètre d'appel remplace `model` ; `CLAUDE_CODE_EFFORT_LEVEL` l'emporte sur `effort` ; `CLAUDE_CODE_SUBAGENT_MODEL` remplace le modèle des sous-agents ; les plafonds d'organisation (réglages gérés) bornent les modèles et niveaux permis.
- Coût : `opus` et `high` sont les valeurs les plus chères ; un compte sans accès à `opus` retombe sur l'ordre de modèles de Claude Code, d'où l'intérêt d'éditer le frontmatter. Les niveaux d'`effort` dépendent du modèle : un niveau peut ne pas exister sur un modèle de remplacement (non vérifié).
- `maxTurns` : un sous-agent arrêté par la limite rend, selon la documentation, une sortie marquée partielle que l'on peut reprendre (non vérifié ici). Un teammate ne reprend que `tools`, `disallowedTools`, `model` et le corps, et `effort` en in-process seulement : pour `maxTurns`, la borne ne vaut sûrement qu'en sous-agent.
- Un champ de frontmatter inconnu ou mal orthographié est ignoré sans erreur : le test du générateur valide les champs, `effort`, `maxTurns` et le nommage des fichiers de tous les agents générés.

## Profils acceptance-tester, scout et second-opinion (#34, lot 2a)
- `acceptance-tester` ne lit pas le code par consigne seulement : `Read` reste disponible. Son shell est celui de `read-only-bash.mjs` : il lit l'état de la CI (`gh pr checks`, `gh run view`) et valide les specs (`openspec validate`), mais ne lance ni lanceur de tests ni contrôle qualité ; le rapport de tests vient de `qa-engineer`, joint au brief.
- `scout` se distingue de l'agent intégré `Explore` par un rapport structuré dont chaque constat cite fichier et ligne, et par sa borne `maxTurns`. Son modèle haiku est le moins fiable sur un gros dépôt : le chef de projet vérifie les preuves citées. `effort: medium` sur haiku : la prise en compte du niveau par ce modèle n'est pas vérifiée.
- `second-opinion` n'est indépendant que si son brief est neutre (question, options, preuves) : le sous-agent ne reçoit que ce texte, mais rien ne garantit que `project-lead` l'a rédigé sans préférence. Lance-le en sous-agent ; en équipe, les messages d'un teammate peuvent lui transmettre la préférence. Il n'a pas de shell mais dispose de `WebSearch` et `WebFetch`, que le hook ne borne pas : le contenu du brief peut sortir dans une requête.
- Son entrée de table existe malgré l'absence de `Bash` : elle ramène à la lecture seule un teammate nommé `second-opinion` mais lancé avec un autre type d'agent.

## Profils devops-engineer et compliance-reviewer (#34, lot 2b)
- `regulatedDomain` est écrit dans le corps de `compliance-reviewer` et dans le manifeste : il est visible de tous ceux qui lisent le dépôt, n'y mets rien de sensible. La liste blanche (lettres, chiffres, espaces et `,.;:'’()/&_-`) évite les marqueurs de modèle et les caractères de structure ; elle n'empêche pas une consigne écrite en clair, la garantie est que le profil n'écrit rien (table du hook) et que l'auteur du texte est l'utilisateur. Le domaine n'est jamais écrit dans un frontmatter.
- `compliance-reviewer` est un modèle qui relit des documents : ses constats sont des alertes à faire confirmer, pas un avis juridique. Le plugin ne porte aucune liste d'exigences par domaine.
- `devops-engineer` lit la CI, les PR et les releases ; la traçabilité issue, changement, PR et ADR est à `qa-engineer` (ARCH-016). Sans le module `github`, `devops-engineer` se réduit à l'historique local. Le shell du hook refuse les guillemets, les tubes, `$`, `*` et `%` : les commandes des modèles n'en contiennent pas (un test les vérifie contre le hook), ce qui exclut `--jq`, `--search` et `--format`.
- Retirer `regulatedDomain` alors que `compliance-reviewer` est hérité du manifeste échoue : passer aussi `profiles` sans ce profil.

## Document de workflow (#38)
- `docs/workflow.md` contient une table « Double encodage » : une ligne par puce de `## Règles` du `CLAUDE.md` généré, avec son garde-fou ou « consigne seulement ». Ajouter une règle à `CLAUDE.md` sans sa ligne fait échouer le test ; ajouter un garde-fou à une règle « consigne seulement » oblige à corriger la ligne. Le test vérifie que les fichiers cités existent, pas qu'ils protègent.
- La table « Qui fait quoi » reprend à la main les droits de la table `PROFILES` de `profile-guard.mjs` : la modifier avec elle.
- Les agents historiques (`spec-reviewer`, `traceability-checker`, `arc42-keeper`, `architecture-explorer`) n'existent que sans `agent-profiles` et ne sont décrits nulle part dans `workflow.md` (ARCH-016).
- `docs/workflow.md` de ce dépôt n'est pas régénéré par ce changement : il n'a pas le module `agent-profiles` et se met à jour avec `--update` lors d'une adoption.

## Équipes d'agents, advisor et cache (#40, documentation lue le 2026-11-09)
Compléments aux puces des sections « Claude Code » (`skills`, teammate lancé par `name`), « Module advisor » (`DISABLE_TELEMETRY`) et « Module agent-profiles » (Archgate et `agent`), qui restent la référence.
- Source de l'absence de `skills` chez un teammate : « Claude Code doesn't apply the definition's `skills` to a teammate in either display mode » (https://code.claude.com/docs/en/agent-teams.md, « Use subagent definitions for teammates »).
- Avec `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, « a subagent that Claude names launches as a teammate, so teams can form even when you didn't ask for one », avec le surcoût en jetons d'une équipe (même page, « Enable agent teams » et « Token usage »). `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=0` le désactive.
- Les volets séparés ne sont pas pris en charge dans Windows Terminal, le terminal intégré de VS Code ni Ghostty ; ils demandent tmux ou iTerm2, le mode in-process marche partout (même page, « Limitations »).
- Le cache de prompt des subagents et des teammates dure cinq minutes par défaut, abonnement compris ; réglable par `subagentPromptCacheTtl` (`5m` ou `1h`, version 2.1.242 ou plus) ou `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` (https://code.claude.com/docs/en/prompt-caching.md, « Choose the TTL yourself »). Un teammate inactif plus de cinq minutes paie donc de nouveau son contexte.
- `DISABLE_TELEMETRY` : source https://code.claude.com/docs/en/advisor.md (« Requirements »). Désactivation explicite de l'advisor : `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` (https://code.claude.com/docs/en/env-vars.md).
- Le `settings.json` du plugin Archgate (`{ "agent": "archgate:developer" }`) est un réglage par défaut de plugin, le niveau le plus bas : seules les clés `agent` et `subagentStatusLine` y sont prises en compte. Un `agent` posé dans les réglages utilisateur, projet ou local le remplace (https://code.claude.com/docs/en/plugins/components.md, « Default settings »), ce qui permet à `mainAgent: project-lead` (ARCH-013) de le remplacer sans conflit. Le `.claude/settings.local.json` écrit par `archgate init` l'emporte en revanche sur `.claude/settings.json` : voir la puce Archgate de la section « Archgate ».
- `ANTHROPIC_BASE_URL` dans la clé `env` d'un `settings.json` redirige aussi la session principale : constat rapporté par l'issue #40 (2026-10-30), non reproduit ici. La documentation (env-vars, settings, llm-gateway) ne le dit pas : à confirmer par un essai (#114) avant de s'y appuyer. Les valeurs `env` d'un fichier projet ne s'appliquent qu'après confiance dans le dossier (https://code.claude.com/docs/en/settings.md).

## Persistance après compaction (#39, documentation lue le 2026-11-09)
- Après une compaction, le `CLAUDE.md` racine et les règles sans `paths:` sont réinjectés depuis le disque ; les règles à `paths:` et les `CLAUDE.md` de sous-dossier disparaissent jusqu'à la relecture d'un fichier correspondant ; le corps d'un skill est réinjecté (5 000 jetons par skill au plus, début conservé) (https://code.claude.com/docs/en/context-window.md, « What survives compaction »). Le plugin ne génère aucune règle à `paths:` ; ne pas y mettre une règle critique.
- La documentation ne dit pas si le corps d'un agent principal personnalisé survit : l'échelle d'arbitrage est donc aussi dans le `CLAUDE.md` racine (ARCH-013). Les trois copies (`project-lead.md`, `CLAUDE.md`, `docs/workflow.md`) sont comparées par un test.
- Le `SKILL.md` du plugin dépasse 5 000 jetons : la fin est tronquée après compaction. Garder `[STOP]`, la reprise et l'accord pour les actions GitHub en tête (test de position).
- Le module `compact-recall` s'appuie sur le matcher `compact` de `SessionStart` (https://code.claude.com/docs/en/hooks.md) et sur la sortie standard ajoutée au contexte (https://code.claude.com/docs/en/hooks-guide.md). Le hook ne lit que le disque et git : les CLI `openspec` et `archgate session-context` ne sont pas appelées, leur `PATH` n'étant pas garanti dans un hook (mode `local`).
- Non vérifié : une compaction réelle sur un projet généré, et l'exécution de `SessionStart` pour un teammate ou un subagent (la documentation ne la mentionne pas ; `claude --debug-file` permet de l'observer, #114). L'issue #39 reste ouverte pour cette vérification.
- Retirer `compact-recall` ne retire ni `.claude/hooks/compact-recall.mjs` ni l'entrée `compact` de `.claude/settings.json` : la fusion ne supprime jamais rien (ARCH-006). Les enlever à la main.

## Les profils absorbent les agents historiques (#110, ARCH-016)
- Avec `agent-profiles`, `architecture-explorer`, `arc42-keeper`, `spec-reviewer`, `traceability-checker` et `restrict-path.mjs` ne sont pas générés ; leurs méthodes sont dans `architect` (options, arc42) et `qa-engineer` (revue de spec, traçabilité). Sans `agent-profiles`, rien ne change (pseudo-module `legacy-agents`).
- Pertes assumées : plus d'exploration en équipe avec un explorateur par option, et la revue de spec se fait dans le contexte de `qa-engineer`, sans agent à contexte séparé.
- La migration `0003` retire les fichiers d'un projet existant en les comparant à leur copie `.bootstrap/base/<chemin>.base` : `scaffold.mjs --update` retire d'abord leurs entrées du manifeste (`retired`), le manifeste ne sert donc plus de référence. Un fichier modifié, conservé, adopté ou fusionné (sans copie de base) reste en place avec une note ; il n'est plus dans la table du hook, donc plus borné.
- `migrate.mjs` ne demande plus de dépôt GitHub : les migrations qui appellent `gh` (`needsForge`) sont ignorées avec une note quand il manque, celles de fichiers restent proposées. L'audit ne lance les migrations qu'avec `--forge` : rejouer `migrate.mjs` après une mise à jour.
- Les méthodes de revue de spec et de contrôle de la PR sont des skills de projet (#138) : `qa-engineer` garde les tests et la relecture du code.

## Profils par défaut, orchestrateur et skills de méthodes (#138, ARCH-016)
- `architect`, `qa-engineer`, `developer` et `project-lead` sont toujours générés avec `agent-profiles` ; `developer` n'est plus dans `profiles` (listé, il est ignoré avec un avertissement et n'est pas consigné). Les skills `adr-options-comparison`, `arc42-update`, `spec-review` et `pr-readiness-review` sont générées sous `.claude/skills/` selon les modules ; `scaffold.mjs --update` les ajoute aux projets existants (un fichier de même chemin hors manifeste est signalé en conflit).
- `project-lead` est un orchestrateur. Son frontmatter déclare `disallowedTools: Write, Edit, MultiEdit, NotebookEdit` : ce champ s'applique à l'agent principal (`Write` et `Edit` absents de sa liste d'outils, `claude -p`, Claude Code 2.1.318, #114), bien que la documentation ne le dise pas. Le hook borne en plus son shell (#141, ARCH-012) : lecture seule de `read-only-bash.mjs`, `openspec archive <id> --yes`, `quality-gate`, `run-checks`, `archgate review-context` et `session-context`, et `gh issue|pr` `create|comment|edit|close|reopen|merge|ready` sans `--admin`, `--web`, `--repo`, `--delete-last`, `--body`, `--editor`, sans option courte `-w -R -b -e` ni groupée, avec une chaîne entre guillemets droits seulement après `--title`, `-t` ou `--subject` et `--body-file` en chemin relatif sans `..`. Un corps long passe par un fichier écrit par `developer`. Les skills de `project-lead` n'ont pas de liste (`skillsOpen`), mais le hook refuse à tout profil de la table un skill invalide ou à `context: fork` (#143) : ses outils portent `agent_type: "general-purpose"` et un `agent_id`, hors de la table (constaté, Claude Code 2.1.322). Le hook cherche l'en-tête dans `.claude/skills/`, `.claude/commands/`, la configuration de l'utilisateur et les plugins installés (`installed_plugins.json`, puis le cache) ; un skill introuvable est permis (chemins de `plugin.json`, `--plugin-dir` et `--add-dir` non cherchés). Les outils MCP sont limités à la lecture pour les profils de la table : nom de lecture sans mot d'écriture, ou liste `mcpAllow` de l'entrée ; `get_me`, `get_file_contents`, `issue_read` passent, `issue_write`, `merge_pull_request`, `run_query`, `find_and_replace`, `mark_all_notifications_read` sont refusés, et les outils de lecture au nom inhabituel (`getDiagnostics`, `take_screenshot`, `guide`, `query`) aussi : les ajouter à `mcpAllow`. Les profils à liste `tools` n'ont pas d'outil MCP ; seul `project-lead` reçoit ceux de la session. Un processus `node` de plus par appel MCP. `/opsx:apply`, `/opsx:archive` et `/opsx:sync` éditent des fichiers et échouent sous `project-lead` : `openspec archive <id> --yes`.
- Sans `business-analyst`, `developer` rédige les changements OpenSpec (il écrit dans `openspec/changes/<id>/`) ; `project-lead` archive par `openspec archive <id> --yes`, car `openspec/specs/` et l'archive sont interdits à `developer`. Les fichiers de gouvernance (`CLAUDE.md`, `.claude/`, `.github/`, `docs/workflow.md`) n'ont aucun rédacteur en tâche courante : l'utilisateur les modifie, ou une session sans `mainAgent`.
- Un teammate `developer` isolé dans un worktree se voit tout refuser par le hook (chemins sous `.claude/worktrees/`) : `project-lead` le lance en sous-agent sans isolation, maintenant que tout le code passe par lui.
- Une skill est une consigne chargée dans le contexte du profil : le profil peut ne pas la lancer, et la revue de spec n'a pas de contexte séparé. Le champ `skills` du frontmatter n'est pas utilisé (non appliqué aux teammates). Un teammate muni de l'outil `Skill` voit les skills de projet, et le hook les borne par nom (`architect` : `arc42-update` accepté, `spec-review` refusé ; `qa-engineer` : `spec-review` accepté ; essai de #114, Claude Code 2.1.322). Le skill d'un module absent du projet est inconnu (`Unknown skill`).
