## Context

Le skill déroule des phases (0 à 4) pilotées par Claude ; l'avancement n'existe que dans le contexte de la session. Après un redémarrage de Claude Code (imposé par le chargement des agents et plugins) ou une compaction, rien ne dit où reprendre, et `bootstrap.json` (écrit dans le scratchpad de la session) n'existe plus. Les actions globales à la machine ne sont pas tracées. `scaffold.mjs` écrit `.bootstrap/manifest.json` et `.bootstrap/base/` ; `audit.mjs` lit l'état du projet. Les scripts du plugin sont du Node sans dépendance, avec des exécuteurs injectables pour les tests. La décision d'ensemble est l'ADR ARCH-009.

## Goals / Non-Goals

**Goals:**
- Reprendre à la bonne étape après un arrêt à n'importe quel point, même sans état, avec la configuration restituée.
- Savoir, pour chaque action globale, comment l'annuler, sans jamais l'exécuter à la place de l'utilisateur.

**Non-Goals:**
- Exécuter les annulations, reprendre une action GitHub à moitié faite, partager l'état entre machines, couvrir la phase 5, faire lire le journal par l'audit.
- S'appuyer sur `archgate session-context`, `openspec status --json` ou les `doctor --json` : ils décrivent un outil, pas l'avancement du bootstrap (le skill reste libre de les consulter).

## Decisions

1. **Script `state.mjs`** plutôt que des instructions seules : un fichier JSON structuré, écrit de façon atomique (fichier temporaire, renommage avec nouvelles tentatives pour les antivirus de Windows), lu par `resume` et testé. Un état tenu par le modèle ne survit pas à une compaction.
2. **Dossier `.bootstrap/local/` qui s'ignore seul** (`.gitignore` réduit à `*`), contenant `state.json` et `effects.json` : propres à la machine (chemins, commandes globales), ils ne doivent jamais partir dans un commit, y compris avant la génération du `.gitignore` du projet et dans un dépôt dont le `.gitignore` est conservé. Alternative écartée : deux lignes dans le `.gitignore` généré (n'agit qu'après la génération, change tous les instantanés).
3. **Étapes fixes et ordonnées** (`phase0-scope` à `phase4-adr`), avec une condition sur les modules : `phase2-cli` (`openspec` ou `archgate`), `phase2-openspec`, `phase2-archgate`, `phase2-archgate-plugin`, `phase2-githooks`, `phase2-agent-teams`, `phase2-quality-gate` (`claude`), `phase2-github`, `phase4-adr` (`archgate` et `github`). En mode `cliInstall: local`, `phase2-cli` passe après `phase2-generate` (le `package.json` est généré). `next` renvoie la première étape applicable ni `done` ni `skipped`.
4. **Preuves vérifiables plutôt que confiance dans l'état** : `phase2-git` → `.git` ; `phase2-generate` → manifeste ; `phase2-openspec` → `openspec/config.yaml` (un `init` interrompu laisse un dossier partiel) ; `phase2-githooks` → `core.hooksPath` local vaut `.githooks` ; `phase2-agent-teams` → la variable dans `settings.local.json`. Une étape `done` sans sa preuve est signalée et redevient la prochaine. Les autres étapes ne sont pas vérifiables : on croit l'état.
5. **Déduction sans état** : les mêmes preuves, les modules et la configuration lus dans le manifeste (sans manifeste, aucun module connu), et toute étape non vérifiable qui précède une étape prouvée est déduite faite. Elles sont rapportées dans `deduced`. Risque : un `.git` ou un manifeste antérieurs au bootstrap sont de fausses preuves.
6. **`resume` en lecture seule** (rien n'est créé, même sur un dossier inexistant) ; `init`, `step` et `effect` exigent une cible existante, `step` exige un état, `init` refuse un état existant (`--force` repart de zéro) pour qu'un second `init` après redémarrage n'efface pas l'avancement.
7. **Configuration restituée** : `init` enregistre les réponses (clés du schéma de `bootstrap.json` seulement, les autres sont ignorées et signalées), `config --set` y fusionne la configuration résolue en phase 1, `config --out` la réécrit pour `scaffold.mjs --config` dans une nouvelle session. `--detect` rapporte `resumable`.
8. **Journal : valeur précédente lue avant l'action**, annulation calculée par le script, commande et annulation stockées en chaîne (lisible) **et** en tableau d'arguments (aucune citation à refaire) :
   - `npm-global` : `npm ls -g --depth=0 --json` (sortie lue quel que soit le code, car npm sort en 1 pour un paquet absent) ; annulation = réinstaller la version précédente, sinon `npm uninstall -g`, `--prefix` conservé. Une entrée par paquet.
   - `git-config-global` : `git config --global --get` ; annulation = restaurer, sinon `--unset` ; clé à plusieurs valeurs (code 2) refusée.
   - `plugin` et `marketplace` : la liste existante est lue ; élément déjà présent → pas d'annulation et avertissement (il peut servir à d'autres projets) ; lecture impossible → annulation avec avertissement.
   - `custom` : commande et annulation fournies ; sans annulation, « manuelle ».
   Le script n'exécute pas l'action ni l'annulation.
9. **Sécurité de l'exécuteur** : liste blanche des entrées (nom de paquet npm, version exacte, clé `section.nom`, portée) ; un shell n'est utilisé que sous Windows pour les shims `npm` et `claude`, avec des arguments limités aux caractères sûrs ; `--prefix` refusé sous Windows (le mode `user` y équivaut à `global`) ; `~` développé pour la lecture seulement.
10. **Écriture dès la phase 0** : `init` suit les réponses de la phase 0 (le dossier est ignoré par git donc invisible dans le dépôt) ; si le contexte saute avant, les réponses sont perdues et la phase 0 recommence.
11. **Intégration au skill** : `resume` au début ; `config --out` pour restituer `bootstrap.json` ; `step --status doing` avant chaque étape (une interruption en cours d'étape reste visible, ce que le hors-périmètre GitHub suppose), `done` après ; `effect` puis `effect --done` autour des actions globales ; `effects --undo` proposé en fin de phase 2.
12. **Tests** dans `tests/state.test.mjs` : arrêt simulé après chaque étape applicable pour six sélections de modules et les deux modes de CLI, preuves réelles (dépôt git temporaire, génération par `scaffold.mjs`), preuve manquante, état absent, lecture seule, atomicité, entrées invalides, journal avec exécuteur simulé, état intact après `scaffold.mjs` et `--update`, présence des appels dans `SKILL.md`.

## Risks / Trade-offs

- Une étape non vérifiable peut être marquée `done` à tort : la reprise la croit ; l'audit de la phase 3 reste le contrôle final.
- Le journal ne couvre que ce que le skill déclare ; l'audit ne le recoupe pas.
- Les annulations sont des propositions : `npm uninstall -g` peut retirer une CLI utilisée ailleurs ; l'utilisateur relit avant d'exécuter.
- `archgate login` et l'installation de `gh` passent par `custom` : l'annulation de `gh` n'est proposée que si l'outil était absent avant, sinon aucune.

## Migration Plan

Aucune migration ni changement de modèle : les projets existants ne sont pas touchés.

## Open Questions

Aucune.
