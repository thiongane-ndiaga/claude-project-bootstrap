---
id: ARCH-006
title: Stratégie de mise à jour des fichiers générés
domain: architecture
rules: false
---

# Stratégie de mise à jour des fichiers générés

## Statut

Proposé.

## Context

Le plugin génère des fichiers que les projets modifient ensuite (`CLAUDE.md`, `docs/workflow.md`, `ci.yml`, formulaires d'issues…). Quand un modèle change, `scaffold.mjs --update` ne sait aujourd'hui que :
remplacer un fichier resté tel que généré, laisser un fichier personnalisé dont le modèle n'a pas changé, ou signaler un conflit sans rien proposer (code 3).
Un projet qui a seulement ajouté une ligne à côté du contenu géré se retrouve donc en conflit à chaque évolution du modèle.

Trois approches ont été comparées (issue #73, trois explorations indépendantes) :

| Approche | Couvre | Limite |
|---|---|---|
| Fusion à trois voies (base / projet / nouveau modèle) | tout fichier généré | une modification voisine d'une ligne changée fait conflit ; un YAML « propre » peut être invalide |
| Zones gérées (marqueurs dans le fichier) | les parties balisées | découpage fin nécessaire (6 à 10 paires par fichier), texte hors zone figé, fragile aux formateurs |
| Séparation en fichiers (géré / propre au projet) | `CLAUDE.md`, `ci.yml` | inadaptée à `docs/workflow.md` ; migration des fichiers existants |

Aucune ne suffit seule. La fusion à trois voies exige une **base** : ce que le plugin avait généré. Les sources possibles sont l'étiquette git du plugin (réseau requis, ne correspond pas aux versions non publiées), le cache du plugin (purgé 14 jours après une mise à jour) ou une copie conservée dans le projet.

Contraintes : aucune dépendance npm, Node ≥ 20.19, Windows, Linux et macOS, jamais d'écrasement silencieux, relecture obligatoire de ce qui s'exécute (CI, hooks), idempotence.

## Decision

1. **La base est conservée dans le projet**, dans `.bootstrap/base/<chemin du fichier>`, versionnée avec le reste. Elle est écrite à chaque génération ou mise à jour, pour les seuls fichiers susceptibles d'être fusionnés. Son empreinte doit égaler `files[<fichier>].generated` du manifeste ; sinon la base est ignorée.
2. **La fusion à trois voies s'applique à tout fichier généré** modifié par le projet dont le modèle a changé, par `git merge-file -p` sur des copies normalisées en LF (git est déjà requis pour les diffs), style de conflit fixé explicitement. Une fusion propre est écrite et consignée ; un conflit n'est **jamais écrit dans le fichier** : la proposition figure dans le rapport (`diffs`). Base absente ou invalide : comportement actuel (conflit).
3. **Les fichiers `CLAUDE.md` et `ci.yml` sont séparés** en une partie gérée par le plugin (fichier entier, mis à jour sans conflit) et une partie propre au projet (`owned`) : le contenu géré de `CLAUDE.md` va dans `.claude/rules/project-bootstrap.md` ; `ci.yml` reste géré et appelle une action composite locale `project-setup`, propre au projet. Cette décision est **conditionnée** à la vérification du chargement de `.claude/rules/` et de l'action composite sous les trois systèmes (voir Risks).
4. **`docs/workflow.md`** : le choix entre zones gérées et fichier séparé est renvoyé à l'issue dédiée, à trancher après la séparation de `CLAUDE.md` et `ci.yml`. Aucun marqueur n'est introduit par cet ADR.
5. **Les projets antérieurs au manifeste** sont traités par une table d'empreintes des versions publiées, embarquée dans le plugin (issue dédiée), indépendante des points 1 à 4.
6. **`date` est figée** dans la configuration enregistrée au manifeste : `{{DATE}}` rend sinon la régénération non reproductible.

## Do's and Don'ts

### Do

- Normaliser en LF pour comparer et fusionner, puis restaurer le style de fin de ligne du fichier d'origine.
- Retomber sur le conflit actuel dès que la base manque, que son empreinte diffère ou que la fusion échoue.
- Relire (et faire relire) tout fichier exécutable fusionné, `ci.yml` en tête.
- Rendre la mise à jour idempotente : la deuxième exécution ne change rien.

### Don't

- Ne pas écrire de marqueurs de conflit dans un fichier du projet.
- Ne pas dépendre du réseau ni du cache du plugin pour fusionner.
- Ne pas introduire de marqueurs de zone dans les modèles sans décision explicite (issue dédiée).
- Ne pas supprimer un fichier que le modèle ne produit plus : le signaler.

## Consequences

### Positive

- Un projet qui n'a modifié que des lignes éloignées du contenu géré se met à jour sans conflit.
- Fonctionne hors ligne et pour une version non publiée, y compris ce dépôt.
- La base est vérifiable (empreinte déjà au manifeste) : une base fausse est détectée, sans régression.
- Aucune nouvelle dépendance ; réversible (la base est un simple dossier).

### Negative

- Quelques fichiers de plus dans chaque projet généré (`.bootstrap/base/`, `.claude/rules/project-bootstrap.md`, `project-setup`).
- Le contenu géré de `CLAUDE.md` devient moins visible à l'ouverture du fichier.
- Les projets existants demandent une migration ponctuelle (diff manuel une fois, sans la table d'empreintes).

### Risks

- Une fusion « propre » peut produire un YAML invalide ou une étape en double : d'où la relecture obligatoire de `ci.yml`.
- `git merge-file` dépend de la version de git et de ses réglages : à tester sous Windows, Linux et macOS.
- Établi par la documentation de Claude Code (page « memory », lue le 2026-10-31) : un fichier `.claude/rules/*.md` sans `paths` est chargé au démarrage « with the same priority as .claude/CLAUDE.md » ; les règles du projet sont reprises par les sous-agents, sauf Explore et Plan ou `omitClaudeMd: true`. Les fichiers de règles comptent chacun pour l'avertissement de longueur (cible de 200 lignes) ; la limite dure est de 4 MiB par fichier.
- **Non établi**, à vérifier par un essai avant de réaliser le point 3 :
  - l'ordre de priorité entre les règles et le `CLAUDE.md` racine (la documentation ne le dit pas : les deux sont concaténés, et en cas de contradiction Claude peut suivre l'un ou l'autre) ;
  - le chargement des règles chez les teammates des agent teams (la documentation cite `CLAUDE.md`, pas `.claude/rules/`) ;
  - le retrait des commentaires HTML dans les règles et les fichiers importés (la documentation vise « CLAUDE.md files »), ce qui conditionne l'usage de marqueurs dans `docs/workflow.md` (issue dédiée) ;
  - le comportement quand un fichier importé par `@` est absent.
- Non vérifié non plus : validité d'une action composite locale quasi vide sous les trois systèmes, comportement des formateurs sur d'éventuels marqueurs.
- Si ces vérifications échouent, le point 3 est revu ; les points 1, 2, 5 et 6 restent valables. Le contenu géré de `CLAUDE.md` ne doit pas contredire celui du projet : les deux sont chargés ensemble sans priorité garantie.

## Compliance and Enforcement

Tests de `tests/scaffold.test.mjs` : mise à jour N → N+1 avec fichiers modifiés (voisins et éloignés), base absente ou invalide, CRLF/LF, idempotence. Pas de règle Archgate : l'état des projets générés n'est pas une donnée du dépôt du plugin que `archgate check` peut lire.

## References

- Issue #73 et sous-issues (base et fusion à trois voies, séparation de `CLAUDE.md` et `ci.yml`, `docs/workflow.md`, table d'empreintes).
- Issues #44 et #27.
- https://git-scm.com/docs/git-merge-file
- https://code.claude.com/docs/en/memory
