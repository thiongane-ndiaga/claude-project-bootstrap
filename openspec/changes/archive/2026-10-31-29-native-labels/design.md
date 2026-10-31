## Context

`labels.json` (module `github`) liste cinq labels préfixés; `sync-labels.mjs` exécute `gh label create … --force` pour chacun. Les formulaires posent `type:bug`, `type:feature`, `type:adr`. Rien ne lit ces labels. `migrate.mjs` exécute des migrations numérotées (`0001` seule), chacune avec `id`, `modules`, `plan({ gh, repo })` qui renvoie des actions `{ description, command, run }`, simulation par défaut; `0001` passe toujours par `repos/${repo}`. Dans ce dépôt, `labels.json` et `sync-labels.mjs` sont dans `config.keep` du manifeste et n'existent pas. Voir proposal.md pour la motivation et les décisions du propriétaire (commentaire de #29).

## Goals / Non-Goals

**Goals:**
- Aucun doublon créé sur un dépôt neuf; aucun label natif modifié par la synchronisation.
- Migration des dépôts existants sans perte, avec simulation et accord, qui reprend sûrement après un échec.
- Un script de synchronisation testable sans appeler GitHub.

**Non-Goals:**
- Champs `creates`/`reuses` du catalogue (aucun consommateur avant #23/#25).
- Renommer ou supprimer des labels natifs; toucher aux types de tickets ou aux colonnes du Project.

## Decisions

**D1. `labels.json` marque les natifs.** Chaque entrée garde `name`, `color`, `description` et `native: true` pour `bug` et `enhancement`. Natif → créé seulement s'il manque; sinon → créé ou mis à jour (`--force`). Alternative : liste codée en dur (rejetée : le fichier est la source unique, modifiable par le projet).

**D2. `sync-labels.mjs` exporte `syncLabels({ labels, gh })` et ne s'exécute seul que lancé directement** (même garde que `migrate.mjs`). Les tests injectent un `gh` simulé; le fichier reste un script autonome sans dépendance. Il lit les labels avec `gh label list --json name --limit 1000`; si la lecture échoue, il s'arrête avec un code non nul sans rien écrire. Comparaison **insensible à la casse** (GitHub traite `Bug` et `bug` comme le même label; sans `--force`, `gh label create` sur un label existant échoue au lieu de le modifier, la protection des natifs repose donc entièrement sur la liste lue).

**D3. Couleurs et descriptions des natifs créés** : celles de GitHub (`bug` `d73a4a`, `enhancement` `a2eeef`). `adr` `5319e7`, `chore` `c5def5`.

**D4. Migration `0002-native-labels`, module `github`, via l'API REST du dépôt reçu.** Toutes les commandes passent par `repos/<repo>/…` (jamais le dépôt du dossier courant) : lecture des labels, création `POST repos/<repo>/labels`, pose `POST repos/<repo>/issues/<n>/labels` (valable pour les issues comme pour les PR), suppression `DELETE repos/<repo>/labels/<nom encodé>`. Les éléments portant un ancien label sont listés par `gh api --paginate repos/<repo>/issues?labels=<ancien>&state=all&per_page=100` (issues **et** PR, sans plafond; l'API de recherche, elle, plafonne à 1000). Correspondance fixe `type:bug→bug`, `type:feature→enhancement`, `type:adr→adr`, `type:chore→chore`. Alternative écartée : `gh issue list --label` (plafonné, une PR peut être refusée par `gh issue edit`) et `gh label edit --name` (impossible quand `bug` existe déjà).

**D5. Ordre et reprise.** Par ancien label : créer le remplaçant s'il manque, poser sur tous les éléments, puis supprimer. Si une pose échoue, `runMigrations` lève une exception sans consigner la migration; l'ancien label existe toujours, aucun élément n'a perdu d'étiquette, et la relance relit l'état réel (un élément qui a déjà le nouveau label est ignoré). Une lecture incomplète des éléments d'un label (erreur de l'API) fait échouer la migration avant toute suppression de ce label.

**D6. `needs-adr`** : supprimé seulement si aucune issue ni PR ne le porte (une requête de contrôle suffit); sinon conservé avec une note qui donne le nombre. S'il est le seul ancien label restant et qu'il est utilisé, `plan` renvoie zéro action : la migration n'est pas consignée et la note revient à chaque exécution.

**D7. Contrat de `plan`.** `plan` peut renvoyer un tableau d'actions (comme `0001`) ou `{ actions, notes }`. `runMigrations` normalise : `const r = m.plan(...); const actions = Array.isArray(r) ? r : r.actions ?? []; const notes = Array.isArray(r) ? [] : r.notes ?? [];` et ajoute `notes` à chaque entrée du résultat. Le nombre d'éléments par ancien label figure dans la description des actions de la simulation. `versioning.md` (bloc de contrat) et l'étape 5 de la phase de mise à jour de `SKILL.md` sont mis à jour : les notes sont présentées à l'utilisateur.

**D8. Ce dépôt.** `config.keep` du manifeste perd `.github/labels.json` et `scripts/sync-labels.mjs` (modification à la main du manifeste, qui est le fichier de configuration du projet). Résultat attendu de `--update` : `labels.json` et `sync-labels.mjs` créés; `architecture-decision.yml` remplacé par le modèle (resté tel que généré); `bug.yml`, `feature.yml` et `docs/workflow.md`, adoptés, sont fusionnés à partir de leur base ou rapportés identiques; la simulation et le diff le confirment avant écriture. `adr` et `chore` sont créés sur GitHub par `sync-labels.mjs` sur accord.

**D9. Principe de réutilisation** dans `SKILL.md` (phase GitHub), formulé pour tout module de forge ou de suivi. Il pourrait devenir un ADR le jour où un second module de forge existe (#23, #25); question laissée au propriétaire.

## Risks / Trade-offs

- [Suppression d'un label non réversible : il disparaît de toutes les issues et PR] → relabellisation complète avant suppression, liste sans plafond, échec qui arrête avant la suppression, simulation puis accord.
- [Commande visant le mauvais dépôt] → aucune commande ne dépend du dossier courant; les tests vérifient que chaque appel contient le dépôt.
- [Limites de débit de l'API pour beaucoup d'éléments] → une requête par élément; acceptable pour des dépôts de cette taille.
- [Projets dont `labels.json` a été modifié] → mise à jour par la fusion à trois voies, conflit sinon; si le projet garde des `type:*` dans son fichier, `sync-labels.mjs` les recréera après la migration : à signaler dans `references/github-setup.md`.
- [Écart de convention] : le préfixe `type:` disparaît; les dépôts qui l'ont gardé continuent de fonctionner, seule la migration les convertit.

## Migration Plan

`--update` met à jour les fichiers; `node scripts/migrate.mjs --target <dépôt>` simule la conversion des labels; accord explicite, puis `--apply`. Retour arrière : recréer les anciens labels à la main (les éléments gardent les nouveaux).
