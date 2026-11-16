# Design

## Context

La décision (comparaison des options, secret optionnel, périmètre, risques) est dans [ARCH-019](../../../docs/architecture/adrs/ARCH-019-statuts-in-progress-et-in-review-du-project-par-une-action-optionnelle.md) et n'est pas répétée ici ; ce document fixe le mécanisme, les formulations et les cas limites. Motivation : voir `proposal.md`.

État du dépôt qui contraint l'approche :

- Le module `projects` n'a que `module.json` (`requires: github`, `default: true`) ; aucun modèle, aucun test.
- `catalog.mjs` accepte `files[].when` avec un pseudo-module ; `scaffold.mjs` génère un fichier quand tous les modules de `when` sont actifs, pseudo-modules compris. `issue-source` est actif sans le module `jira` et quand `jiraSource` n'est pas `jira`. Aucun descripteur n'utilise encore `issue-source` dans `when`.
- Un fichier absent du disque est recréé par `scaffold.mjs --update` (règle « absent → créé »), que le manifeste le liste ou non.
- Le moteur de blocs de `scaffold.mjs` : `@@module:a|b` vaut OU, l'imbrication vaut ET, il n'y a pas de négation (le complément de `issue-source` est `jira-source`).
- Avec `gitlab`, `projects` est refusé (code 1, il requiert `github` ; ARCH-018).
- Le motif du secret optionnel est celui du job `sonar` de `ci.yml` : valeur lue dans l'environnement du job, étape conditionnée par `env.X == ''` ou `!= ''`, notice sinon.
- La parité fr/en de `tests/scaffold.test.mjs` compare les squelettes YAML : seuls les `name:`, les commentaires et les textes entre guillemets peuvent différer d'une langue à l'autre.
- L'audit (`audit.mjs`) lit `ci.yml` et `release.yml` pour les actions épinglées et tous les workflows pour les noms de jobs ; un nouveau workflow sans `uses:` ne change aucun contrôle.

## Goals / Non-Goals

**Goals :**

- Un workflow unique, lisible, sans action tierce, qui applique les décisions 1 à 11 d'ARCH-019.
- Un comportement dont la correction ne dépend pas de l'ordre des événements.
- Un jeton configuré qui ne fonctionne pas se voit : l'étape échoue avec un message qui nomme `PROJECT_TOKEN`.
- Des tests de génération qui figent ce qui peut l'être statiquement.

**Non-Goals :**

- Exécuter le workflow dans les tests automatiques.
- Un fichier `docs/projects.md` généré : les étapes manuelles vivent dans `github-setup.md` et `pitfalls.md` du skill, et la notice du workflow nomme la valeur absente.
- Une combinaison de matrice pour le mode Jira : le test du module couvre l'absence du workflow.
- Un contrôle de l'audit sur « Pull request linked to issue ».

## Decisions

### D1. Fichiers du module

- `module.json` du module `projects` : `files: [{ "path": ".github/workflows/project-status.yml", "when": ["issue-source"] }]` ; la description est complétée (statuts automatiques par Action optionnelle).
- Modèles `templates/.github/workflows/project-status.yml` (français) et `templates.en/…` (anglais). Aucun paramètre `{{…}}` : le workflow n'a ni version, ni SHA, ni nom de projet.
- Pas de nouvelle clé de configuration, pas de pseudo-module, pas de modification de `scaffold.mjs` ni de `catalog.mjs` (ARCH-010).
- `scaffold.mjs --update` crée le fichier dans un projet existant ; le fichier n'est ni `owned` ni fusionné : un projet qui le modifie reçoit le traitement habituel des fichiers modifiés.

### D2. Forme du workflow

