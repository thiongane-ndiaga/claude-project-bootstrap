---
id: ARCH-015
title: Le plugin n'écrit pas de réglage payant ou expérimental de l'utilisateur
domain: architecture
rules: false
files: ["skills/project-bootstrap/**"]
---

# Le plugin n'écrit pas de réglage payant ou expérimental de l'utilisateur

## Statut

Accepté.

## Context

Claude Code expose des réglages qui coûtent de l'argent, activent une fonction expérimentale ou désactivent un service, et qui sont propres à chaque utilisateur : l'advisor (`advisorModel`), le drapeau des agent teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`), les variables qui coupent la télémétrie ou la récupération des feature flags (`DISABLE_TELEMETRY`, `DO_NOT_TRACK`, `DISABLE_GROWTHBOOK`, `CLAUDE_CODE_DISABLE_*`), la redirection de l'API (`ANTHROPIC_BASE_URL`) ou le modèle des sous-agents (`CLAUDE_CODE_SUBAGENT_MODEL`). Beaucoup sont acceptés dans n'importe quel fichier de réglages, `.claude/settings.json` du projet compris, que tous les contributeurs partagent. Un projet généré qui les écrirait imposerait un coût ou un comportement à tous, sans leur accord.

## Decision

1. **Réglage visé** : tout réglage ou variable d'environnement de Claude Code qui (a) augmente la dépense, (b) active une fonction expérimentale ou (c) désactive ou redirige un service, et qui relève de l'utilisateur plutôt que du projet.
2. **Le plugin n'écrit jamais un tel réglage** dans un fichier partagé d'un projet généré (`.claude/settings.json`, `docs/`, CI, modèles). Il le **documente** comme étape optionnelle du « Nouveau poste » de `docs/workflow.md` et dans `pitfalls.md` ; c'est l'utilisateur qui l'applique.
3. **Exception encadrée** : un drapeau expérimental dont une fonction du module dépend (agent teams) s'écrit dans `.claude/settings.local.json`, fichier non versionné, par le skill et après l'accord explicite de l'utilisateur. `scaffold.mjs` ne génère jamais `settings.local.json`.
4. **Le plugin ne définit jamais** les variables qui coupent des fonctions (`DISABLE_TELEMETRY` et semblables) : il avertit seulement de leur effet.
5. **Hors périmètre du principe** : les champs d'une définition d'agent versionnée dans le projet (`model`, `effort`, `maxTurns`, `tools`) et la clé `agent` de `mainAgent`. Ce sont des choix de conception du projet, visibles en revue, à l'activation explicite (ARCH-013) ou documentés avec leur coût ; l'utilisateur peut les surcharger.
6. **Vérification** : un test génère un projet avec tous les modules et refuse tout fichier qui définit un de ces réglages.

## Do's and Don'ts

### Do

- Documenter un réglage payant ou expérimental par une étape optionnelle du « Nouveau poste », avec son coût et ses conditions.
- Demander l'accord de l'utilisateur avant d'écrire un drapeau dans `settings.local.json`.

### Don't

- Ne pas écrire `advisorModel`, `ANTHROPIC_BASE_URL`, `CLAUDE_CODE_SUBAGENT_MODEL` ni une variable `DISABLE_*` dans `.claude/settings.json` ou un modèle.
- Ne pas faire de `settings.local.json` un fichier généré par `scaffold.mjs`.

## Consequences

### Positive

- Un contributeur n'hérite d'aucun coût ni d'aucun comportement expérimental en clonant le dépôt.
- Les fonctions payantes restent un choix individuel, documenté et réversible.

### Negative

- Chaque utilisateur applique l'étape lui-même sur son poste.
- Le test ne couvre que les réglages connus de sa liste.

### Risks

- Un nouveau réglage de ce type ajouté par Claude Code n'est protégé qu'une fois ajouté au test et à la liste.
- Les champs `model` et `effort` des définitions d'agents engagent aussi une dépense. Les valeurs de départ sont opus et high pour `architect`, `qa-engineer`, `spec-reviewer` et `architecture-explorer` (les plus coûteux), sonnet et high pour `developer` et `business-analyst`, sonnet et medium pour `product-owner`, `arc42-keeper` et `traceability-checker` ; `maxTurns` borne chaque agent. Elles sont fixes, documentées dans `pitfalls.md`, et l'utilisateur les surcharge dans le frontmatter ou par `CLAUDE_CODE_EFFORT_LEVEL` et `CLAUDE_CODE_SUBAGENT_MODEL`.

## Compliance and Enforcement

Test de génération avec tous les modules (`tests/scaffold.test.mjs`, bloc advisor) qui parcourt les fichiers générés. Pas de règle Archgate : le sujet est du contenu de modèles.

## References

- Issue #126 ; changement OpenSpec `126-advisor-activation`
- Issue #36 (module advisor), module `agent-teams`
- ARCH-013 (activation explicite de `mainAgent`)
