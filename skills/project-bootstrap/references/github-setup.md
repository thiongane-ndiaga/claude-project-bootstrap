# Mise en place GitHub

Chaque commande écrit sur GitHub : demande l'accord avant. `<owner>` est le login de l'utilisateur (`gh api user --jq .login`), `<repo>` le nom du dépôt.

1. **Dépôt** : `gh repo create <repo> --private|--public --source . --remote origin --push`. Le hook pre-push s'exécute au passage.
2. **Labels** : `node scripts/sync-labels.mjs` (lit `.github/labels.json`, `--force` = idempotent). Les labels par défaut de GitHub restent ; ne les supprime qu'avec accord.
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
   - demander à l'utilisateur, dans l'interface (⋯ → Workflows) : activer *Auto-add to project* (`is:issue,pr is:open`), *Item added → Todo*, et vérifier *Item closed* / *Pull request merged* → *Done* (parfois désactivés).
5. **Protection de `main`** (dépôt **public** uniquement) : consulte d'abord la doc des rulesets ou de la protection de branche, puis exige les checks de `ci.yml` (`checks (ubuntu-latest)`, `checks (windows-latest)`, `pr-title` ; vérifie les noms exacts dans `gh pr checks` après une première PR). En privé sur Free, c'est indisponible : le `pre-push` sert de substitut.
