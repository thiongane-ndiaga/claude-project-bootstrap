# Design

## Context

Voir `proposal.md` (Why). Décision de l'utilisateur sur #170 : retirer un fichier de `keep` suffit, sans toucher au manifeste. Cadre : [ARCH-006](../../../docs/architecture/adrs/ARCH-006-strategie-de-mise-a-jour-des-fichiers-generes.md) (base conservée, valide si son empreinte égale `generated`, fusion à trois voies, repli sur le conflit) ; pas d'autre ADR sur le manifeste (ARCH-010 décrit les modules, ARCH-009 l'état de reprise).

### Constat de l'issue, vérifié dans `scaffold.mjs`

Le constat est exact mais incomplet.

- Exact : pour une entrée `kept` hors `keep`, les gardes `before.status !== "kept"` des deux règles « modèle inchangé » (`customized`) et « fusion à trois voies » excluent le fichier. Il tombe sur `--adopt` ou le conflit avec `diffText` (diff simple), même quand sa base existe. Le fichier n'est donc pas « sauté en silence » : il est signalé en conflit (code 3), même si le modèle n'a pas changé depuis son retrait de `keep`.
- Incomplet : la cause de la dérive d'empreinte est la branche `keep ou owned`. À chaque passage, elle réécrit l'entrée avec `generated` = empreinte du modèle actuel, mais n'appelle jamais `base()` : la base reste figée à son contenu d'avant `keep`. Retirer seulement les gardes `kept` ne suffit pas : la règle `customized` verrait `before.generated` égal à `generated` (valeur rafraîchie) et classerait le fichier sans jamais le fusionner ; sinon, la base serait déclarée invalide (`baseInvalid`).
- Un fichier dans `keep` dès la première génération (déjà présent dans le projet) n'a jamais eu de base : aucune fusion n'est possible, c'est le repli.
- Le statut `kept` sert aussi aux fichiers `owned` (`.bootstrap/checks.json`, `.github/actions/project-setup/action.yml`, `package.json`), qui ne sont jamais dans `keep` : la détection « `kept` hors `keep` » doit les exclure.
- Les fichiers fusionnés par lignes ou JSON (`.gitignore`, `settings.json`…) peuvent aussi être dans `keep` et porter le statut `kept` ; ils n'ont jamais de base et leur mécanisme propre est prioritaire.

## Goals / Non-Goals

**Goals:**
- Le retrait de `keep` suffit à rendre un fichier réconciliable, sans édition du manifeste, sans nouvelle clé ni nouveau statut.
- Aucune base n'est acceptée sans que le manifeste puisse la garantir (ARCH-006, décision 1).
- Idempotence, `--dry-run` et `--adopt` se comportent comme pour tout fichier modifié.
- Aucun changement de comportement pour les fichiers `owned` et ceux fusionnés par lignes ou JSON.

**Non-Goals:**
- Réparer automatiquement un manifeste déjà dérivé (procédure manuelle documentée, voir Risques).
- Modifier `owned`, les fichiers fusionnés par lignes ou JSON, ou le catalogue.
- Le texte de l'écart `bases` de `audit.mjs` : une issue séparée sera proposée.

## Decisions

### 1. Figer `generated` pendant `keep`

Dans la branche `keep ou owned`, pour un fichier non `owned`, non fusionné par lignes ou JSON, qui a une entrée antérieure, l'entrée reprend `generated` de l'entrée précédente au lieu de l'empreinte du modèle actuel ; `sha256` continue de suivre le fichier du projet. Sans entrée antérieure, `generated` reçoit l'empreinte du modèle actuel (aucune base n'est écrite). Les fichiers `owned` et les fichiers fusionnés par lignes ou JSON gardent le comportement actuel.

Invariant : pour toute entrée hors `kept`, l'empreinte de la base égale `generated` (la base est écrite avec `generated`, et un conflit ne modifie ni l'un ni l'autre). Figer `generated` pendant `keep` étend l'invariant aux entrées `kept` : à la sortie de `keep`, la base est valide au sens de ARCH-006, sans règle nouvelle. Ce complément à ARCH-006 est consigné par `architect` dans les « Suites » de l'ADR (tâche 3.5).

Alternatives :
- **B. Accepter la base d'un ancien `kept` sans garantie du manifeste.** Répare aussi les manifestes déjà dérivés, mais contredit ARCH-006 (« ignorée si son empreinte diffère de `generated` ») et la spec « Base valide » : une base altérée à la main produirait une fusion propre écrite sans détection. Écartée.
- **C. Écrire la base à chaque passage pendant `keep`.** Contredit « Conservation de la base » (aucune base pour `keep`) et rend la base fausse : elle représenterait un modèle que le projet n'a jamais appliqué.
- **D. Nouveau champ de manifeste (empreinte de base).** Changement de format du manifeste, plus lourd qu'une valeur déjà présente.

### 2. Traiter un `kept` hors `keep` comme un fichier modifié, à condition d'avoir une base

- Règle « fusion à trois voies » : la garde `before.status !== "kept"` est retirée. Le reste de sa condition (`!merge`, `!owned`, base présente) est inchangé.
- Règle `customized` : la garde `kept` ne tombe que pour un fichier non fusionné par lignes ou JSON, non `owned`, **dont la base existe**. Pour un fichier fusionné ou `owned`, ou sans base, le comportement actuel est conservé. Pas d'adoption implicite : un fichier sans base (dans `keep` dès la première génération, ou ancien `owned`) reste en conflit avec diff simple, et `--adopt` l'accepte.

À ces lignes, une entrée `kept` ne peut venir que d'un fichier retiré de `keep` (ou d'un ancien `owned`) : les branches `keep` et `owned` existant s'exécutent avant. Les tests couvrent les `owned` et un fichier fusionné pour verrouiller cela.

Conséquences, dans l'ordre des règles existantes :
- Fichier identique au modèle : `identical`, entrée `created` (inchangé).
- Fichier absent : recréé depuis le modèle comme tout fichier manquant (entrée `created`).
- Règle « resté tel que généré » (statut `created` et `sha256` inchangé) : jamais applicable à un `kept`, et c'est voulu. L'entrée ne passe pas à `created` avec le `sha256` du fichier du projet, car elle ferait remplacer par le modèle un contenu que le projet a choisi de garder.
- Base présente et `before.generated === generated` : le modèle n'a pas changé depuis la base, `customized` ; le fichier et l'entrée (statut `kept` conservé) ne sont pas touchés, et la règle existante réécrit la base avec le modèle actuel si elle manque ou diffère. Une entrée `kept` peut ainsi rester `kept` sans effet.
- Base présente et empreinte égale à `generated` : fusion à trois voies, réutilisant le bloc existant (`git merge-file`).
- Base absente : conflit, diff simple (jamais `baseInvalid`). Base présente d'empreinte différente et modèle changé : `baseInvalid` et conflit, diff simple. `git` indisponible ou fusion en erreur : conflit, diff simple. « Sans erreur » signifie : pas d'arrêt du script, le conflit habituel (code 3), jamais d'écrasement.

Écart assumé avec l'exigence « Repli sur le comportement existant » : cette exigence veut qu'une base présente mais invalide soit signalée `baseInvalid`. La règle `customized` précède le contrôle de validité (c'est déjà le cas pour tout fichier modifié) : un manifeste dérivé dont le modèle n'a pas changé est donc réancré sans `baseInvalid`. `baseInvalid` n'apparaît que si le modèle a changé.

### 3. Manifeste et base selon l'issue de la fusion

| Issue | Entrée du manifeste | Base |
|---|---|---|
| fusion sans conflit, fichier changé | `reconciled`, `sha256` du texte fusionné, `generated` = modèle actuel | écrite (modèle actuel) |
| fusion donnant le fichier tel quel | `reconciled` (comme le bloc existant), fichier non réécrit, listé `identical` | écrite |
| conflit | inchangée (reste `kept`, `generated` figé) | inchangée |
| conflit avec `--adopt` | `adopted`, `sha256` du fichier, `generated` = modèle actuel | écrite (modèle actuel) |
| `customized` | inchangée | réancrée : écrite avec le modèle actuel si absente ou différente |

Au passage suivant, une entrée `reconciled` ou `adopted` suit les règles existantes : `customized` si le modèle est inchangé (idempotent), refusion sinon. Un conflit non résolu se représente à l'identique à chaque passage, comme aujourd'hui.

### 4. `--dry-run`

La fusion est calculée et rapportée (`reconciled` ou `conflicts`, `diffs`), mais `put()` n'écrit ni fichier, ni base, ni manifeste. Comme aujourd'hui, le champ `manifest` du rapport indique ce qui serait écrit. Aucun traitement spécifique n'est à ajouter.

### 5. Cas limites

- Fichier supprimé du projet et retiré de `keep` : recréé depuis le modèle (comportement des fichiers manquants).
- Fichier retiré de `keep` mais que le modèle actuel ne produit plus : il n'est pas dans `outputs`, il est listé `retired`, l'entrée reste `kept`.
- Fichier sans base (dans `keep` dès la première génération) : retiré de `keep`, conflit avec diff simple, même si le modèle n'a pas changé ; `--adopt` consigne le fichier (`adopted`, base = modèle actuel), qui rejoint ensuite le cas général.
- Ancien `owned` que le catalogue ne marque plus : aucune base n'a jamais existé, donc comportement actuel inchangé (conflit s'il diffère du modèle).
- Fichier fusionné par lignes ou JSON (`.gitignore`, `settings.json`), dans `keep` puis retiré : aucun changement, même statut `kept` ; sa fusion existante reprend la main (modèle changé ou non), sans base ni `reconciled`.
- Plusieurs fichiers retirés de `keep` d'un coup : chacun suit sa propre issue dans la boucle ; `conflicts` les cumule et le code est 3 si un seul reste en conflit ; les autres sont fusionnés.
- Ajout à `keep` et modèle changé dans le même passage : le fichier est conservé tel quel, son `generated` reste celui du passage précédent et sa base ne bouge pas ; un retrait ultérieur fusionne donc avec les changements du modèle accumulés depuis.
- Retrait de `keep` et changement du modèle dans le même passage : un seul `--update --config` (ou une édition de `config.keep` dans le manifeste puis `--update`) suffit.
- Fin de ligne : la fusion d'un fichier retiré de `keep` suit le bloc existant (LF pour fusionner, style d'origine restitué).