Un seul job `status` sur `ubuntu-latest`, `timeout-minutes: 5`, sans checkout ni `uses:` : tout passe par `gh` et un script `run: |` en bash. Squelette (les noms d'étapes et les textes de notice sont localisés) :

```yaml
on:
  create:
  pull_request:
    types: [opened, reopened, ready_for_review, converted_to_draft, closed]
permissions: {}
concurrency:
  group: project-status-${{ github.head_ref || github.ref_name }}
  cancel-in-progress: false
jobs:
  status:
    if: <branche créée, ou PR non fusionnée>
    env:
      PROJECT_TOKEN: ${{ secrets.PROJECT_TOKEN }}
      GH_REPO: ${{ github.repository }}
      PROJECT_NUMBER: ${{ vars.PROJECT_NUMBER }}
      PROJECT_OWNER: ${{ vars.PROJECT_OWNER || github.repository_owner }}
      BRANCH: ${{ github.head_ref || github.ref_name }}
    steps:
      - name: <inactif>
        if: env.PROJECT_TOKEN == '' || env.PROJECT_NUMBER == ''
        run: |
          echo "::notice::…"
      - name: <statut>
        if: env.PROJECT_TOKEN != '' && env.PROJECT_NUMBER != ''
        env:
          GH_TOKEN: ${{ secrets.PROJECT_TOKEN }}
        run: |
```

- Condition de job, sans secret : `github.event_name == 'create' && github.ref_type == 'branch'`, ou `github.event_name == 'pull_request'` avec `github.event.action != 'closed' || github.event.pull_request.merged == false`. `create` se déclenche aussi pour les étiquettes ; une PR fusionnée relève du workflow intégré (*Done*), et la laisser passer risquerait d'écrire *In Progress* avant la fermeture de l'issue.
- Environnement du job : `PROJECT_TOKEN`, `PROJECT_NUMBER`, `PROJECT_OWNER` et `BRANCH` (plus `GH_REPO`, lu par `gh`). `PROJECT_TOKEN` porte le secret pour les conditions d'étape, comme `SONAR_TOKEN` dans `ci.yml`. `GH_TOKEN`, que `gh` lit, n'est posé que sur l'étape de mise à jour : l'étape de notice n'a pas le jeton sous le nom que `gh` reconnaît. `permissions: {}` retire tout droit à `GITHUB_TOKEN`, qui n'est pas utilisé.
- La notice de l'étape inactive nomme la valeur absente en testant `PROJECT_TOKEN` puis `PROJECT_NUMBER` dans le script (texte fixe, sans donnée d'événement).
- `PROJECT_OWNER` : `vars.PROJECT_OWNER` s'il existe, sinon `github.repository_owner`. L'ADR en fait une surcharge facultative ; seul `PROJECT_NUMBER` est requis.
- Concurrence : `create` n'a pas de `head_ref`, d'où `github.ref_name`. Avec `cancel-in-progress: false`, GitHub garde une exécution en cours et une seule en attente par groupe : une exécution en attente remplacée est perdue, ce qui est sans effet puisque la dernière lit l'état.

### D3. Script d'état

Le script ne lit que des variables d'environnement (`BRANCH`, `GH_REPO`, `PROJECT_NUMBER`, `PROJECT_OWNER`) ; aucune expression `${{ }}` ne figure dans un bloc `run:`. Pas de `set -e` : chaque appel de `gh` est capturé (`if ! out=$(gh … 2>&1); then …`) et son échec est classé par une fonction `skip` (notice, `exit 0`) ou `fail` (`::error::`, `exit 1`). Un appel jamais n'échoue sans message.

