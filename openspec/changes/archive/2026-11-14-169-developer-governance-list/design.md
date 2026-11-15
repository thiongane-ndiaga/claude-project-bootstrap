# Design

## Context

Voir `proposal.md` (Why). Constat vérifié dans le code, avant d'écrire :

- Les modèles `core/templates/docs/workflow.md` (fr) et `core/templates.en/docs/workflow.md` (en) portent la même ligne `developer` (ligne 142), dans le bloc `@@module:agent-profiles`. Les deux hooks `agent-profiles/templates/.claude/hooks/profile-guard.mjs` et `templates.en/` ont un `writeExcept` identique (ligne 140), tout en minuscules.
- Liste du tableau (10 éléments, dont 9 chemins entre accents graves et le mot « archives » sans accents graves) : `.archgate/`, `.bootstrap/`, `.claude/`, `.git/`, `.githooks/`, `.github/`, `docs/architecture/`, `openspec/specs/`, « archives », `docs/workflow.md`.
- `writeExcept` (17 entrées, ordre du hook) : `.archgate/`, `.bootstrap/`, `.claude/`, `.git/`, `.githooks/`, `.github/`, `.release-please-manifest.json`, `agents.md`, `claude.md`, `docs/architecture/`, `docs/workflow.md`, `openspec/changes/archive/`, `openspec/config.yaml`, `openspec/config.yml`, `openspec/schemas/`, `openspec/specs/`, `release-please-config.json`.

**Le constat de l'issue est exact mais incomplet.** Il manque bien des « dossiers », mais :

