# Tasks

## 1. Correction de l'écart `bases` dans l'audit

- [x] 1.1 Dans `checkUpdate` de `skills/project-bootstrap/scripts/audit.mjs`, répartir `report.baseInvalid` en deux groupes d'après `ctx.manifest.files?.[chemin]?.status` (non `kept` ; `kept` ou entrée absente), garder l'identifiant `bases` et le message `bases de fusion invalides : <liste>`, et composer la correction avec les deux clauses de `design.md` (décision 2), jointes par ` | ` (` ; ` reste le séparateur interne d'une clause) dans l'ordre « altérée » puis « kept », sans aucun appel à git ni calcul d'empreinte. Vérifier : relecture contre `design.md` ; la correction ne contient ni « supprim » ni « reconstitu ».
- [x] 1.2 Tests dans `tests/scaffold.test.mjs`, section de l'audit (à côté de « piège : base de fusion altérée -> écart », avec `canned()` et une copie du projet sain dont le statut d'entrée est modifié, sur le modèle de `p2` ; le rapport simulé met le fichier dans `baseInvalid` **et** dans `conflicts`, comme `scaffold.mjs` le fait, et chaque test vérifie les deux écarts, `mise-a-jour` et `bases`) : base altérée (entrée `created` : message nommant le fichier, correction avec `.bootstrap/base/<fichier>.base`, `git log -p --` et le repli `--adopt`) ; manifeste dérivé (entrée `kept` : les deux causes, `references/versioning.md`, « Manifeste dérivé par une version antérieure », repli `--adopt`, sans « supprim » ni « reconstitu ») ; entrée absente du manifeste (même correction que `kept`) ; deux bases de natures différentes (un seul écart `bases`, deux clauses séparées par ` | `, chacune nommant son fichier) ; aucun `baseInvalid` : `bases` ok ; sortie `--json` et sortie lisible (`correction :`). Conserver l'assertion existante (statut `ecart`) et la table de la ligne 1783 (`bases`). Vérifier : `node tests/scaffold.test.mjs` passe, et un test échoue si l'ancien conseil est rétabli.

## 2. Documentation

- [x] 2.1 Mettre à jour `skills/project-bootstrap/references/versioning.md` : ligne 20 du tableau (« base altérée, ou manifeste dérivé »), entrée « Reconnaître la cause » dans la section « Manifeste dérivé par une version antérieure » (historique : un commit où le `.base` change sans que `generated` du manifeste prenne son empreinte indique une base altérée, à restaurer à la version dont l'empreinte LF égale `generated` ; un commit où `generated` change pendant `keep` sans que le `.base` change indique un manifeste dérivé ; le raccourci du sha256 de (a) valide une base altérée et n'est sûr que si elle ne l'a pas été ; repli sans git : `--diff`, fusion manuelle, `--adopt`), et phrase du paragraphe « Audit d'un projet » (le conseil de l'écart `bases` dépend du statut de l'entrée, et ne conseille pas de supprimer la base). Vérifier : les termes concordent avec `specs/project-audit/spec.md` et `design.md`.
- [x] 2.2 Ajouter une phrase à `skills/project-bootstrap/references/pitfalls.md` (entrée « Mise à jour et `keep` (#170) ») : l'écart `bases` de l'audit renvoie à cette procédure pour une entrée `kept`. Relire `SKILL.md` (ligne 128, ligne 102) : aucun changement attendu, car il ne cite pas le conseil de suppression ; en cas de doute, aligner « liste les bases altérées » sur « altérées ou dérivées ». Vérifier : `grep` de « supprimer la base » dans `skills/` ne trouve plus rien.
- [ ] 2.3 Demander à `architect` (skill `arc42-update`) de compléter arc42 : aucune section ne décrit l'écart `bases` ; ajouter à la ligne « Manifeste dérivé » du §11 (ligne 74) la réserve que le raccourci « `generated` = sha256 du `.base` » valide une base altérée, avec renvoi à l'écart `bases` de l'audit, qui oriente d'après le statut de l'entrée. Vérifier : la ligne modifiée cite ARCH-006 ; `archgate check` passe.

## 3. Contrôles d'ensemble

- [x] 3.1 `node .bootstrap/run-checks.mjs` passe (tests de comportement, matrice, état) ; `tests/snapshots/` n'est pas modifié (`git status`).
- [x] 3.2 `node .claude/hooks/quality-gate.mjs` renvoie 0.
- [x] 3.3 `archgate check` passe.
- [x] 3.4 `openspec validate --all --strict --no-interactive` passe.

## Workflow follow-up

- Branche `fix/177-audit-bases-advice`, PR `Closes #177` ; archivage du changement dans la PR (`openspec archive 177-audit-bases-advice --yes` avec `agent-profiles`).
- La spec en vigueur `project-audit` est mise à jour par l'archivage ; aucune édition directe.
- Décision du chef de projet (niveau 2) : le cas « suppression sûre » n'existe pas, l'audit ne conseille jamais de supprimer une base (voir `design.md`, Constat de l'issue).
- Le chef de projet proposera une issue de suivi pour le scénario « Base altérée » de `generated-files-update`, imprécis (hors périmètre).