## Risks / Trade-offs

- [Manifeste déjà dérivé : `generated` rafraîchi pendant `keep`] → deux issues. Modèle changé depuis le dernier passage : `baseInvalid` et conflit (repli demandé). Modèle inchangé : `customized` réancre la base sur le modèle actuel sans `baseInvalid` (écart assumé, voir décision 2) ; elle redevient cohérente avec `generated` mais n'est plus l'ancêtre réel du fichier, donc une fusion ultérieure ne porte que les changements du modèle postérieurs à ce passage, sans perte du contenu du projet. Réparation à documenter dans `versioning.md` et `SKILL.md` : (a) avant le premier `--update` sans `keep`, mettre `generated` = sha256 du `.base` normalisé en LF ; (b) en cas de conflit, fusionner à la main avec le diff, puis `--adopt` ; (c) modèle inchangé : rien à faire, la base est réancrée. Le dépôt du plugin est concerné : `ARCH-005` est dans le même cas que `docs/workflow.md`.
- [Une fusion propre peut produire un fichier invalide après un long séjour en `keep`, la base étant ancienne] → `reconciled` reste à relire (déjà dit dans `SKILL.md`) ; la phase 5 précise que les fichiers retirés de `keep` sont fusionnés à partir de leur base d'avant `keep`.
- [Un `generated` figé n'est plus l'empreinte du modèle courant] → seule la règle `customized` l'utilise pour un fichier hors `keep`, et le sens voulu : le modèle a-t-il changé depuis la base ? Les tests existants sur `keep` (CLAUDE.md, `project-setup`) ne lisent pas `generated`.
- [Une entrée `reconciled` d'un fichier jamais modifié, ou `kept` hors `keep` en `customized`, subsiste] → sans effet ; à dire dans `versioning.md`.
- [Effet de bord : `customized` pour un `kept` hors `keep` avec base et modèle inchangé] → aujourd'hui conflit ; le nouveau comportement est celui des autres fichiers modifiés.
