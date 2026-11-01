---
id: ARCH-009
title: État de reprise du bootstrap et journal des effets globaux
domain: architecture
rules: false
files: ["skills/project-bootstrap/**"]
---

# État de reprise du bootstrap et journal des effets globaux

## Statut

Accepté.

## Context

Le bootstrap impose de redémarrer Claude Code (agents et plugins ne se chargent qu'au démarrage) et le contexte d'une session peut être compacté ou perdu : l'avancement et `bootstrap.json`, qui vit dans le scratchpad de la session, disparaissent. Les actions globales à la machine (`npm install -g`, marketplace et plugin, `git config --global`, installation de `gh`, `archgate login`) ne laissent aucune trace ni moyen de les annuler. Les sorties des outils (`openspec status --json`, `archgate session-context`, `doctor --json`) décrivent un outil, pas l'avancement du bootstrap.

## Decision

1. Un script du plugin, `scripts/state.mjs`, tient un **état de reprise** et un **journal des effets globaux** dans `.bootstrap/local/` du dépôt cible (`state.json`, `effects.json`, versionnés par un numéro de format).
2. Ce dossier **s'ignore seul** (son `.gitignore` vaut `*`) : ces fichiers sont propres à la machine et ne partent jamais dans un commit, même avant la génération des fichiers du projet. Le manifeste (`.bootstrap/manifest.json`) reste versionné.
3. L'état n'enregistre que les clés du schéma de `bootstrap.json` (jamais de jeton) et les statuts des étapes. La reprise ne s'y fie pas aveuglément : une étape faite dont la **preuve vérifiable** manque est à refaire, et sans état l'avancement est déduit de ces preuves.
4. Le journal consigne, **avant l'action**, la commande, la valeur précédente et l'annulation (chaîne et tableau d'arguments). Le plugin **ne lance jamais** l'action ni son annulation : il les propose, l'utilisateur garde la main.
5. Une annulation qui retirerait un élément déjà présent avant l'action (plugin, marketplace, CLI installée ailleurs) n'est pas proposée sans mise en garde.
6. Le format versionné est un contrat entre versions du plugin : un état d'une version inconnue est refusé, pas converti.

## Do's and Don'ts

### Do

- Appeler `resume` au début de toute session de bootstrap, `step --status doing` avant chaque étape et `effect` avant chaque action globale.
- Lire l'état courant avant une action pour calculer l'annulation.

### Don't

- Ne pas exécuter une annulation à la place de l'utilisateur.
- Ne pas enregistrer de jeton ni de clé hors schéma.
- Ne pas écrire l'état hors de `.bootstrap/local/`.

## Consequences

### Positive

- Une session interrompue reprend à la bonne étape, avec sa configuration, même après perte de contexte.
- Les effets globaux sont traçables et annulables sur décision de l'utilisateur.

### Negative

- Un fichier d'état de plus à maintenir et un format à faire évoluer avec prudence.
- Le journal ne couvre que ce que le skill déclare ; l'audit ne le recoupe pas.

### Risks

- Une étape non vérifiable marquée faite à tort est crue par la reprise ; l'audit de la phase 3 reste le contrôle final.
- Des preuves antérieures au bootstrap (un `.git` ou un manifeste existants) faussent la déduction sans état.

## Compliance and Enforcement

`tests/state.test.mjs` (arrêt simulé après chaque étape, preuves réelles, journal, liste blanche, état intact après `scaffold.mjs`) et la présence des appels dans `SKILL.md`. Pas de règle Archgate : le sujet est un script du plugin.

## References

- Issue #47 ; changement OpenSpec `47-resume-and-effects-journal`
- ARCH-006 (mise à jour des fichiers générés), ARCH-007 (installation des CLI)
