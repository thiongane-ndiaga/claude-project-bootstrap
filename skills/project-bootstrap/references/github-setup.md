# Mise en place GitHub

Chaque commande écrit sur GitHub : demande l'accord avant. `<owner>` est le login de l'utilisateur (`gh api user --jq .login`), `<repo>` le nom du dépôt.

1. **Dépôt** : `gh repo create <repo> --private|--public --source . --remote origin --push`. Le hook pre-push s'exécute au passage.
2. **Labels** : `node scripts/sync-labels.mjs` (lit `.github/labels.json`). Il liste d'abord les labels du dépôt (noms comparés sans tenir compte de la casse) : les labels natifs marqués `"native": true` (`bug`, `enhancement`) ne sont créés que s'ils manquent et jamais modifiés ; les labels du plugin (`adr`, `chore`) sont créés ou mis à jour. Si la lecture des labels échoue, rien n'est créé. Les labels par défaut de GitHub restent ; ne les supprime qu'avec accord. Un `labels.json` de projet qui garde d'anciens `type:*` les fera recréer : migre d'abord (`migrate.mjs`, migration `0002-native-labels`) puis retire-les du fichier.
2 bis. **Squash** : `gh api -X PATCH repos/<owner>/<repo> -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=BLANK`. Le commit de squash ne garde que le titre de la PR : sans cela, un `Closes #N` écrit dans un commit se retrouve dans la PR de release-please, que GitHub compte comme une seconde PR fermante, et la carte du Project repasse en « In Progress ». `Closes #N` ne va que dans le corps de la PR, `Refs #N` dans les commits (la migration `0004-squash-title-only` corrige un dépôt existant). Droits d'administrateur requis, et dépôt déjà créé : en cas de 403, donner la commande à l'utilisateur.
3. **Actions et release-please** (module release) :
   `gh api -X PUT repos/<owner>/<repo>/actions/permissions/workflow -f default_workflow_permissions=read -F can_approve_pull_request_reviews=true`
4. **Project** (module projects ; scope `project` requis, sinon `gh auth refresh -s project`) :
   - `gh project create --owner @me --title "<nom>" --format json` → noter `number` ;
   - `gh project link <number> --owner <owner> --repo <owner>/<repo>` ;
   - `gh project field-list <number> --owner <owner> --format json` → id du champ `Status` ;
   - ajouter *In Review* :
     ```
     gh api graphql -f query='mutation { updateProjectV2Field(input: {fieldId: "<id>", singleSelectOptions: [{name: "Todo", color: GRAY, description: ""}, {name: "In Progress", color: YELLOW, description: ""}, {name: "In Review", color: BLUE, description: ""}, {name: "Done", color: GREEN, description: ""}]}) { projectV2Field { ... on ProjectV2SingleSelectField { options { name } } } } }'
     ```
   - demander à l'utilisateur, dans l'interface (⋯ → Workflows) : activer *Auto-add to project* (`is:issue,pr is:open`), *Item added → Todo*, *Item closed* et *Pull request merged* (→ *Done* ; parfois désactivés). Avec le secret ci-dessous, désactiver aussi *Pull request linked to issue* : il remet la carte en *In Progress* à l'ouverture de la PR et concurrence le workflow `project-status.yml` ;
   - **statuts automatiques** (avec `issue-source`, le workflow `.github/workflows/project-status.yml` est généré et reste inactif sans secret ; sans lui, *In Progress* et *In Review* se règlent à la main). Chaque écriture demande l'accord de l'utilisateur :
     1. l'utilisateur crée, dans l'interface (Settings → Developer settings → Personal access tokens → Tokens (classic)), un jeton **classique** : scope `project`, plus `repo` si le dépôt est privé (nécessité non essayée : voir `pitfalls.md`), **expiration courte**. Un jeton fine-grained n'accède pas aux Projects d'un compte personnel ; le jeton n'est jamais écrit dans un fichier ni dans une commande de l'agent ;
     2. `gh secret set PROJECT_TOKEN` : l'utilisateur colle le jeton (`<jeton>`) à l'invite, sans `--body` ;
     3. `gh variable set PROJECT_NUMBER --body <number>` (numéro du Project) et, si le Project n'appartient pas au propriétaire du dépôt, `gh variable set PROJECT_OWNER --body <login>` ;
     4. à l'expiration, l'étape de mise à jour échoue en nommant `PROJECT_TOKEN` (le journal ne reproduit pas la réponse de l'API) : créer un nouveau jeton et relancer `gh secret set PROJECT_TOKEN`.
5. **Protection de `main`** (dépôt **public** uniquement) : consulte d'abord la doc des rulesets ou de la protection de branche, puis exige les checks de `ci.yml` (`checks (ubuntu-latest)`, `checks (windows-latest)`, `pr-title` ; vérifie les noms exacts dans `gh pr checks` après une première PR). En privé sur Free, c'est indisponible : le `pre-push` sert de substitut.
