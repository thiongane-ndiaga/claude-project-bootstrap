## 1. Date figée et base conservée

- [x] 1.1 Enregistrer `config.date` au manifeste (priorité : configuration fournie, puis date du manifeste, puis date du jour) ; test : deux `--update` à des dates différentes (date simulée par une configuration) ne signalent aucun changement de modèle, et `--update --config` sans date conserve la date enregistrée.
- [x] 1.2 Écrire `.bootstrap/base/<fichier>.base` pour chaque fichier généré non partagé, ni `owned`, ni `keep`, ni `kept`, quand l'empreinte du contenu produit égale `generated` de l'entrée finale ; rien en `--dry-run` ; tests : bases présentes après génération, mise à jour, adoption et reconstitution pour un fichier `customized` ; bases absentes pour un fichier en conflit, un fichier partagé, un fichier `owned` ou `keep`.

## 2. Fusion à trois voies

- [x] 2.1 Ajouter la fonction de fusion (`git merge-file -p --diff3`, copies LF, étiquettes, code de sortie interprété, signal ou erreur = échec) dans `merge.mjs` ; tests unitaires : fusion propre, conflit, absence de git simulée en lançant l'enfant avec un `PATH` vide.
- [x] 2.2 Brancher la fusion dans la classification de `scaffold.mjs` (après `customized`, avant fusion partagée, `--adopt` et conflit) : statut `reconciled`, base mise à jour, restauration CRLF, cas « fusion identique au fichier actuel » (rapporté dans `identical`), `--dry-run` ; tests : modifications éloignées (sans conflit), voisines (conflit, fichier intact, `diffs` avec marqueurs), CRLF, `--adopt` sur conflit puis sur fusion propre, fichier partagé inchangé.
- [x] 2.3 Repli : base absente, base altérée (signalée dans `baseInvalid`), base réécrite en CRLF (reste valide), échec de git ; tests de chaque cas (conflit comme avant, jamais d'écrasement).
- [x] 2.4 Idempotence et persistance : deuxième `--update` sans effet (fichier dans `customized`, pas de clé `manifest`, bases non réécrites) ; modèle modifié une seconde fois après une fusion → refusion, jamais de remplacement ; test du bit exécutable de `.githooks/pre-push` après fusion sous POSIX. Le changement du modèle entre N et N+1 utilise la copie temporaire du plugin déjà employée par les tests de mise à jour.

## 3. Documentation, ADR et vérification

- [x] 3.1 Ajouter à ARCH-006 l'addendum sur le suffixe `.base` ; `archgate check` passe.
- [x] 3.2 Mettre à jour `references/versioning.md` (base et suffixe, statut `reconciled`, `baseInvalid`, repli, date figée pour les manifestes existants, relecture de `ci.yml` et des hooks) et la phase « Mise à jour » de `SKILL.md` ; vérifier que les commandes citées existent.
- [x] 3.3 Rejouer `--update --dry-run` sur ce dépôt et vérifier qu'il n'écrit rien ; lancer `node .claude/hooks/quality-gate.mjs` (code 0).

## Workflow follow-up
- `/opsx:archive` dans la PR, avant le merge.
