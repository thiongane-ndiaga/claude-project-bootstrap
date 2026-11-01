# Contribuer

## Avant de commencer
- Ouvre une issue (formulaire « Bug » ou « Fonctionnalité ») avant toute modification importante.
- Choisis une issue dans la feuille de route ([#52](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/52)) : elle donne l'ordre et les dépendances, et les priorités sont dans le [Project](https://github.com/users/thiongane-ndiaga/projects/4).
- Une PR par issue, depuis une branche `<type>/<issue>-<slug>` (ex. `fix/16-npm-prefix`).

## Conventions
- **Commits et titres de PR** : Conventional Commits, en anglais (`feat`, `fix`, `docs`, `chore`, …). Squash merge : le titre de la PR devient le message du commit.
- **Langue** : documentation, issues et descriptions de PR en français ; identifiants, noms de fichiers techniques, branches et commits en anglais.
- **Aucun nom de projet extérieur** (client, employeur, dépôt privé) dans les fichiers, issues, PR ou messages de commit.
- **Modèles** (`skills/project-bootstrap/assets/modules/<module>/templates/`) : blocs conditionnels `@@module:…` et paramètres `{{…}}`. Ne modifie pas la version dans `.claude-plugin/plugin.json` : release-please l'incrémente à la release d'après les types de commits (`feat`, `fix`). Le cache du plugin est indexé par cette version, donc une modification n'atteint les utilisateurs qu'à la release suivante.
- Un changement de modèle, de catalogue ou de migration touche les projets générés : utilise le scope `templates`, `scaffold` ou `migrations` (`fix(templates): …`). Voir `skills/project-bootstrap/references/versioning.md`.
- Un piège découvert à l'usage va dans `skills/project-bootstrap/references/pitfalls.md`.

## Vérifier avant d'ouvrir la PR
```
node tests/scaffold.test.mjs     # comportements du générateur, de la mise à jour, des migrations, de l'audit
node tests/matrix.test.mjs       # matrice des modules, instantanés, validation par les CLI réelles
node tests/state.test.mjs        # état de reprise du bootstrap et journal des effets globaux
node .bootstrap/run-checks.mjs   # les trois, comme la CI et le pre-push
```
Node.js ≥ 20.19. Les tests doivent passer sous Linux, Windows et macOS (séparateurs de chemins, fins de ligne, bit exécutable).

### La matrice et ses instantanés
`tests/matrix.test.mjs` génère 15 combinaisons de modules (déduites du catalogue : `core` seul, chaque module avec ses dépendances, sélection par défaut, avec stack, complète, complète en public), vérifie des invariants (aucun paramètre ou marqueur restant, JSON valides, manifeste complet, aucun CRLF), la reproductibilité, et compare la liste des fichiers et leur empreinte SHA-256 à `tests/snapshots/<combinaison>.json`. Elle prend une dizaine de secondes (davantage sous Windows) : le hook `TaskCompleted` et le `pre-push` l'exécutent aussi.

- **Un modèle change** : les instantanés concernés échouent en nommant les fichiers. Si le changement est voulu, `UPDATE_SNAPSHOTS=1 node tests/matrix.test.mjs`, puis **relis le diff des instantanés dans la PR** : c'est la liste exacte de ce qui change chez les projets générés. La variable est refusée quand `CI` est défini.
- **Un module est ajouté ou retiré du catalogue** : sa combinaison apparaît (instantané manquant) ou son instantané devient orphelin; la même commande règle les deux.
- **Les CLI réelles** : sur les sélections par défaut et complète, la matrice lance `openspec init`, `openspec validate`, `openspec doctor`, `archgate check` et l'audit sur le projet généré. En CI (`CI` défini) `openspec` et `archgate` doivent être installés ; en local, une CLI absente est ignorée avec un message.

### Ajouter ou modifier un module
Un module est un dossier `skills/project-bootstrap/assets/modules/<nom>/` qui se décrit lui-même (ARCH-010) : **ajouter un module ne demande de modifier aucun fichier du plugin hors de son dossier.**

```
assets/modules/<nom>/
  module.json         description (obligatoire), requires, default, conflicts, questions, files
  templates/          modèles français, rangés par chemin de destination
  templates.en/       version anglaise des modèles qui ont du texte
  tests/*.test.mjs    tests du module (lancés par tests/modules.test.mjs)
```

- **Descripteur** : `files` liste les fichiers générés, chacun `{ "path": …, "when": […], "merge": "lines|json", "owned": true }`. Le module qui déclare un fichier en est propriétaire et doit être choisi ; `when` ne liste que les modules **supplémentaires** nécessaires (ou des pseudo-modules : `visibility-private`, `stack-chosen`, `cli-local`…). `questions` sont posées à la phase 0 quand le module est choisi.
- **Propriété** : un chemin n'a qu'un propriétaire. Les fichiers transverses (`CLAUDE.md`, `docs/workflow.md`) sont à `core`, les ADR d'outillage ARCH-001 à ARCH-005 à `archgate` (un seul numéro `ARCH-NNN` par ADR), les formulaires d'issues à `github`. Les blocs `@@module:…` d'un fichier peuvent citer d'autres modules.
- **Chemins réservés** : `.claude/settings.json`, `package.json`, `.bootstrap/manifest.json`, `.bootstrap/base/**`, `.bootstrap/local/**` et `.git/**` sont écrits par le générateur ou par `state.mjs` ; un module ne peut pas les déclarer. Les permissions de `settings.json` par module restent dans `scaffold.mjs` (`buildSettings`).
- **Vérifier** : `node skills/project-bootstrap/scripts/scaffold.mjs --list-modules` valide le catalogue (code 1 et fichier fautif nommé, sinon) ; `node .bootstrap/run-checks.mjs` lance les tests. La matrice génère la combinaison du nouveau module et échoue sur son instantané manquant : `UPDATE_SNAPSHOTS=1 node tests/matrix.test.mjs`, puis relire le diff (les instantanés sont des artefacts de test, pas des fichiers du plugin).
- **Limites** : les étapes de `state.mjs`, les contrôles de `audit.mjs`, les migrations et les permissions de `settings.json` citent les modules par leur nom hors du dossier du module.

### Langues de la documentation générée
Dans chaque module, les modèles de référence (`templates/`) sont en français ; `templates.en/` contient la version anglaise des seuls modèles qui ont du texte (ARCH-008). Les modèles sans texte (JSON, YAML d'outillage) sont partagés. **Un changement de modèle s'applique aux deux versions dans la même PR.** Les noms de fichiers sont identiques dans toutes les langues.

- **Parité** (`tests/scaffold.test.mjs`) : mêmes lignes `@@module`/`@@end` et mêmes paramètres `{{…}}` que le modèle français ; pour les scripts, même code une fois retirés les chaînes et les commentaires (les littéraux de regex des hooks sont conservés) ; pour les YAML, même structure sans les commentaires ni les libellés ; un modèle sans version anglaise ne contient aucune lettre accentuée ; un fichier de `templates.en/` sans équivalent dans le `templates/` de son module est refusé par le chargeur. Le test ne voit pas un écart de sens : la relecture de PR reste nécessaire.
- **Ajouter une langue `<code>`** : dans chaque module qui a des modèles anglais, copier `templates.en/` vers `templates.<code>/` (le module `core` fournit la langue : une langue absente de `core` est refusée), traduire (texte, commentaires, messages des scripts), ajouter la table de paramètres de la langue dans `scripts/scaffold.mjs` (`LANG_PARAMS`), adapter les statuts d'ADR de `ARCH-003-….rules.ts` et le vocabulaire des sections de statut, puis lancer `node .bootstrap/run-checks.mjs` (une combinaison `default-<code>` se déduit en ajoutant la langue à la matrice).
- **Ce qui n'est pas traduit** : `SKILL.md`, les messages du plugin, les fichiers de `openspec init` (langue donnée par `--language`).

### Évaluation du skill (`claude plugin eval`) : écartée en CI, essai local possible
**Décision** : l'évaluation du comportement de `SKILL.md` n'est pas lancée en CI. Elle exécute de vrais agents Claude sur le compte de la personne qui la lance, avec des juges LLM et une limite de débit partagée : elle n'est ni déterministe, ni gratuite, et exigerait des identifiants dans la CI.

**Essai local (2026-11-01)** : trois cas minimaux dans `evals/` (le skill se déclenche sur une demande de mise en place ; il garde la main de l'utilisateur malgré « sans poser de questions » ; il reste silencieux sur une question sans rapport). Résultat : 3 cas sur 3 réussis, pour environ 0,50 $ avec un plafond de 3 $. Un essai est donc possible et utile avant de modifier `SKILL.md` en profondeur, mais il ne remplace pas les tests déterministes.

Pour le relancer (sur ton compte, coût plafonné ; les résultats vont dans `evals/results/`, ignoré par git) :
```
claude plugin eval . --runs 1 --max-cost-usd 3 --trust-plugin --no-publish
```
Le mode par défaut compare avec une exécution sans le plugin (ablation) : les graders `tool_used: Skill` y sont un indicateur de déclenchement, pas une note.

## Licence
En contribuant, tu acceptes que ta contribution soit publiée sous la licence MIT du dépôt (`LICENSE`).
