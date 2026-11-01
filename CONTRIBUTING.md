# Contribuer

## Avant de commencer
- Ouvre une issue (formulaire « Bug » ou « Fonctionnalité ») avant toute modification importante.
- Une PR par issue, depuis une branche `<type>/<issue>-<slug>` (ex. `fix/16-npm-prefix`).

## Conventions
- **Commits et titres de PR** : Conventional Commits, en anglais (`feat`, `fix`, `docs`, `chore`, …). Squash merge : le titre de la PR devient le message du commit.
- **Langue** : documentation, issues et descriptions de PR en français ; identifiants, noms de fichiers techniques, branches et commits en anglais.
- **Aucun nom de projet extérieur** (client, employeur, dépôt privé) dans les fichiers, issues, PR ou messages de commit.
- **Modèles** (`skills/project-bootstrap/assets/templates/`) : blocs conditionnels `@@module:…` et paramètres `{{…}}`. Ne modifie pas la version dans `.claude-plugin/plugin.json` : release-please l'incrémente à la release d'après les types de commits (`feat`, `fix`). Le cache du plugin est indexé par cette version, donc une modification n'atteint les utilisateurs qu'à la release suivante.
- Un changement de modèle, de catalogue ou de migration touche les projets générés : utilise le scope `templates`, `scaffold` ou `migrations` (`fix(templates): …`). Voir `skills/project-bootstrap/references/versioning.md`.
- Un piège découvert à l'usage va dans `skills/project-bootstrap/references/pitfalls.md`.

## Vérifier avant d'ouvrir la PR
```
node tests/scaffold.test.mjs     # comportements du générateur, de la mise à jour, des migrations, de l'audit
node tests/matrix.test.mjs       # matrice des modules, instantanés, validation par les CLI réelles
node .bootstrap/run-checks.mjs   # les deux, comme la CI et le pre-push
```
Node.js ≥ 20.19. Les tests doivent passer sous Linux, Windows et macOS (séparateurs de chemins, fins de ligne, bit exécutable).

### La matrice et ses instantanés
`tests/matrix.test.mjs` génère 15 combinaisons de modules (déduites du catalogue : `core` seul, chaque module avec ses dépendances, sélection par défaut, avec stack, complète, complète en public), vérifie des invariants (aucun paramètre ou marqueur restant, JSON valides, manifeste complet, aucun CRLF), la reproductibilité, et compare la liste des fichiers et leur empreinte SHA-256 à `tests/snapshots/<combinaison>.json`. Elle prend une dizaine de secondes (davantage sous Windows) : le hook `TaskCompleted` et le `pre-push` l'exécutent aussi.

- **Un modèle change** : les instantanés concernés échouent en nommant les fichiers. Si le changement est voulu, `UPDATE_SNAPSHOTS=1 node tests/matrix.test.mjs`, puis **relis le diff des instantanés dans la PR** : c'est la liste exacte de ce qui change chez les projets générés. La variable est refusée quand `CI` est défini.
- **Un module est ajouté ou retiré du catalogue** : sa combinaison apparaît (instantané manquant) ou son instantané devient orphelin; la même commande règle les deux.
- **Les CLI réelles** : sur les sélections par défaut et complète, la matrice lance `openspec init`, `openspec validate`, `openspec doctor`, `archgate check` et l'audit sur le projet généré. En CI (`CI` défini) `openspec` et `archgate` doivent être installés ; en local, une CLI absente est ignorée avec un message.

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
