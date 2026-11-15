# Design

## Context

Voir `proposal.md` (Why). Cadre : [ARCH-006](../../../docs/architecture/adrs/ARCH-006-strategie-de-mise-a-jour-des-fichiers-generes.md) (base conservée, valide si son empreinte égale `generated`, repli sur le conflit, `generated` figé pendant `keep` : « Suites »). Aucun autre ADR ne couvre l'écart `bases` : ARCH-005, 007, 009, 010, 013 et 018 citent l'audit sans décider de ce point. Décision de l'utilisateur sur #177 : le conseil distingue la cause et renvoie à la procédure documentée au lieu de conseiller de supprimer la base.

### Comment l'audit obtient les bases invalides

`checkUpdate` lance `scaffold.mjs --update --dry-run --target <dépôt>`, lit le rapport JSON et rend l'écart `bases` si `report.baseInvalid` n'est pas vide (`audit.mjs`, ligne 224). La liste contient des chemins relatifs, les mêmes clés que `files` du manifeste, que `checkManifest` a déjà lu (`ctx.manifest`).

### Constat de l'issue, vérifié dans `scaffold.mjs`

Le constat est exact, mais incomplet.

- Exact : restaurer la base depuis git ne change rien pour un manifeste dérivé (la base committée est l'ancêtre réel, c'est `generated` qui a dérivé). Supprimer la base la détruit. Une entrée sans base reste en conflit : seules les branches « créé », « mis à jour », « identique », `customized`, fusion propre et `--adopt` appellent `base()`, jamais la branche du conflit.
- Incomplet 1 : un fichier n'atteint `baseInvalid` que s'il est modifié, que sa base existe et que `before.generated !== generated`. À égalité, la règle `customized` passe avant (tests « manifeste dérivé, modèle inchangé -> customized » et « retrait de keep avec modèle inchangé ») : elle réécrit la base avec le modèle actuel, sans écart. Toute entrée de `baseInvalid` a donc un modèle changé, et sa base supprimée n'est **jamais** reconstituée par le `--update` suivant : le fichier reste en conflit jusqu'à `--adopt`, ou jusqu'à ce qu'il redevienne identique au modèle (la base est aussi réécrite par la branche « identique », comme par « créé » ; la formulation « conflit jusqu'à `--adopt` » est ainsi complétée). La condition « modèle inchangé et entrée non `kept` » de la décision ne se présente jamais pour une base invalide.
- Incomplet 2 : le conseil de suppression est donc faux aussi pour une entrée non `kept` (base altérée à la main), pas seulement pour un manifeste dérivé.
- Un fichier encore dans `keep` n'atteint jamais `baseInvalid` (le `continue` de la branche `keep` passe avant). Une entrée `kept` dans `baseInvalid` est un fichier retiré de `keep` dont le conflit n'a pas réécrit l'entrée.

Écarts avec le commentaire de décision : (1) la suppression de la base n'est conseillée dans aucun cas, voir ci-dessus ; (2) le titre réel de la section est « Manifeste dérivé par une version antérieure » (sans « du plugin »), c'est celui qui est cité.

## Goals / Non-Goals

**Goals:**
- Une correction vraie dans tous les cas où l'audit a de quoi trancher, et une formulation vraie dans les deux causes quand il ne le peut pas.
- Aucune réimplémentation de `scaffold.mjs` : l'audit lit ce que `--update --dry-run` rapporte et ce que le manifeste consigne.

**Non-Goals:**
- Réparer le manifeste ou la base, ou changer `scaffold.mjs`.
- Calculer l'empreinte d'un `.base` ou interroger git dans l'audit.
- Détecter qu'un manifeste est dérivé avec certitude : voir ci-dessous.

## Decisions

### 1. Discriminant : le statut de l'entrée du manifeste

Pour chaque chemin de `report.baseInvalid`, l'audit lit le statut de l'entrée `ctx.manifest.files[chemin]` (propriété propre : un chemin nommé comme une propriété d'`Object`, tel que `constructor`, est une entrée absente). Deux groupes, dans l'ordre du rapport :

- **non `kept`** (`created`, `reconciled`, `adopted`…) : la base et `generated` sont écrits dans le même passage, et un conflit ne modifie ni l'un ni l'autre (`scaffold.mjs`, branche du conflit, ligne 511 : elle n'écrit ni base ni entrée ; spec `generated-files-update`, scénario « Fichier en conflit »). Une empreinte différente vient d'une altération de la base (ou d'une édition de `generated`) : « base altérée ».
- **`kept`, ou entrée absente** : le manifeste dérivé par une version antérieure (#170) est aussi un cas de mismatch, et ses entrées restent `kept`. Mais une base `kept` peut aussi avoir été éditée à la main. L'audit ne peut pas trancher : la formulation cite les deux causes. Une entrée absente (impossible par construction, car `baseInvalid` exige une entrée antérieure) est traitée comme `kept`, donc avec la formulation valable dans les deux cas.

Pourquoi pas davantage : l'empreinte du `.base` ne départage rien. `baseInvalid` dit déjà qu'elle diffère de `generated`, et elle diffère aussi bien pour une base éditée que pour un `generated` dérivé. La relire et la recalculer dupliquerait la normalisation LF et le sha256 de `scaffold.mjs` sans information en plus. Comparer la base à `HEAD` (`git diff`) départagerait en partie (base modifiée localement, ou non), mais ni une altération déjà committée ni l'absence de git ; le diagnostic par l'historique reste dans la documentation (décision 3) et dans le texte de la correction, pas dans un appel de l'audit.

Alternative écartée : distinguer par le statut seul et affirmer « manifeste dérivé » pour `kept`. Faux pour une base `kept` éditée à la main, et le raccourci (a) de `versioning.md` (sha256 du `.base`) validerait alors la base altérée.

### 2. Formulations exactes

Le message ne change pas (`bases de fusion invalides : a, b`), pour ne pas rompre les lecteurs de la sortie JSON. La correction est la concaténation des clauses des groupes non vides, dans l'ordre « altérée » puis « kept », séparées par ` | ` (à l'intérieur d'une clause, le séparateur est ` ; `). `<chemins>` = `.bootstrap/base/<fichier>.base` pour chaque fichier du groupe, séparés par `, ` ; dans la commande, les chemins sont séparés par des espaces : `git log -p -- <chemins séparés par des espaces>` ; la clause « kept ou absente » ajoute `.bootstrap/manifest.json` à la fin des chemins, car c'est dans le manifeste que `generated` change (commit sans changement du `.base`). Le repli est la commande de la correction `mise-a-jour` : `node scaffold.mjs --update --target <dépôt> --dry-run --diff`.

- Groupe non `kept` : `base altérée (empreinte différente de generated) pour <chemins> : restaurer la version dont l'empreinte (sha256 du contenu en LF) égale generated, retrouvée dans l'historique (git log -p -- <chemins>) ; sans cette version ou sans git : node scaffold.mjs --update --target <dépôt> --dry-run --diff, fusion à la main, puis --adopt`
- Groupe `kept` ou absent : `<chemins> (entrée « kept » ou absente du manifeste) : base altérée, ou manifeste dérivé par une version antérieure du plugin (generated plus récent que la base) ; conserver la base (pour un manifeste dérivé, c'est le seul ancêtre récupérable) ; chercher dans l'historique (git log -p -- <chemins> .bootstrap/manifest.json) un commit où le .base change sans que generated prenne son empreinte (base altérée : restaurer la version dont l'empreinte égale generated), ou un commit où generated change pendant keep sans que le .base change (manifeste dérivé) ; puis suivre skills/project-bootstrap/references/versioning.md, section « Manifeste dérivé par une version antérieure » ; sans git : node scaffold.mjs --update --target <dépôt> --dry-run --diff, fusion à la main, puis --adopt`

Les corrections ne contiennent ni « supprim » ni « reconstitu ». Le test l'affirme.

Le repli sans git (`--diff`, fusion à la main, `--adopt`) figure dans les deux clauses : il est vrai dans tous les cas, car il ne dépend pas de la validité de la base.

### 3. Documentation du diagnostic (`versioning.md`)

La section « Manifeste dérivé par une version antérieure » reçoit une courte entrée « Reconnaître la cause », fondée sur l'historique de la base et du manifeste (`git log -p -- .bootstrap/base/<fichier>.base .bootstrap/manifest.json`) : un commit où le `.base` change sans que `generated` du manifeste prenne son empreinte indique une base altérée (restaurer la version dont l'empreinte LF égale `generated`) ; un commit où `generated` change pendant `keep` sans que le `.base` change indique un manifeste dérivé (procédure (a), (b), (c)). Un simple `git diff` de la base ne suffit pas : il ne voit pas une altération déjà committée. Elle précise que le raccourci de (a) par le sha256 du `.base` valide une base altérée : il n'est sûr que si la base ne l'a pas été. Le tableau de la ligne 20 (« `baseInvalid` si la base est altérée ») devient « base altérée, ou manifeste dérivé ». Le paragraphe « Audit d'un projet » dit que le conseil de l'écart `bases` dépend du statut de l'entrée.

## Cas limites

- **Plusieurs bases de natures différentes** : un seul écart `bases`, deux clauses, chacune nommant ses fichiers (scénario « Bases de natures différentes »).
- **Entrée sans base** : jamais dans `baseInvalid` (la branche exige que la base existe). Elle est un conflit : écart `mise-a-jour`, non traité ici.
- **Chemin de `baseInvalid` absent du manifeste** : formulation `kept`, valable dans les deux cas.
- **Manifeste illisible ou absent** : `checkUpdate` s'arrête avant, aucun écart `bases`.
- **`git` indisponible, ou projet hors dépôt git** : l'audit n'appelle pas git pour ce contrôle ; le texte ne change. L'historique git n'étant pas disponible, la restauration est impossible : le repli sans git (`--diff`, fusion à la main, `--adopt`) reste vrai, il figure dans les deux clauses de la correction.
- **Base altérée et modèle inchangé** : aucun écart ; la mise à jour réécrit la base (`customized`), l'audit ne la signale pas. Sans effet pour ce changement.
- **Chemins avec espaces** : la correction est un texte affiché, jamais passé à un shell.

## Risks / Trade-offs

- [Une base `kept` altérée est présentée comme « peut-être dérivée »] → les deux causes sont citées, et la procédure commence par chercher l'altération dans l'historique.
- [Une entrée non `kept` dont `generated` a été édité à la main reçoit la clause « base altérée »] → l'altération réelle est dans le manifeste ; la clause renvoie à l'historique et au repli `--adopt`, vrais aussi dans ce cas. Cas rare, accepté.
- [Un futur statut de `scaffold.mjs` à base dérivée échapperait au discriminant] → le test de l'audit couvre les statuts actuels ; un changement des règles de base passe par un changement OpenSpec qui relit cette décision.
- [La condition de suppression sûre de la décision initiale est vide] → tranché par le chef de projet (niveau 2, sources : `scaffold.mjs` lignes 466-476 et 511, test `tests/scaffold.test.mjs` ligne 1060) : l'audit ne conseille jamais de supprimer une base. Si une suppression devait être conseillée un jour, il faudrait que `scaffold.mjs` reconstitue une base absente quand le modèle est inchangé, ce qui est un autre changement (ARCH-006, décision 2 : base absente = conflit).
- [`generated-files-update`, scénario « Base altérée »] ne précise pas que `baseInvalid` n'est rapporté que si le modèle a changé. Hors périmètre de ce changement ; le chef de projet proposera une issue de suivi. Le scénario « Base de fusion altérée » de `project-audit` le précise, lui, dans son WHEN.
