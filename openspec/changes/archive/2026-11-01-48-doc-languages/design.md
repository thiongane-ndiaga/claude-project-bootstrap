## Context

Les 50 modèles sont en français. `scaffold.mjs` lit chaque modèle dans `assets/templates/<chemin>`, applique les blocs `@@module` puis les paramètres `{{…}}`. `docLanguageName` n'est qu'un libellé de `CLAUDE.md`. Quatre paramètres portent du texte français (`VISIBILITY_FR`, `CI_OS_FR`, `CI_BLOCKING_NOTE`, `ACTIONS_CREDIT_NOTE` par défaut). Le skill traduit après la génération pour une autre langue. Les règles Archgate de ARCH-001 ne dépendent que de la numérotation des sections d'arc42, pas de leur titre.

## Goals / Non-Goals

**Goals:**
- Génération identique à chaque exécution pour une langue donnée (fr, en).
- Même arborescence et mêmes marqueurs dans toutes les langues, garantis par des tests.
- Ajouter une langue sans toucher au générateur.

**Non-Goals:**
- Traduire `SKILL.md`, les messages du plugin ou les fichiers de `openspec init`.
- D'autres langues que l'anglais, et un mécanisme de clés/valeurs pour chaque phrase.

## Decisions

1. **Arbres de modèles par langue avec repli** : `assets/templates.<lang>/` ne contient que les fichiers qui ont du texte ; un fichier absent est lu dans `assets/templates/`. Alternative écartée : chaînes externalisées en clés (`{{T_…}}`) : une clé par phrase rend 30 modèles illisibles et ne tient pas pour la prose (arc42, ADR, `workflow.md`).
2. **Langues disponibles = `fr` + dossiers `templates.*`** : le catalogue de langues est le système de fichiers, donc ajouter une langue ne demande aucune modification du générateur.
3. **Clé `docLanguage`**, défaut `fr`, consignée au manifeste seulement si présente (comme `cliInstall`) : manifestes et instantanés existants inchangés, mise à jour qui rejoue la langue.
4. **Paramètres localisés par une table** `LANG_PARAMS = { fr: {…}, en: {…} }` dans `scaffold.mjs`. `VISIBILITY_FR` et `CI_OS_FR` deviennent `VISIBILITY_LABEL` et `CI_OS_TEXT` dans tous les modèles ; la sortie française est inchangée. `ACTIONS_CREDIT_NOTE` : la valeur par défaut vient de la table, la valeur explicite de `bootstrap.json` l'emporte. `docLanguageName` : défaut par langue, valeur explicite prioritaire.
5. **Noms de fichiers identiques**, y compris les slugs français d'arc42 et des ADR : l'arborescence est le contrat, les règles Archgate restent valables.
6. **Parité testée** (ARCH-008) : mêmes lignes de marqueurs et mêmes paramètres que le modèle français. Les scripts (`.mjs`, `.ts`, `.githooks/pre-push`) sont comparés après retrait des chaînes et des commentaires, en **gardant les littéraux de regex** : la liste blanche du hook lecture seule et les regex de `restrict-path` sont de la sécurité, qui ne doit pas pouvoir diverger. Seules les règles `.rules.ts` d'ADR, dont le vocabulaire suit la langue, sont comparées sans regex. YAML : même structure hors commentaires, libellés (`name`, `description`, `label`, `placeholder`) et chaînes ; JSON : hors `description` ; markdown : même nombre de titres ; un modèle sans version anglaise ne contient aucune lettre accentuée ; un modèle anglais sans équivalent français échoue. Le test ne voit pas un écart de sens ni du français sans accent dans un modèle non traduit : la relecture de PR reste nécessaire.
7. **Vocabulaire du statut des ADR** : la section et les valeurs suivent la langue (`## Status`, `Proposed`, `Accepted`…) ; la règle ARCH-003 anglaise accepte le sien. Le skill (phase 4) écrit `Accepté (issue #<n>)` ou `Accepted (issue #<n>)` selon la langue. `full-en` passe `archgate check` dans la matrice, ce qui détecterait un décalage.
8. **Messages des scripts générés traduits** (`quality-gate`, `run-checks`, hooks, `check-pr-title`, `sync-labels`) : ce sont des textes lus par l'équipe du projet ; les tests de comportement des scripts anglais comparent les codes de sortie et les appels, pas les messages.
9. **Le skill ne traduit plus** : phase 0 propose les langues disponibles (`languages` de `scaffold.mjs --detect`), passe le code à `docLanguage` et à `openspec init --language`.
10. **Matrice** : `default-en` et `full-en` ; les invariants (aucun résidu, JSON valides, bases égales, reproductibilité) s'appliquent. `full-en` passe aussi la validation par les CLI réelles (`openspec init --language en`, `archgate check`, audit). La configuration de base de la matrice porte des valeurs françaises explicites (`docLanguageName`, `actionsCreditNote`) qui l'emporteraient sur les défauts de la langue : les variantes anglaises les retirent. La comparaison des chemins fr/en est un test séparé.
11. **Mise à jour** : `docLanguage` et `cliInstall` sont hérités du manifeste quand `--config` ne les définit pas (comme la date) ; une configuration sans la clé ne fait changer ni la langue ni le mode. `--detect` expose `languages` et la langue du manifeste. Le dossier `templates.fr` est ignoré pour que `fr` reste sans ambiguïté.
12. **Exigences portant sur des textes** (`project-setup-action`, `dependency-updates`, `cli-install-modes`) : elles valent pour toutes les langues ; les tests de contenu portent sur le français, et la parité des marqueurs, paramètres et du code est le garde-fou de la version anglaise.

## Risks / Trade-offs

- **Régression assumée** : une langue autre que `fr` et `en`, servie par la traduction du skill, est refusée tant que ses modèles n'existent pas ; `SKILL.md` propose `fr` ou `en` et renvoie vers `CONTRIBUTING`.
- L'heuristique des accents ne voit pas un texte français sans accent (« voir la page ») dans un modèle non traduit.

- Deux versions de chaque modèle à maintenir : le test de parité attrape les marqueurs, les paramètres, le code et les accents oubliés, pas un écart de sens ; `CONTRIBUTING` demande de modifier les deux versions dans la même PR.
- Le texte anglais est écrit une fois et relu par des humains avant publication : une faute de traduction n'est pas détectable par les tests.
- Un projet qui avait déjà fait traduire ses fichiers a des fichiers personnalisés : la fusion à trois voies s'applique, rien n'est écrasé.

## Migration Plan

Aucune migration : un projet existant est en français implicite. Passer en anglais après coup n'est pas géré (les fichiers modifiés seraient en conflit) ; ajouter `docLanguage` et relancer `--update` ne change que les fichiers restés tels que générés.

## Open Questions

Aucune.
