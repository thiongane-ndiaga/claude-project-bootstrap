# Tasks

## 1. Test de cohérence (écrit d'abord, il doit échouer)

- [x] 1.1 Dans `tests/scaffold.test.mjs`, bloc « docs/workflow.md : qui fait quoi », ajouter à la boucle langue × configuration l'extraction des jetons entre accents graves de toute la troisième cellule de la ligne `developer`, le contrôle de la parenthèse (entrées entre accents graves jointes par `, `), l'extraction de `writeExcept` du hook généré (lecture du texte, regex, `JSON.parse`) et une comparaison stricte (mêmes entrées, même nombre, même ordre) dont le message nomme les entrées manquantes, en trop, répétées et l'ordre ; vérifier que `node tests/scaffold.test.mjs` échoue sur les modèles actuels en nommant les huit entrées absentes (`.release-please-manifest.json`, `agents.md`, `claude.md`, `openspec/changes/archive/`, `openspec/config.yaml`, `openspec/config.yml`, `openspec/schemas/`, `release-please-config.json`) et l'ordre différent (`openspec/specs/` avant `docs/workflow.md` dans le tableau)
- [x] 1.2 Ajouter au même bloc le contrôle de la fonction de comparaison sur des copies altérées (entrée retirée, entrée ajoutée, deux entrées permutées, entrée citée deux fois, liste vide) ; vérifier que chaque altération est signalée, avec l'entrée nommée, et qu'une liste vide extraite du hook fait échouer le test

## 2. Modèles fr et en

- [x] 2.1 Dans `skills/project-bootstrap/assets/modules/core/templates/docs/workflow.md`, remplacer la cellule d'écriture de la ligne `developer` par la cellule du design (17 entrées de `writeExcept`, même ordre, « dossiers et fichiers de gouvernance », phrase sur la casse) ; vérifier que la liste extraite égale `writeExcept` du modèle de hook français
- [x] 2.2 Même changement dans `skills/project-bootstrap/assets/modules/core/templates.en/docs/workflow.md` (« governance folders and files », « compared case-insensitively ») ; vérifier que la liste extraite égale `writeExcept` du modèle de hook anglais
- [x] 2.3 Lancer `node tests/scaffold.test.mjs` et vérifier que le nouveau contrôle passe pour fr et en, dans les trois configurations (tous les profils, aucun profil, `agent-profiles` seul)

## 3. Instantanés de la matrice

- [x] 3.1 Lancer `node tests/matrix.test.mjs` et vérifier qu'elle échoue seulement sur `agent-profiles`, `agent-profiles-main`, `agent-profiles-optional`, `advisor`, `advisor-on`, `full`, `full-en` et `full-public`, pour le seul fichier `docs/workflow.md` (aucun `full-legacy`, aucun autre fichier)
- [x] 3.2 Réécrire avec `UPDATE_SNAPSHOTS=1 node tests/matrix.test.mjs`, relire le diff de `tests/snapshots/` (huit fichiers, une seule ligne `docs/workflow.md` chacun) et vérifier que `node tests/matrix.test.mjs` passe

## 4. Documentation

- [x] 4.1 Dans `skills/project-bootstrap/references/pitfalls.md`, ligne 96 : « dossiers de gouvernance » devient « dossiers et fichiers de gouvernance » ; ligne 99 : ajouter qu'une entrée ajoutée à `writeExcept` oblige à modifier les deux hooks (fr et en) et les deux modèles de `workflow.md`, sinon le test de cohérence échoue ; vérifier par relecture du diff et `node .claude/hooks/quality-gate.mjs`
- [ ] 4.2 `architect` (skill `arc42-update`) complète `docs/architecture/arc42/11-risques-et-dette-technique.md` ligne 29 : la mitigation « tenir la liste à jour dans la table » cite le test de cohérence entre le tableau de `workflow.md` et `writeExcept` ; vérifier que `docs/architecture/arc42/08-concepts-transverses.md` (lignes 126 à 128) n'appelle aucune modification (exemples cohérents) et signaler à `project-lead` la contradiction sur les liens et jonctions d'ARCH-011 (ligne 65) et de `pitfalls.md` (ligne 96), hors de ce changement

## 5. Contrôles

- [x] 5.1 `node .bootstrap/run-checks.mjs` passe, `node .claude/hooks/quality-gate.mjs` passe, `archgate check` passe
- [x] 5.2 `openspec validate 169-developer-governance-list --strict --no-interactive` puis `openspec validate --all --strict --no-interactive` passent

## Workflow follow-up

- Relecture du changement par `qa-engineer`, avant et après l'apply.
- Archivage par `project-lead` (`openspec archive 169-developer-governance-list --yes`) dans la PR (`Closes #169`).
- Le `docs/workflow.md` du dépôt reste hors de ce changement : l'utilisateur, ou une session sans `mainAgent`, le rafraîchit (`project-lead` n'écrit rien) ; un suivi sera proposé par le chef de projet.
