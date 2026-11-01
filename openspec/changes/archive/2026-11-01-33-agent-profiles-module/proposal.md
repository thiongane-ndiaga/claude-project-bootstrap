Issue: #33
ADR: ARCH-011

## Why

Le workflow généré ne définit que des agents découpés par tâche. Aucune étape de revue de code ni de tests n'a de responsable, et rien ne borne ce qu'un rôle écrit ou exécute. Le prototype #32 a établi les moyens d'un cadrage sûr, en sous-agent comme en équipe (issue #33, épique #31).

## What Changes

- Nouveau module optionnel `agent-profiles` (`requires: ["claude"]`, `default: false`) qui génère deux profils dans `.claude/agents/` : `architect` et `qa-engineer`.
- Un hook unique `.claude/hooks/profile-guard.mjs`, déclaré dans `.claude/settings.json`, borne les écritures et les commandes de shell de chaque profil selon `agent_type`, pour les sous-agents et les teammates.
- Les quatre agents existants restent inchangés et servent d'outils aux profils.
- Les pièges correspondants sont consignés dans `pitfalls.md`.

## Capabilities

### New Capabilities

- `agent-profiles` : profils d'agents générés et hook de bornage par profil.

### Modified Capabilities

(aucune)

## Impact

- Nouveau dossier `assets/modules/agent-profiles/` (modèles français et anglais, tests du module) ; `buildSettings` dans `scaffold.mjs`.
- Nouvelle combinaison et nouvel instantané dans la matrice ; les instantanés `full`, `full-en` et `full-public` changent ; les autres restent identiques.
- Hors périmètre : choix de l'agent principal (#35), profils optionnels (#34), absorption des agents existants (#110), `model` et `effort` (#37), questions de phase 0 (#42).
