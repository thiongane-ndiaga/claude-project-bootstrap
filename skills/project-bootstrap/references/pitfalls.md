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
- `tools: Agent(<types>)` du frontmatter restreint les agents lançables d'un agent principal, pas ceux d'un sous-agent (essai de #113, 2.1.316) : la liste des agents et skills qu'un profil lance vient de la table `PROFILES` du hook (ARCH-012), qui couvre aussi `Task`, l'ancien nom de l'outil `Agent`. Un profil ne lance que des sous-agents sans nom (un agent nommé est un teammate). Les agents de la table ont leurs propres bornes dans la table, sans `agents` ni `skills`. `archgate:reviewer` lance des agents `general-purpose` : il reste à l'agent principal. `archgate:adr-author` sert à cadrer l'ADR ; il écrit sous le dossier d'ADR d'Archgate et demande `archgate adr domain add`, que le hook refuse à `architect` : créer l'ADR avec `archgate adr create`. Revoir un skill de la table à chaque mise à jour de son plugin (un `context: fork` lancerait un agent sans passer par l'outil `Agent`). Le déclenchement du hook sur l'outil `Agent` d'un teammate n'est pas constaté en session d'équipe.
- Un teammate isolé dans un worktree écrit sous `.claude/worktrees/<nom>/` : le chemin est calculé depuis `CLAUDE_PROJECT_DIR`, donc ses écritures légitimes sont refusées. `Tests/` est aussi refusé (la casse compte, y compris sous Windows) et les liens ou jonctions ne sont pas résolus.
- Le titre d'`archgate adr create` d'`architect` se limite aux lettres, chiffres et `,.:'’_-` : PowerShell évalue les parenthèses et traite les guillemets typographiques comme des guillemets doubles.
- Le hook s'exécute à chaque écriture et commande de shell de la session (un `node`, plus un second pour une commande hors table). Retirer le module ne retire ni le hook déjà déclaré dans `settings.json` ni les fichiers générés.
- `mainAgent: "project-lead"` (module `agent-profiles`) écrit `"agent": "project-lead"` dans `.claude/settings.json` : le réglage de projet l'emporte sur `"agent": "archgate:developer"` du plugin Archgate (essai de #35), donc aucun conflit entre les modules. Il vaut pour toutes les sessions du clone ; le retirer à la main redonne l'agent par défaut, avec `mainAgent: null` pour que le générateur ne le réécrive pas. `settings.local.json` l'emporte sur `settings.json` : un `agent` personnel y annule `mainAgent` (l'audit le signale). Un `agent` déjà déclaré par le projet est conservé et signalé par `warnings`. `project-lead` n'est pas borné par le hook (l'agent principal n'a pas d'`agent_type`) : ses garde-fous sont des consignes de son prompt. Sans profil `developer` ni `business-analyst`, il écrit lui-même le code et les specs : la relecture par `qa-engineer` est alors la seule garantie de « qui écrit ne relit pas ».
- Clé `profiles` (module `agent-profiles`) : seuls les profils listés sont générés ; la retirer de la configuration ne les retire pas (la liste est héritée du manifeste), il faut `profiles: []`, après quoi les fichiers sont signalés (`retired`) et sortent du manifeste, mais restent sur le disque : supprime-les à la main, car `project-lead` délègue tant qu'ils existent. `business-analyst` exige `openspec`.
- `developer` est borné par une **liste d'exclusion** (`writeExcept` de `profile-guard.mjs`) : il écrit partout sauf dans les dossiers de gouvernance, comparés sans tenir compte de la casse ni des points et espaces finals d'un segment (Windows). Son shell n'est pas borné : il peut écrire dans ces dossiers par la ligne de commande, et les liens ou jonctions ne sont pas résolus. Un dossier de gouvernance ajouté plus tard n'est protégé qu'une fois listé dans la table. `openspec/changes/` reste ouvert pour cocher les tâches.
- Le nom d'un skill OpenSpec varie selon l'installation (`opsx:propose`, `openspec-propose`) : la table de `business-analyst` liste les deux formes. Un skill de la table à revoir à chaque mise à jour d'OpenSpec.
- Les entrées `developer`, `product-owner` et `business-analyst` de la table du hook s'appliquent même sans la clé `profiles` : un agent du projet qui porte l'un de ces noms est borné (le nommer autrement l'en dispense). Avec `keep` sur `profile-guard.mjs`, les profils choisis ne sont bornés que par ta version du hook (le rapport avertit).
- La liste d'exclusion de `developer` résout le chemin réel (liens, jonctions, noms courts 8.3, casse) et refuse un segment avec `:` ; elle ne couvre pas un dossier de gouvernance ajouté plus tard tant qu'il n'est pas listé, et un teammate isolé dans un worktree (`.claude/worktrees/`) se voit tout refuser. Revoir la table de `business-analyst` après chaque `openspec update` (noms de skills, formes des commandes).

## Module advisor (documentation lue le 2026-11-01)
- L'advisor (`/advisor`, `"advisorModel"`, `--advisor`) est expérimental et réservé à l'API Anthropic (pas Bedrock, Google Cloud ni Foundry). Le plugin n'écrit jamais `advisorModel` : le réglage est payant et accepté dans n'importe quel fichier de réglages, donc l'écrire dans le projet l'imposerait à tous.
- La documentation ne donne pas de version minimale pour la fonction de base : « 2.1.260 » est la version de `/advisor` hors terminal (`-p`, SDK, desktop). Ne pas la citer comme minimum.
- `DISABLE_TELEMETRY` (comme `DISABLE_GROWTHBOOK`, `DO_NOT_TRACK` et `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, des variables qui sautent la récupération des feature flags) laisse l'advisor désactivé ; `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` le coupe aussi. Le plugin ne définit aucune de ces variables. Ne pas confondre avec la télémétrie d'OpenSpec et d'Archgate.
- C'est Claude qui décide de l'appeler : aucun réglage ne l'impose ni ne le plafonne. Une consigne dans `project-lead` est une incitation, pas un mécanisme.
- Le modèle de l'advisor doit être au moins aussi capable que le modèle principal ; sinon Claude Code ne l'attache pas, sans erreur. Il voit toute la conversation : il n'est pas indépendant de l'orchestrateur.
- Les sous-agents héritent de l'advisor (coût multiplié) ; pour les teammates, la documentation est muette et l'usage n'est établi que par leur rapport (#114).
