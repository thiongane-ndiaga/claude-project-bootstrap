Issue: #177
ADR: ARCH-006

## Why

L'écart `bases` de l'audit (`skills/project-bootstrap/scripts/audit.mjs`) propose toujours la même correction : « restaurer .bootstrap/base depuis git, ou supprimer la base (le prochain --update la reconstitue) ». Elle est trompeuse. Pour un manifeste dérivé par une version antérieure du plugin (#170), restaurer depuis git ne change rien, car la base committée est la bonne et c'est `generated` qui a dérivé. Supprimer la base détruit le seul ancêtre récupérable. Et la base n'est jamais « reconstituée » : un fichier modifié, sans base, dont le modèle a changé reste en conflit jusqu'à `--adopt`. Le sujet a été repéré à la revue de #170.

## What Changes

- Le conseil de l'écart `bases` dépend de la cause, déduite du statut de l'entrée du manifeste (déjà lu par l'audit) : une entrée hors `kept` a une base altérée (restauration depuis l'historique git) ; une entrée `kept`, ou absente du manifeste, a une base altérée ou un manifeste dérivé (les deux causes sont citées, renvoi à `references/versioning.md`, section « Manifeste dérivé par une version antérieure »).
- Aucune correction de l'écart ne conseille de supprimer une base. La décision de l'issue réserve cette suppression au cas où le prochain `--update` reconstitue la base ; ce cas ne se présente jamais pour une base invalide (voir `design.md`).
- Plusieurs bases de natures différentes : un seul écart `bases`, une correction groupée par cause qui nomme les fichiers. L'identifiant `bases` et le message de l'écart ne changent pas.
- Test de l'audit pour chaque formulation ; `references/versioning.md` précise comment reconnaître la cause et ce que le repli (`--diff`, fusion manuelle, `--adopt`) garantit.

Hors périmètre : `scaffold.mjs` (règles de base, `baseInvalid`, statuts), le format du manifeste, la réparation automatique d'un manifeste dérivé, un nouvel appel à git ou un calcul d'empreinte dans l'audit, les autres contrôles de l'audit, la spec `generated-files-update`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `project-audit`: l'exigence « Manifeste et mise à jour en attente » renvoie à la correction dépendant de la cause (modifiée, scénarios existants conservés) ; l'exigence « Correction de l'écart des bases » est ajoutée.

## Impact

- Code : `skills/project-bootstrap/scripts/audit.mjs` (`checkUpdate`, correction de l'écart `bases`).
- Tests : `tests/scaffold.test.mjs` (section de l'audit, à côté de « piège : base de fusion altérée -> écart »).
- Documentation : `skills/project-bootstrap/references/versioning.md` (section « Manifeste dérivé par une version antérieure », tableau, paragraphe « Audit d'un projet »), `references/pitfalls.md` (une phrase). `SKILL.md` et arc42 ne décrivent pas le conseil de l'audit : vérification seulement, `architect` évalue §11.
- Projets générés : la sortie de l'audit change (texte de la correction) ; aucun fichier généré ne change, la matrice et ses instantanés sont inchangés.
