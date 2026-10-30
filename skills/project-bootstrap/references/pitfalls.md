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
- Les **hooks de frontmatter d'un agent ne s'appliquent pas quand il tourne en teammate** : en équipe, seules les règles allow/ask du lead protègent. Les champs `tools`, `model` et le corps sont, eux, repris.
- Un teammate se lance en passant `name` à l'outil Agent (flag actif, session interactive) ; pas de teammates en `-p`.
- Le classificateur du mode auto peut refuser `gh repo create --push` ou une installation de plugin : ne pas contourner, faire lancer la commande par l'utilisateur avec `!`.
- Un hook « lecture seule » par liste blanche doit refuser sauts de ligne, guillemets, redirections, et les options abrégées (`git diff --outp=x`) : le modèle `read-only-bash.mjs` le fait.
- Ce même hook n'autorise que les caractères `[\w ./:@^~=,#+-]` : `git log --format=%s` (le `%`) est refusé avec « caractère non autorisé », alors que `git log main..HEAD` passe. Le `traceability-checker` doit donc éviter `--format=` ; l'outil Read, lui, n'est pas soumis au hook.

## Windows
- `winget install GitHub.cli` échoue (MSI 1603) sans élévation : l'utilisateur doit le lancer en administrateur.
- Une session Claude Code lancée depuis un terminal ouvert **avant** l'installation de gh n'a pas gh dans son PATH : rouvrir un terminal.
- `Set-Content -NoNewline` peut échouer selon la version de PowerShell : préférer `[IO.File]::WriteAllText`.
- Ne jamais partager un même clone entre Windows et WSL.

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
