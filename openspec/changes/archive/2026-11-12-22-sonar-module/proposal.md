Issue: #22
ADR: ARCH-004 (amendé, plugin et modèle généré : job d'analyse optionnel conditionné par un secret), ARCH-006 et ARCH-010 (appliqués ; ARCH-010 reconnaît qu'une clé de configuration, un paramètre et des pseudo-modules s'ajoutent dans scaffold.mjs)

## Why

Des projets veulent une analyse de qualité de code SonarQube ou SonarCloud dans leur CI sans l'écrire à la main. Le socle ne choisit aucune stack : l'analyse doit rester inactive tant que le projet n'a ni code ni jeton, et ne jamais bloquer la CI avant le premier code.

## What Changes

- Nouveau module optionnel `sonar` (`requires: github`, `default: false`) : `sonar-project.properties` (propre au projet, jamais écrasé), `docs/sonar.md` (étapes manuelles, limites) et un job `sonar` dans `ci.yml`.
- Une question de phase 0 : SonarCloud ou serveur auto-hébergé, clé `sonar` de la configuration (`cloud` par défaut, `server`), consignée au manifeste seulement si présente.
- Le job utilise `SonarSource/sonarqube-scan-action`, épinglée sur un SHA (`actions.sonarScan`, résolue par `resolve-versions.mjs`, vérifiée par l'audit) ; il saute l'analyse tant que le secret `SONAR_TOKEN` n'existe pas (et sur les PR de fork). Pas de quality gate bloquante.
- La création du secret (et de la variable `SONAR_HOST_URL` en mode serveur) reste manuelle, listée dans le skill et dans `docs/sonar.md`.
- Tests de génération et de refus ; pièges documentés comme non observés faute d'essai réel.

## Capabilities

### New Capabilities

- `sonar-module` : module optionnel `sonar`, son job, son fichier de propriétés et sa documentation.

### Modified Capabilities

Aucune.

## Impact

`assets/modules/sonar/`, bloc `@@module:sonar` de `ci.yml`, `scaffold.mjs` (paramètre `SONAR_SCAN_REF`, pseudo-modules `sonar-cloud` et `sonar-server`, validation de `sonar`), `resolve-versions.mjs`, `audit.mjs` (clé d'action), `SKILL.md`, `bootstrap-config.md`, `pitfalls.md`, ARCH-004, arc42, tests et instantanés. Aucun changement pour les projets sans le module.
