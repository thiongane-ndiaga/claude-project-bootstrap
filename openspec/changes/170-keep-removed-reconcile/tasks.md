# Tasks

## 1. Référence de base figée pendant keep

- [x] 1.1 Dans la branche `keep` ou `owned` de `scaffold.mjs`, conserver `generated` de l'entrée antérieure pour un fichier non `owned` et non fusionné par lignes ou JSON (`merge` absent) qui a une entrée ; `owned`, fichiers fusionnés et premier passage inchangés. Vérifier : après un `--update` à modèle changé, `manifest.files[<fichier>].generated` d'un fichier dans `keep` est inchangé et `sha256` suit le fichier.
- [ ] 1.2 Tests dans `tests/scaffold.test.mjs` (section de la fusion à trois voies, plugins factices `p1`/`p2`) : « Modèle changé pendant keep » (fichier, base et `generated` inchangés) ; « Ajout à keep avec modèle changé » (ajout à `keep` et passage à `p2` ensemble : `generated` reste celui de `p1`, base intacte) ; « Fichier dans keep dès la première génération » (aucune base, `generated` = modèle). Vérifier : `node tests/scaffold.test.mjs` passe.

## 2. Fichier retiré de keep réconcilié

- [x] 2.1 Dans `scaffold.mjs` : retirer la garde `before.status !== "kept"` de la règle de fusion ; ne la retirer de la règle `customized` que pour un fichier non fusionné par lignes ou JSON, non `owned`, dont la base existe ; mettre à jour le commentaire de règles et les commentaires de définition du manifeste (`generated` = empreinte du modèle, sauf pour une entrée `kept` où il désigne la base ; ajouter le statut `reconciled` à la liste des statuts). Vérifier : relecture des commentaires et tests 2.2 à 2.5.
- [ ] 2.2 Tests de fusion : retrait de `keep` par `--update --config` sans la clé, base valide sans conflit (`reconciled`, statut `reconciled`, base = nouveau modèle, code 0) ; avec conflit (code 3, fichier intact, proposition avec marqueurs sous `diffs` avec `--diff`, base et entrée inchangées) ; chemin de l'issue : édition de `config.keep` dans le manifeste puis `--update` sans `--config` ; fichier en CRLF (fins de ligne restituées). Vérifier : les contrôles passent.
- [ ] 2.3 Tests de repli : base absente (conflit, diff simple, pas `baseInvalid`) ; base altérée, modèle changé (conflit et `baseInvalid`) ; manifeste dérivé, modèle changé (`generated` rafraîchi, base d'avant `keep` : conflit et `baseInvalid`) ; manifeste dérivé, modèle inchangé (`customized`, base réancrée sur le modèle actuel, pas de `baseInvalid`) ; fichier dans `keep` dès la première génération, retiré, modèle inchangé (conflit) puis `--adopt` (`adopted`). Vérifier : aucune exception, fichier intact, codes de sortie attendus.
- [ ] 2.4 Tests des cas restants : fichier toujours dans `keep` (`kept`, intact) ; retrait avec base et modèle inchangé (`customized`, entrée intacte) ; `--dry-run` (`reconciled` rapporté, ni fichier, ni base, ni manifeste écrits) ; `--adopt` sur conflit puis seconde mise à jour (`customized`, aucune écriture, pas de clé `manifest`). Vérifier : les contrôles passent.
- [ ] 2.5 Tests de non-régression : `.gitignore` dans `keep` puis retiré, modèle inchangé puis modèle changé (fusion par lignes comme avant, ni base ni `reconciled`) ; fichier `owned` modifié non touché ni signalé ; plusieurs fichiers retirés d'un coup (un fusionné, un en conflit : `reconciled` et `conflicts` cumulés, code 3) ; fichier retiré de `keep` et supprimé du projet (recréé). Vérifier : les contrôles passent.
- [ ] 2.6 Vérifier que `tests/matrix.test.mjs` et `tests/snapshots/` n'ont pas bougé (`git status` ne liste aucun instantané modifié) et que `node .bootstrap/run-checks.mjs` passe.

## 3. Documentation

- [ ] 3.1 Mettre à jour `skills/project-bootstrap/references/versioning.md` : ligne du tableau et section « Base et fusion à trois voies » (la base et `generated` ne bougent pas pendant `keep` ; un fichier retiré de `keep` est réconcilié, avec base ; sans base, conflit puis `--adopt` ; un fichier jamais modifié peut rester `reconciled` et une entrée `kept` hors `keep` peut le rester sans effet) ; ligne « ni `keep` » précisée ; procédure de réparation d'un manifeste déjà dérivé : (a) avant le premier `--update` sans `keep`, mettre `generated` = sha256 du `.base` normalisé en LF ; (b) en cas de conflit, fusionner à la main avec le diff puis `--adopt` ; (c) modèle inchangé : la base est réancrée sur le modèle actuel ; `ARCH-005` de ce dépôt est dans le même cas que `docs/workflow.md`. Vérifier par relecture que les termes concordent avec la spec.
- [ ] 3.2 Mettre à jour `skills/project-bootstrap/references/bootstrap-config.md` (clé `keep`) : retirer un fichier de `keep` le rend réconciliable à la mise à jour suivante, sans toucher au manifeste. Vérifier : phrase présente et cohérente avec `versioning.md`.
- [ ] 3.3 Mettre à jour `skills/project-bootstrap/SKILL.md` : tableau « Situation du fichier » (ligne `keep`) et conseil de la section « Dépôt déjà équipé » (consigner dans `keep`, retirable ensuite) ; phase 5, étape 4 (`reconciled` : y compris un fichier retiré de `keep`, fusionné à partir de sa base d'avant `keep`, à relire ; `baseInvalid` et manifeste dérivé : renvoi à la procédure de `versioning.md`). Vérifier : `node .bootstrap/run-checks.mjs` passe.
- [ ] 3.4 Ajouter à `skills/project-bootstrap/references/pitfalls.md` le piège du manifeste dérivé (fichier resté longtemps dans `keep` avant ce changement : réparation de `generated`, ou `--adopt`). Vérifier : entrée présente, avec renvoi à `versioning.md`.
- [ ] 3.5 Faire mettre à jour par `architect` (skill `arc42-update`) arc42 §5 (brique `scaffold.mjs`), §8 si le concept de manifeste y est décrit, et §11 (risque du manifeste dérivé, mitigation), et ajouter une ligne dans les « Suites » d'ARCH-006 : `generated` figé pendant `keep` désigne la base (#170). Vérifier : `archgate check` passe et les sections modifiées citent ARCH-006.

## 4. Contrôles d'ensemble

- [ ] 4.1 `node .bootstrap/run-checks.mjs` passe (tests de comportement, matrice, état).
- [ ] 4.2 `node .claude/hooks/quality-gate.mjs` renvoie 0.
- [ ] 4.3 `archgate check` passe.
- [ ] 4.4 `openspec validate --all --strict --no-interactive` passe.

## Workflow follow-up

- Branche `fix/170-keep-removed-reconcile`, PR `Closes #170` ; archivage du changement dans la PR (`openspec archive 170-keep-removed-reconcile --yes` avec `agent-profiles`).
- La spec en vigueur `generated-files-update` est mise à jour par l'archivage ; aucune édition directe.
- Proposer une issue séparée pour le texte de l'écart `bases` de `audit.mjs`.
