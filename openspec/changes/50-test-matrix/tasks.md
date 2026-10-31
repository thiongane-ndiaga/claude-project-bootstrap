## 1. Matrice et invariants

- [x] 1.1 Créer `tests/matrix.test.mjs` : aides de génération (configuration déterministe, processus enfant, dossier temporaire), combinaisons déduites du catalogue (fermeture des `requires`, défaut, défaut avec stack, complet, complet public), nombre attendu calculé; vérifier : chaque module du catalogue a sa combinaison et la génération de chacune réussit.
- [x] 1.2 Invariants de génération (paramètres et marqueurs restants, JSON valides, manifeste complet, clés sans antislash, aucun CRLF, bases égales et présentes hors fichiers fusionnés ou `owned`); vérifier par des tests de mutation sur un faux dossier : chaque problème est détecté, et `${{ matrix.os }}` n'est pas confondu avec un paramètre.
- [x] 1.3 Reproductibilité et mise à jour neutre (deux générations identiques, `--update --dry-run` immédiat sans effet sur toutes les listes du rapport); vérifier sur toutes les combinaisons.

## 2. Instantanés

- [x] 2.1 Calcul et comparaison (chemin trié avec `/`, SHA-256 des octets, manifeste sans empreinte, `.bootstrap/base/` exclu), échec explicite (ajoutés, retirés, modifiés + commande), échec si manquant ou orphelin, `UPDATE_SNAPSHOTS=1` (réécrit et supprime les orphelins), refus de la variable quand `CI` est défini; vérifier par des tests de l'aide sur un faux instantané et à la main (CI + variable → échec; instantané orphelin → échec; un modèle modifié → instantané en échec nommant le fichier).
- [x] 2.2 Générer et versionner `tests/snapshots/*.json` (une combinaison chacun); vérifier : relance sans variable = tout passe; la version du plugin sans effet sur un instantané.

## 3. Validation par les CLI réelles

- [x] 3.1 Validation des sélections par défaut et complète (D6) : génération avec les versions installées, dépôt git indépendant du poste, `openspec init` sans modification de fichier suivi, `openspec validate`, `openspec doctor` (racine = projet), `archgate check`, audit sans écart ni non vérifiable; CLI absentes ignorées outil par outil avec message hors CI, échec en CI; test de la politique `missingPolicy`.

## 4. Intégration, documentation et évaluation du skill

- [x] 4.1 Ajouter la commande de la matrice à `.bootstrap/checks.json`; vérifier : `node .bootstrap/run-checks.mjs` la lance (code 0) et échouerait si la matrice échouait.
- [ ] 4.2 `CONTRIBUTING.md` : lancer les tests (les deux fichiers), mettre à jour les instantanés (`UPDATE_SNAPSHOTS=1`) et relire leur diff dans la PR, durée de la matrice; `CLAUDE.md` et le modèle de PR de ce dépôt citent aussi la matrice.
- [ ] 4.3 Essai local de `claude plugin eval` plafonné par `--max-cost-usd` (cas minimal du déclenchement du skill), résultat et coût relevés; consigner la décision dans `CONTRIBUTING.md` (écartée en CI avec la raison; usage local décrit).
- [ ] 4.4 `node .claude/hooks/quality-gate.mjs` renvoie 0 localement et la CI de la PR est verte sur les trois systèmes (mêmes empreintes).

## Workflow follow-up
- `/opsx:archive` dans la PR, avant le merge.