1. **Cible** : sortir en succès si `BRANCH` commence par `dependabot/` ou `release-please--` ; extraire le numéro avec `[[ $BRANCH =~ ^[a-z]+/([0-9]+)- ]]`, sinon sortir en succès.
2. **Project** : `gh project view "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --format json` donne l'identifiant du Project (champ `id`), sans fragment GraphQL par type de propriétaire. Un échec est classé comme ci-dessous.
3. **Issue et carte** : une requête GraphQL (`gh api graphql`, `owner`, `repo` et `n` passés par `-f` et `-F`, jamais dans le texte de la requête, comme le fait déjà l'audit) donne l'état de l'issue et ses cartes avec, pour chacune, l'identifiant du Project et la valeur du champ `Status`. La carte retenue est celle dont le Project a l'identifiant de l'étape 2. Issue fermée ou carte en `Done` : sortir.
4. **PR** : `gh pr list --head "$BRANCH" --state open --json isDraft,isCrossRepository` ; seules les PR dont `isCrossRepository` vaut `false` comptent. Une PR ouverte hors brouillon : cible `In Review` ; sinon `In Progress`. Aucune écriture si la carte a déjà ce statut.
5. **Champ et option** : `gh project field-list "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --format json` donne l'identifiant du champ `Status` et celui de l'option visée.
6. **Écriture, un seul chemin** : la mutation GraphQL `updateProjectV2ItemFieldValue` (`gh api graphql`, `projectId`, `itemId`, `fieldId` et `singleSelectOptionId` passés par `-f`), de la même famille que la lecture. Le modèle n'utilise ni `gh project item-edit` ni repli.

**Classement des erreurs** (exigences « Cas sans effet » et « Échec d'un jeton inutilisable ») :

| Situation | Issue |
|---|---|
| `PROJECT_TOKEN` ou `PROJECT_NUMBER` vide | notice, succès (étape de notice) |
| Issue introuvable (« Could not resolve to an Issue » : numéro inexistant, ou numéro de PR) | notice, succès |
| Issue sans carte dans le Project | notice, succès |
| Option visée absente du champ Status (dont `In Review`) | notice, succès |
| Jeton refusé (401, « Bad credentials »), expiré, scope insuffisant, dépôt inaccessible au jeton (« Could not resolve to a Repository » ; par exemple un PAT sans `repo` sur un dépôt privé) | échec, message qui nomme `PROJECT_TOKEN` et ses scopes `project` et `repo` |
| Toute autre erreur de `gh`, dont un Project introuvable | échec, message de l'API plus un rappel de `PROJECT_TOKEN`, `PROJECT_NUMBER` et `PROJECT_OWNER` |

La classification lit le texte de l'erreur : les messages exacts de l'API ne sont pas établis et se confirment à l'essai manuel ; tout message non reconnu tombe dans la dernière ligne (échec). Écart avec ARCH-019 : ce classement fait échouer un jeton refusé ou expiré, alors que la ligne « Expiration du PAT » des Risques d'ARCH-019 dit « notice » ; le motif est qu'un jeton configuré qui ne marche pas doit se voir et que l'essai du scope `repo` ne doit pas être masqué. Décision du chef de projet ; l'ADR est à aligner par `architect` (tâche 4.5).

### D4. Cas limites

| Cas | Comportement |
|---|---|
| PR qui ferme plusieurs issues | seule la carte de la branche change ; limite consignée dans `pitfalls.md` |
| Deux branches pour la même issue | l'état est celui de la branche de l'événement : un `create` sur la seconde branche, sans PR, remet en `In Progress` une carte en `In Review` par la première ; limite consignée dans `pitfalls.md` |
| Brouillon | `In Progress` ; `ready_for_review` donne `In Review`, `converted_to_draft` revient à `In Progress` |
| PR fermée sans merge | plus de PR ouverte : `In Progress` |
| PR de fork | pas de secret : notice et succès ; une PR de fork ouverte avec le même nom de branche n'est pas comptée (`isCrossRepository`) |
| Dependabot | secret absent, branche ignorée : notice et succès |
| Branche sans numéro, `release-please--…` | succès sans écriture |
| Numéro de la branche qui est celui d'une PR ou d'une issue inexistante | notice et succès |
| `git switch -c` local sans push | aucun événement : `In Progress` à la main ou au premier push |
| Branche créée avant l'arrivée du workflow dans le dépôt | le workflow exécuté est celui de la branche : il n'existe pas, statuts à la main pour cette branche |
| `gh` du runner | présent sur `ubuntu-latest` ; version non établie ; le modèle n'utilise que `gh api graphql`, `gh project view`, `gh project field-list` et `gh pr list` |
| Issue absente du Project (auto-add pas encore passé) | notice et succès ; l'événement suivant rattrape |

### D5. Textes localisés et parité

Seuls les `name:`, les commentaires et les chaînes entre guillemets sont traduits ; le script bash est identique mot pour mot dans les deux modèles, hors chaînes entre guillemets. Les notices et messages d'échec sont des `echo "::notice::…"` ou `echo "::error::…"` à texte fixe, sans nom de branche ni autre donnée d'événement (le message de l'API, lui, peut être repris dans le message d'échec). Les noms `Status`, `In Progress`, `In Review` et `Done` sont des littéraux identiques dans les deux langues.

### D6. `docs/workflow.md` (blocs)

La ligne sous `- **Issue**` devient deux variantes imbriquées, identiques en français et en anglais pour les marqueurs :

```
@@module:projects
@@module:issue-source
  Elle arrive … en *Todo* (auto-add) ; la carte passe en *In Progress* à la création de la branche sur GitHub, en *In Review* à l'ouverture de la PR, automatiques avec le secret, manuels sans (secret Actions `PROJECT_TOKEN`).
@@end
@@module:jira-source
  Les statuts *In Progress* et *In Review* du Project se règlent à la main : aucun workflow n'est généré en mode `jira`.
@@end
@@end
```

La version anglaise écrit « automatic with the secret, manual without (Actions secret `PROJECT_TOKEN`) ». L'imbrication est le seul ET possible (`a|b` est un OU). En mode `jira` (ARCH-017), le ticket remplace l'issue : la phrase ne dit plus que l'issue arrive en *Todo* par auto-add et se borne à dire que les deux statuts sont manuels. Le test de parité de `tests/scaffold.test.mjs` compare les marqueurs : l'anglais reproduit la même imbrication.

### D7. ARCH-004 généré

La ligne Projects du bloc `@@module:projects` (français et anglais) ajoute : *In Progress* et *In Review* par le workflow `project-status.yml`, inactif tant que le secret `PROJECT_TOKEN` n'existe pas, ce qui vaut accord explicite (même formule que pour `SONAR_TOKEN`). Le texte est conditionné aussi par `issue-source` (imbrication) puisque rien n'est généré en mode `jira` ; sans cette condition, ARCH-004 mentionnerait un workflow absent.

### D8. Documentation du skill

- `github-setup.md` étape 4 : la mutation `updateProjectV2Field` pour *In Review* existe déjà ; sont ajoutés les workflows intégrés à activer (*Auto-add*, *Item added → Todo*, *Item closed*, *Pull request merged*), « Pull request linked to issue » à désactiver en mode secret, le PAT classique (scope `project`, `repo` selon l'essai, expiration courte), `gh secret set PROJECT_TOKEN`, `gh variable set PROJECT_NUMBER` (et `PROJECT_OWNER` si le Project n'appartient pas au propriétaire du dépôt), avec l'accord de l'utilisateur avant chaque commande qui écrit. Les exemples de jeton s'écrivent sans préfixe réel (`<jeton>`).
- `pitfalls.md` : les limites listées par le spec « Pièges consignés » ; noms exacts des options du Project (`Status`, `In Progress`, `In Review`, `Done`) ; le scope `repo` est noté non essayé tant qu'aucun essai n'a eu lieu ; le résultat de l'essai y est consigné après coup.
- `SKILL.md` : les créations du secret et des variables rejoignent ce qui reste manuel, comme pour `sonar`.

### D9. Tests

- `tests/projects.test.mjs` du module (même squelette que `sonar.test.mjs`) :
  - présence avec `github` et `projects`, absence sans `projects`, absence avec `jira` et `jiraSource: jira` (`projects` ne fait pas partie de la combinaison `jira-source` de la matrice, seul ce test couvre l'absence), refus avec `gitlab` (code 1, aucun fichier) ;
  - lecture textuelle du bloc `on:` : déclencheurs exacts ; `permissions: {}` ; groupe de concurrence et `cancel-in-progress: false` ; absence de `push`, `synchronize`, `pull_request_target`, `workflow_dispatch` ;
  - portée : `PROJECT_TOKEN`, `PROJECT_NUMBER`, `PROJECT_OWNER` et `BRANCH` dans l'environnement du job, `GH_TOKEN` seulement sur l'étape de mise à jour ; affectations de ces valeurs réduites à des expressions `secrets.`/`vars.` ;
  - étapes conditionnées par `env`, aucun `secrets` dans une condition de job, aucun `${{` dans un bloc `run:`, `uses:` épinglés ou absents ;
  - littéraux `Status`, `In Progress`, `In Review`, `Done` dans les deux langues ;
  - `--update` : le fichier et l'entrée du manifeste sont retirés pour imiter un projet antérieur, puis `--update` rapporte le fichier créé et un second `--update` ne change rien ;
  - `docs/workflow.md` et ARCH-004 dans les deux langues, avec et sans `projects`, avec `jiraSource: jira`.
- La syntaxe bash du script n'est pas contrôlée par la suite (le script vit dans le YAML, aucune extraction n'existe) ; elle l'est à l'essai manuel. Un contrôle `bash -n` sur le script extrait reste possible mais ajoute une dépendance à bash dans une suite lancée aussi sous Windows : non retenu.
- `tests/matrix.test.mjs` : le refus de `ghp_` et `github_pat_` entre dans `invariants()` (donc dans chaque combinaison, fichiers générés seulement), avec une ligne d'autocontrôle (tampon synthétique).
- Instantanés relus après `UPDATE_SNAPSHOTS=1` : les dix combinaisons qui contiennent `projects` (`projects`, `default`, `default-stack`, `default-cli-user`, `default-cli-local`, `default-en`, `full`, `full-en`, `full-public`, `full-legacy`) gagnent `project-status.yml` et changent `docs/workflow.md` ; ARCH-004 change dans celles qui ont aussi `archgate` (`default*`, `full*`). `jira-source` ne change pas : elle ne contient pas `projects`.
- Essai manuel (hors suite, tâche 6.1) : voir Risques.

## Risks / Trade-offs

- **Scénarios d'exécution non essayés à l'archivage** : la dérivation du statut, l'ordre des événements, le jeton refusé, la classification des messages d'erreur, le besoin du scope `repo` ne sont exercés que par l'essai manuel qui suit le merge, avec l'accord explicite de l'utilisateur pour chaque écriture externe (PAT, secret, variable, option *In Review*, désactivation de « Pull request linked to issue »). À l'archivage, la spec décrit un comportement que la suite automatique ne prouve pas.
- **Exfiltration du secret par un collaborateur en écriture** (workflow de la branche) → droit d'écriture réservé aux personnes de confiance, expiration courte, scope minimal ; consigné dans `pitfalls.md` et arc42 §11.
- **Concurrence avec « Pull request linked to issue »** (retour en *In Progress* après *In Review*) → désactivation documentée ; sans elle, l'Action ne corrige qu'à l'événement suivant.
- **Scope `repo` exigé ou non** → non établi ; un PAT sans `repo` sur un dépôt privé fait échouer l'étape avec un message qui nomme les scopes, ce qui rend l'essai lisible.
- **Échec visible à l'expiration du PAT** : chaque PR et chaque branche affichent un job rouge jusqu'au renouvellement (procédure dans `github-setup.md`), au lieu d'une notice (voir D3 pour l'écart avec ARCH-019).
- **Messages d'erreur de l'API non établis** : la classification repose sur le texte ; un message inattendu tombe en échec, jamais en succès silencieux.
- **Exécution tardive après un merge** : une exécution en attente peut lire une PR plus ouverte et une issue pas encore fermée, et écrire *In Progress* avant *Done* → l'étape « carte en *Done* : rien » et l'ordre d'arrivée de *Done* (workflow intégré, ensuite) limitent l'effet ; risque faible, observé à l'essai.
- **Minutes Actions en dépôt privé** → un job de quelques secondes par événement ; inactif et rapide sans secret.