- huit entrées de `writeExcept` ne sont pas citées entre accents graves dans le tableau : `.release-please-manifest.json`, `agents.md`, `claude.md`, `openspec/changes/archive/` (le tableau n'a que le mot « archives »), `openspec/config.yaml`, `openspec/config.yml`, `openspec/schemas/` et `release-please-config.json` ;
- sept des dix-sept entrées sont des fichiers (`.release-please-manifest.json`, `agents.md`, `claude.md`, `docs/workflow.md`, `openspec/config.yaml`, `openspec/config.yml`, `release-please-config.json`) ; le tableau dit « dossiers de gouvernance » et n'en cite qu'un seul fichier ;
- l'ordre diffère pour les entrées communes : le tableau place `openspec/specs/` avant `docs/workflow.md`, le hook l'inverse (ordre alphabétique) ;
- `agents.md` et `claude.md` sont en minuscules dans le hook, qui compare sans tenir compte de la casse (`entry.toLowerCase()` contre le chemin normalisé en minuscules) ; les fichiers réels sont `AGENTS.md` et `CLAUDE.md`.

La spec `agent-profiles` (« Dossiers de gouvernance interdits à developer ») énumère les mêmes 17 entrées, avec `CLAUDE.md` et `AGENTS.md` en majuscules et dans un autre ordre (dossiers, puis fichiers) : alignée sur le contenu, aucun changement. ARCH-012 (tableau des droits) écrit « tout sauf les dossiers de gouvernance » sans liste : rien à aligner.

## Goals / Non-Goals

**Goals:**
- La liste du tableau est celle de `writeExcept`, en fr et en en.
- Toute divergence future fait échouer un test qui nomme l'entrée fautive.

**Non-Goals:**
- Générer la liste depuis le hook (le modèle reste statique, décision du commentaire de #169).
- Modifier le hook, ses entrées ou leur comparaison.
- Rendre les textes qui citent une partie de la liste exhaustifs.

## Decisions

**1. Liste statique dans le modèle, test de cohérence.** Alternative écartée : un paramètre `{{…}}` rempli depuis le hook au moment de la génération. Elle couple le générateur au parsing d'un fichier de profil, que le modèle ne fait pas aujourd'hui (la table `PROFILES` est du code, pas une donnée), pour une seule cellule. Le test est le garde-fou, comme pour l'échelle d'arbitrage de `project-lead` (spec `workflow-document`, « Échelle identique »).

**2. Format de la cellule.** Une seule parenthèse, les 17 entrées entre accents graves, séparées par `, `, dans l'ordre exact de `writeExcept`, sans rien d'autre entre accents graves dans la cellule. Cellule française :

`tout sauf les dossiers et fichiers de gouvernance (`.archgate/`, `.bootstrap/`, `.claude/`, `.git/`, `.githooks/`, `.github/`, `.release-please-manifest.json`, `agents.md`, `claude.md`, `docs/architecture/`, `docs/workflow.md`, `openspec/changes/archive/`, `openspec/config.yaml`, `openspec/config.yml`, `openspec/schemas/`, `openspec/specs/`, `release-please-config.json`), comparés sans tenir compte de la casse`

Cellule anglaise : `everything except the governance folders and files (…même liste…), compared case-insensitively`. Les entrées restent en minuscules, telles que dans le hook : la phrase finale (confirmée) explique pourquoi `claude.md` n'est pas `CLAUDE.md`.

**3. Aucune garde `@@module` autour des entrées.** La liste du hook ne dépend d'aucun module (même sans `openspec`, `release` ou `archgate`, les entrées sont interdites). Une garde ferait diverger le tableau du hook dans la configuration « `agent-profiles` seul » et casserait le test.

**4. Extraction et condition de succès du test.** Dans le bloc « docs/workflow.md : qui fait quoi » de `tests/scaffold.test.mjs`, à l'intérieur de la boucle langue × configuration existante (trois configurations, fr et en) :
- côté tableau : réutiliser `section`, `rows` et `cells` ; prendre la ligne dont la première cellule est `` `developer` `` et sa troisième cellule ; extraire les jetons entre accents graves (`/`([^`]+)`/g`) de **toute la cellule**, sans regex de parenthèse : un élément en trop entre accents graves, où qu'il soit, devient une entrée en trop ;
- séparateurs : le contenu de la première parenthèse de la cellule doit égaler la liste du hook, chaque entrée entre accents graves, jointe par `, ` ; la clause « séparées par des virgules » de la spec est ainsi contrôlée ;
- côté hook : lire le `.claude/hooks/profile-guard.mjs` généré comme texte (le hook s'exécute à l'import, lecture de stdin et `process.exit` : il ne s'importe pas) et en extraire la liste par `/developer: \{ writeExcept: (\[[^\]]*\])/`. Le précédent de `tests/scaffold.test.mjs` (ligne 2144) est un `.test()` par regex sur le texte du hook, sans extraction de la liste ; le `JSON.parse` du tableau extrait est nouveau ;
- condition de succès : égalité stricte des deux listes (mêmes entrées, même nombre, même ordre) ; la liste du hook extraite ne doit pas être vide ;
- message d'échec : nomme les entrées manquantes, en trop, répétées (comptage par entrée) et signale l'ordre quand les mêmes entrées sont dans un autre ordre ;
- l'échec est lui-même testé : appliquer la fonction de comparaison à des copies altérées (entrée retirée, entrée ajoutée, deux entrées permutées, entrée répétée, liste vide) et vérifier que chacune est signalée (scénarios de la spec).

**5. Une seule exigence ajoutée, dans `workflow-document`**, avec tous ses scénarios (succès, puis échecs, comme « Table de double encodage » et son scénario « Puce de CLAUDE.md sans ligne »). Elle ne touche pas « Qui fait quoi » (cinq scénarios à recopier sous MODIFIED sans changement de leur comportement) : ADDED évite de perdre du détail à l'archivage.

## Autres textes qui citent la liste

Statut après lecture de chaque texte (ARCH-011, arc42 §8 lignes 108-131, `pitfalls.md` ligne 96, arc42 §11 ligne 29 lus en entier).

| Texte | Contenu | Statut |
|---|---|---|
| `agent-profiles/templates{,.en}/.claude/hooks/profile-guard.mjs` | `writeExcept` (source) | source, inchangé |
| `agent-profiles/templates{,.en}/.claude/agents/developer.md` | renvoie à `writeExcept` sans lister | aligné |
| `agent-profiles/templates/.claude/agents/project-lead.md` ligne 24 et équivalent en | `CLAUDE.md`, `.claude/`, `.github/`, `docs/workflow.md` : fichiers qu'aucun profil n'écrit, autre sujet | hors périmètre (liste d'exemples) |
| `core/templates{,.en}/docs/workflow.md` ligne 307 (double encodage) | « jamais sous `.claude/`, `docs/architecture/` ni `openspec/specs/` » | hors périmètre (exemples, non exhaustif) |
| `core/templates{,.en}/docs/workflow.md` ligne 66 | « specs vivantes interdites à `developer` » | aligné |
| ARCH-012, tableau des droits | « tout sauf les dossiers de gouvernance », sans liste | aligné |
| ARCH-014 | liste d'exclusion décrite sans énumération | aligné |
| ARCH-011 | aucune liste ; mais le risque « Les liens et jonctions ne sont pas résolus » (ligne 65) contredit le chemin réel d'ARCH-014 et d'arc42 §8 | aligné pour la liste ; contradiction sur les liens hors périmètre, à signaler à `architect` |
| arc42 §8 (lignes 126 et 128) | « dossiers et fichiers de gouvernance, dont `.claude/`, `.git/`, `docs/architecture/`, `openspec/specs/`, `CLAUDE.md` » ; comparaison sans casse ; jonctions résolues (ligne 127) | aligné (exemples cohérents avec la liste) ; aucune modification |
| arc42 §11 (ligne 29) | risque de la liste d'exclusion : mitigation « tenir la liste à jour dans la table », sans mention du test | à compléter par `architect` : la mitigation cite le test de cohérence |
| `references/pitfalls.md` ligne 96 | « dossiers de gouvernance » seulement (les fichiers sont omis) ; « les liens ou jonctions ne sont pas résolus » contredit la ligne 99 | « dossiers » à corriger en « dossiers et fichiers » (dans ce changement) ; contradiction sur les liens hors périmètre, à signaler |
| `references/pitfalls.md` ligne 99 | « un dossier de gouvernance ajouté plus tard n'est protégé qu'une fois listé » | à compléter (dans ce changement) : ajouter une entrée à `writeExcept` oblige à modifier les deux hooks et les deux modèles |
| `references/pitfalls.md` ligne 178 | fichiers de gouvernance sans aucun rédacteur, quelques exemples | aligné |
| spec `agent-profiles` « Dossiers de gouvernance interdits à developer » | les 17 entrées, autre ordre, `CLAUDE.md` et `AGENTS.md` en majuscules | aligné sur le contenu, inchangé |
| `docs/workflow.md` du dépôt (ligne 43) | même liste de dix éléments que l'ancien modèle | divergent, hors périmètre : fichier de gouvernance, rafraîchi par l'utilisateur ou par une session sans `mainAgent` (`project-lead` n'écrit rien) ; un suivi sera proposé par le chef de projet |
| `.claude/hooks/profile-guard.mjs` du dépôt | même `writeExcept` que le modèle | aligné |

## Risks / Trade-offs

- [Le modèle et le hook divergent à nouveau lors d'un ajout d'entrée] → le test de cohérence échoue en nommant l'entrée ; la tâche d'ajout doit modifier le hook (fr et en) et les deux modèles, ce que consigne `pitfalls.md`.
- [Le test ne voit pas un dossier de gouvernance jamais listé] → hors de portée : il compare le tableau au hook, pas le hook à la réalité ; le risque reste celui d'ARCH-014 et d'arc42 §11.
- [Un projet ajoute des entrées à son propre hook] → non vues par le test du plugin, qui ne contrôle que les modèles.
- [Le format de la cellule change et casse l'extraction] → le test échoue de façon visible (aucune ligne `developer`, liste vide) au lieu de passer à vide.
- [Un lecteur prend `claude.md` pour un fichier en minuscules] → la phrase « sans tenir compte de la casse » dans la cellule.
- [Les instantanés changent sur huit combinaisons] → seul le hash de `docs/workflow.md` doit changer dans chacun ; relire le diff avant de réécrire.
- [Une liste d'exclusion reste plus faible qu'une liste d'autorisation] → déjà consigné (ARCH-014, arc42 §11) ; ce changement n'y touche pas.

## Open Questions

- Le `docs/workflow.md` du dépôt : à rafraîchir par l'utilisateur ou par une session sans `mainAgent`, après la sortie de ce changement ; le chef de projet proposera le suivi. Sans incidence sur les specs ni les tâches.
- Les lignes de `pitfalls.md` et d'ARCH-011 sur les liens et jonctions « non résolus » contredisent le chemin réel ; à traiter dans un autre changement.
