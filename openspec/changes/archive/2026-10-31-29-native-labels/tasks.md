## 1. Modèles et synchronisation

- [x] 1.1 Réécrire le modèle `labels.json` (`bug` et `enhancement` natifs, `adr`, `chore`) et poser les labels natifs / `adr` dans les trois formulaires; test : cohérence formulaires ⊂ `labels.json`, absence de `type:` et de `needs-adr`.
- [x] 1.2 Réécrire `sync-labels.mjs` : fonction exportée `syncLabels({ labels, gh })`, lecture des labels, comparaison insensible à la casse, création des seuls absents, `--force` réservé aux labels non natifs, arrêt non nul sans rien écrire si la lecture échoue, exécution directe inchangée; tests avec un `gh` simulé : natif existant intact, natif avec une autre casse intact et sans doublon, natif absent créé, label du plugin mis à jour, échec de lecture sans écriture.

## 2. Migration des dépôts existants

- [x] 2.1 Étendre `runMigrations` : `plan` renvoie un tableau ou `{ actions, notes }`, `notes` ajouté à chaque entrée du résultat (liste vide pour `0001`); tests : `0001` inchangée (`sim[0].actions.length === 1`, notes vides), une migration avec notes.
- [x] 2.2 Écrire `migrations/0002-native-labels.mjs` via l'API REST du dépôt reçu (liste paginée sans plafond, création, pose sur issues et PR, suppression, `needs-adr` conditionnel); tests avec un `gh` simulé : simulation sans écriture avec comptes dans les descriptions, chaque appel contient le dépôt, ordre créer → poser → supprimer par ancien label, plus de 1000 éléments (pagination), lecture incomplète sans suppression, PR comprise, `needs-adr` utilisé conservé avec note, `needs-adr` seul et utilisé sans action, `needs-adr` inutilisé supprimé, aucun ancien label → aucune action.
- [x] 2.3 Reprise et idempotence : un `gh` simulé qui échoue à la N-ième pose laisse l'ancien label et tous les éléments étiquetés, la relance ne propose que les actions restantes; `plan` sur l'état « après application » ne propose rien; consignation au manifeste après une application réussie.

## 3. Documentation et ce dépôt

- [x] 3.1 Mettre à jour `SKILL.md` (principe de réutilisation, ligne `adr`, notes des migrations à présenter à l'étape 5), `references/github-setup.md` (dont la mention de `--force` et le cas d'un `labels.json` qui garde des `type:*`), `references/verification.md`, `references/versioning.md` (contrat de `plan`) et le modèle `docs/workflow.md`; `grep` : plus de `type:feature|type:bug|type:adr|type:chore|needs-adr` hors historique archivé.
- [x] 3.2 Mettre à jour ce dépôt : retirer `.github/labels.json` et `scripts/sync-labels.mjs` de `config.keep` du manifeste, `--update` avec le résultat attendu de D8 vérifié par la simulation et `--diff` avant écriture, `docs/workflow.md`; `node .claude/hooks/quality-gate.mjs` renvoie 0; simulation de `0002` sur ce dépôt (aucune action attendue).

## 4. Vérification sur GitHub (sur accord)

- [x] 4.1 Créer les labels `adr` et `chore` dans ce dépôt avec `sync-labels.mjs`; relire avant et après la description et la couleur de `bug` et `enhancement` : inchangées.

## Workflow follow-up
- `/opsx:archive` dans la PR, avant le merge.
- Migration réelle d'un projet déjà généré : hors de ce changement, sur accord du propriétaire (simulation d'abord).
