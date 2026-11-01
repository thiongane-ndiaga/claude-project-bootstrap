Issue: #36
ADR: aucun

## Why

L'advisor de Claude Code est un second modèle que Claude consulte aux points de décision. Dans le workflow à profils, `project-lead` arbitre, et son niveau 3 (désaccord sans règle applicable) gagne à passer par un avis. Cette fonction est expérimentale, payante et réglée par l'utilisateur : elle doit être une option, jamais une imposition du plugin.

## What Changes

- Nouveau module optionnel `advisor` (`requires: ["agent-profiles"]`, `default: false`) sans fichier propre ni question de phase 0 : choisir le module vaut oui, et sa description porte les avertissements.
- `project-lead` gagne, sous `@@module:advisor`, une section Advisor : trois moments de consultation (avant de figer un plan, au deuxième échec identique, avant de conclure), l'arbitrage du niveau 3 après avis, la limite d'indépendance et le repli quand l'advisor est indisponible.
- `docs/workflow.md` gagne l'étape optionnelle « Advisor » du « Nouveau poste » : `/advisor <modèle>`, contraintes de modèle et de plateforme, coût, et l'avertissement `DISABLE_TELEMETRY`.
- Le plugin n'écrit aucun réglage (`advisorModel`) et ne définit jamais `DISABLE_TELEMETRY`.
- `pitfalls.md` consigne les constats vérifiés dans la documentation du 2026-11-01.
- Correction de l'issue : « Claude Code ≥ 2.1.260 » est la version de `/advisor` hors terminal, pas une version minimale ; aucune version n'est écrite dans les fichiers générés.

## Capabilities

### New Capabilities

- `advisor-module` : module optionnel advisor et son contenu généré.

### Modified Capabilities

(aucune)

## Impact

- `assets/modules/advisor/module.json`, modèles `project-lead.md` et `docs/workflow.md` (français et anglais), `pitfalls.md`, `agent-profiles-prototype.md`, arc42 (5, 11).
- Instantanés `full`, `full-en`, `full-public` (project-lead et workflow) et nouvelle combinaison `advisor` ; les autres inchangés.
- Hors périmètre : usage de l'advisor par un teammate (non documenté, suivi dans #114), réglage de l'advisor par le plugin.
