---
id: ARCH-006
title: Stratégie de mise à jour des fichiers générés
domain: architecture
rules: false
---

# Stratégie de mise à jour des fichiers générés

## Statut

Accepté. Les décisions 3 à 5 ont été précisées après essais et mesures (voir « Suites »).

## Context

Le plugin génère des fichiers que les projets modifient ensuite (`CLAUDE.md`, `docs/workflow.md`, `ci.yml`, formulaires d'issues…). Quand un modèle change, `scaffold.mjs --update` ne sait que : remplacer un fichier resté tel que généré, laisser un fichier personnalisé dont le modèle n'a pas changé, ou signaler un conflit sans rien proposer (code 3).
Un projet qui a seulement ajouté une ligne à côté du contenu géré se retrouve donc en conflit à chaque évolution du modèle.

Trois approches ont été comparées (issue #73, trois explorations indépendantes) :

| Approche | Couvre | Limite |
|---|---|---|
| Fusion à trois voies (base / projet / nouveau modèle) | tout fichier généré | une modification voisine d'une ligne changée fait conflit ; un YAML « propre » peut être invalide |
| Zones gérées (marqueurs dans le fichier) | les parties balisées | découpage fin nécessaire (6 à 10 paires par fichier), texte hors zone figé, fragile aux formateurs |
| Séparation en fichiers (géré / propre au projet) | `CLAUDE.md`, `ci.yml` | inadaptée à `docs/workflow.md` ; migration des fichiers existants |

La fusion à trois voies exige une **base** : ce que le plugin avait généré. Sources possibles : l'étiquette git du plugin (réseau requis, absente pour une version non publiée), le cache du plugin (purgé 14 jours après une mise à jour) ou une copie conservée dans le projet.

Contraintes : aucune dépendance npm, Node ≥ 20.19, Windows, Linux et macOS, jamais d'écrasement silencieux, relecture obligatoire de ce qui s'exécute (CI, hooks), idempotence.

## Decision

1. **Base conservée dans le projet** : `.bootstrap/base/<chemin>.base` (suffixe neutre), versionnée, pour les fichiers fusionnables. Ignorée si son empreinte diffère de `generated` au manifeste.
2. **Fusion à trois voies** (`git merge-file`, copies LF) de tout fichier généré modifié dont le modèle a changé. Fusion propre : écrite, statut `reconciled`. Conflit : jamais écrit, proposition dans `diffs`. Base absente ou invalide : conflit comme avant.
3. **`ci.yml` entièrement géré**, avec une action locale `project-setup` propre au projet (`owned`) pour installer sa chaîne d'outils. `CLAUDE.md` n'est pas séparé : la fusion suffit.
4. **`docs/workflow.md`** : aucun mécanisme en plus de la fusion, aucun marqueur de zone.
5. **Projets sans manifeste** : pas de table d'empreintes ; tout fichier divergent est adopté comme personnalisé.
6. **`date` figée** dans la configuration du manifeste.

### Suites (2026-10-31)

- **Suffixe `.base`** (revue de #81) : les copies d'origine reprenaient l'extension d'origine, et des outils du projet pouvaient les traiter comme du code ; une base invalide est signalée sous `baseInvalid`.
- **Point 3** : un essai en sessions neuves montre que `.claude/rules/*.md` est chargé par la session, les sous-agents et les teammates, mais que la priorité face à `CLAUDE.md` n'est pas fixée par l'outil (le teammate a retenu `CLAUDE.md`, le sous-agent les règles). Séparer `CLAUDE.md` retirerait au projet le moyen d'ajuster une règle gérée. Le gain est déjà couvert par la fusion (#82).
- **Point 4** : dans ce dépôt, `docs/workflow.md` ne diffère du modèle que par 6 modifications d'une ligne, que la fusion absorbe (#83, option A).
- **Point 5** : le contenu d'un fichier dépend de la configuration du projet, donc une table d'empreintes ne reconnaîtrait rien ; `fleetbook` n'est d'ailleurs pas une sortie du plugin (#84).

## Do's and Don'ts

### Do

- Normaliser en LF pour comparer et fusionner, puis restaurer le style de fin de ligne du fichier d'origine.
- Retomber sur le conflit actuel dès que la base manque, que son empreinte diffère ou que la fusion échoue.
- Relire (et faire relire) tout fichier exécutable fusionné, `ci.yml` en tête.
- Rendre la mise à jour idempotente : la deuxième exécution ne change rien.
- Garder le contenu géré cohérent avec celui du projet : aucune règle gérée ne doit contredire une règle du projet.

### Don't

- Ne pas écrire de marqueurs de conflit dans un fichier du projet.
- Ne pas dépendre du réseau ni du cache du plugin pour fusionner.
- Ne pas introduire de marqueurs de zone dans les modèles sans nouvelle décision explicite.
- Ne pas supprimer un fichier que le modèle ne produit plus : le signaler.

## Consequences

### Positive

- Un projet qui n'a modifié que des lignes éloignées du contenu géré se met à jour sans conflit.
- Fonctionne hors ligne et pour une version non publiée, y compris ce dépôt.
- La base est vérifiable (empreinte déjà au manifeste) : une base fausse est détectée, sans régression.
- Aucune nouvelle dépendance ; réversible (la base est un simple dossier).

### Negative

- Quelques fichiers de plus dans chaque projet généré (`.bootstrap/base/`, `project-setup`).
- Un projet qui modifie la même ligne que le modèle obtient un conflit, à résoudre à la main.
- Un `ci.yml` déjà modifié pour y installer des outils produit un conflit une fois, à résoudre en déplaçant l'étape dans l'action.

### Risks

- Une fusion « propre » peut produire un YAML invalide ou une étape en double : d'où la relecture obligatoire de `ci.yml`.
- `git merge-file` dépend de la version de git et de ses réglages : testé sous Windows, Linux et macOS par la CI.
- Vérifié le 2026-10-31 (PR #87) : l'action composite locale s'exécute sur ubuntu, windows et macos, et les noms des checks sont inchangés. La règle Archgate d'épinglage a dû accepter les actions locales.
- Vérifié le 2026-10-31 (essai en sessions neuves) : les règles de `.claude/rules/` et les commentaires HTML retirés valent pour la session, les sous-agents et les teammates ; la priorité entre règles et `CLAUDE.md` est laissée au jugement de chaque agent.

## Compliance and Enforcement

Tests de `tests/scaffold.test.mjs` : mise à jour N → N+1 avec fichiers modifiés (voisins et éloignés), base absente ou invalide, CRLF/LF, idempotence, `project-setup`. Pas de règle Archgate : l'état des projets générés n'est pas une donnée du dépôt du plugin que `archgate check` peut lire.

## References

- Issue #73 et sous-issues #81 (base et fusion), #82 (`ci.yml`), #83 (`docs/workflow.md`), #84 (table d'empreintes).
- Issues #44 et #27.
- https://git-scm.com/docs/git-merge-file
- https://code.claude.com/docs/en/memory
