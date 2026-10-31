## Context

`ci.yml` généré (module `github`) contient un commentaire invitant à y insérer l'installation de la chaîne d'outils avant « Commandes du projet ». `.bootstrap/checks.json` est déjà un fichier `owned` (champ du catalogue, #75), lu par `run-checks.mjs`, qui est géré. ARCH-006 (point 3) retient pour `ci.yml` une action composite locale plutôt qu'un workflow réutilisable (`workflow_call`) : un job appelant ne peut pas avoir de `steps`, l'`env` du workflow n'est pas transmis, et les noms de checks risquent de changer, ce qui casserait la protection de `main`. La règle Archgate d'épinglage des actions (ARCH-004) rejette aujourd'hui toute action sans SHA, donc aussi une action locale.

## Goals / Non-Goals

**Goals:**
- Un point d'extension propre au projet, appelé par `ci.yml`, qui ne change pas les noms des checks.
- Réutiliser le mécanisme `owned` existant, sans nouveau code de moteur.
- Garder la règle d'épinglage utile : SHA exigé pour toute action externe, y compris dans les actions du projet.

**Non-Goals:**
- Jobs supplémentaires du projet (autres fichiers de workflow).
- Changer les déclencheurs, permissions ou la matrice (le projet édite alors `ci.yml`, et retombe dans le cas conflit/fusion de #81).
- Séparation de `CLAUDE.md`, découpage de `docs/workflow.md` (#83) et contrôle `--detect` (reste de #82).

## Decisions

**D1. Action composite à `.github/actions/project-setup/action.yml`, fichier `owned` du module `github`.** Alternatives : champ `setup` dans `checks.json` (l'installation d'outils passe en général par des `uses:` d'actions, qu'un script ne remplace pas) ; `workflow_call` (écarté par ARCH-006). Le chemin est celui qu'attend `uses: ./.github/actions/project-setup`.

**D2. Contenu initial : une étape `shell: bash` qui n'affiche qu'un message.** Une action composite exige des étapes ; une étape explicite évite un YAML vide ou invalide. `bash` existe sur les exécuteurs hébergés Windows (Git Bash), Linux et macOS ; les exécuteurs auto-hébergés sans `bash` ne sont pas couverts. Un commentaire rappelle que Node ≥ 20.19 doit rester disponible pour `run-checks.mjs`.

**D3. Appel juste avant « Commandes du projet », après OpenSpec et Archgate.** Les étapes OpenSpec et Archgate sont générées par leurs modules et n'ont besoin que de Node ; l'installation du projet sert aux commandes de `checks.json`. L'appel prend l'emplacement de l'ancien commentaire d'installation.

**D4. Migration d'un projet existant.** Un `ci.yml` resté tel que généré est remplacé ; un `ci.yml` modifié ailleurs qu'à l'emplacement du commentaire est fusionné à partir de sa base (#81) et rapporté `reconciled`, à relire ; une modification à l'emplacement remplacé, ou l'absence de base, donne un conflit unique. Le projet le résout en déplaçant son étape d'installation dans l'action, en reprenant le `ci.yml` du modèle (ou `--adopt`), puis en relançant `--update`. L'action est créée dans tous les cas.

**D5. Règle d'épinglage : `./…` accepté, et `.github/actions/**` couvert.** La règle passe sur deux motifs de fichiers. Un test de la règle n'existe pas dans le dépôt (le contrôle est celui d'`archgate check`) : la vérification est l'exécution d'`archgate check` sur ce dépôt, qui contient désormais une action locale.

**D6. Vérification en CI.** Cette PR modifie le `ci.yml` de ce dépôt et ajoute son action : sa CI exécute le tout sur ubuntu, windows et macos, ce qui établit que l'action locale fonctionne sur les trois systèmes. Le résultat est consigné dans ARCH-006 (Risks) et dans #82.

## Risks / Trade-offs

- [Action locale introuvable si le checkout est absent] → l'appel suit `actions/checkout` ; test sur le modèle.
- [Projet qui supprime l'action alors que `ci.yml` l'appelle] → recréée à la mise à jour (fichier `owned` absent = créé).
- [Projets existants avec installation dans `ci.yml`] → conflit possible une fois, documenté (D4).
- [Un fichier de plus dans chaque projet] → petit, créé une seule fois, jamais modifié par le plugin.
- [`project-setup` qui réinstalle un Node trop ancien] → rappel dans le commentaire de l'action.
