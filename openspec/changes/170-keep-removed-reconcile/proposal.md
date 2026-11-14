Issue: #170
ADR: ARCH-006

## Why

Un fichier retiré de `config.keep` n'est pas fusionné à trois voies à la mise à jour suivante : `scaffold.mjs` le signale en conflit avec un diff simple, même quand la base existe. Deux causes se cumulent. Le statut `kept` de l'entrée du manifeste exclut le fichier de la fusion. Et tant que le fichier est dans `keep`, l'empreinte `generated` de l'entrée est réécrite à chaque passage avec celle du modèle actuel, alors que la base n'est plus mise à jour : elle ne correspond plus à la base conservée. Le projet doit corriger le manifeste à la main pour obtenir la fusion. L'utilisateur a décidé (commentaire sur #170) que le retrait de `keep` doit suffire.

## What Changes

- Une entrée du manifeste au statut `kept`, hors catalogue `owned` et hors fichiers fusionnés par lignes ou JSON, dont le chemin ne figure plus dans `config.keep` est traitée comme un fichier modifié par le projet : fusion à trois voies à partir de `.bootstrap/base/`, mêmes règles de conflit (proposition à marqueurs sous `diffs`, rien d'écrit), d'adoption (`--adopt`) et de simulation (`--dry-run`) que tout fichier modifié.
- Sans base, ou avec une base altérée quand le modèle a changé : repli sur le comportement actuel, conflit avec le diff simple projet → modèle, sans erreur d'exécution. Pas d'adoption implicite : un fichier sans base reste en conflit jusqu'à `--adopt`.
- Tant qu'un fichier est dans `keep`, son entrée garde l'empreinte `generated` de sa dernière base au lieu de prendre celle du modèle actuel ; `sha256` suit le fichier du projet. La base antérieure à `keep` reste ainsi valide au sens de ARCH-006.
- Un fichier toujours dans `keep`, un fichier `owned` et un fichier fusionné par lignes ou JSON ne changent pas de comportement.
- Documentation : `references/versioning.md`, `references/bootstrap-config.md`, `references/pitfalls.md`, `SKILL.md` (tableau « Situation du fichier » et phase 5), arc42, et une ligne dans les « Suites » d'ARCH-006 (par `architect`).

Hors périmètre : réparation automatique des manifestes déjà dérivés (procédure manuelle documentée), changement du format du manifeste, de la clé `keep` ou du statut `owned`, nouvelle clé de rapport, texte de l'écart `bases` de `audit.mjs` (une issue séparée sera proposée), fichiers fusionnés par lignes ou par JSON, instantanés de la matrice.

## Capabilities

### New Capabilities

### Modified Capabilities
- `generated-files-update`: conservation de la base pendant `keep` (exigence modifiée), référence de base figée pendant `keep` et réconciliation d'un fichier retiré de `keep` (exigences ajoutées).

## Impact

- Code : `skills/project-bootstrap/scripts/scaffold.mjs` (branche `keep` ou `owned`, gardes `kept` des règles « modèle inchangé » et « fusion à trois voies », commentaires de définition du manifeste).
- Tests : `tests/scaffold.test.mjs` (section de la fusion à trois voies) ; `tests/matrix.test.mjs` et `tests/snapshots/` inchangés (aucune combinaison de la matrice n'utilise `keep`).
- Documentation : `skills/project-bootstrap/references/versioning.md` (tableau, section « Base et fusion à trois voies », réparation d'un manifeste dérivé), `references/bootstrap-config.md` (clé `keep`), `references/pitfalls.md` (piège du manifeste dérivé), `SKILL.md` (tableau « Situation du fichier », ligne `keep` et conseil sur les conflits ; phase 5, étape 4), arc42 §5, §8 si pertinent, et §11 ; ARCH-006 « Suites ».
- Projets générés : l'empreinte `generated` d'un fichier dans `keep` ne bouge plus aux mises à jour. Pour un manifeste déjà dérivé : modèle changé, `baseInvalid` et conflit ; modèle inchangé, la base est réancrée sur le modèle actuel sans `baseInvalid` (écart assumé, voir `design.md`). `ARCH-005` de ce dépôt est dans le même cas que `docs/workflow.md`.
