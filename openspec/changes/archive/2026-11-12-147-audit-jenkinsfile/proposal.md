Issue: #147
ADR: aucun (ARCH-007 inchangé ; l'audit lit un fichier de plus et reconnaît un préfixe de contexte)

## Why

Avec le module `jenkins` (#24), l'audit du projet généré ne connaît pas le `Jenkinsfile`. Le contrôle `forge-protection` signale comme introuvable le contexte de statut Jenkins ajouté aux contrôles requis de `main` (étape manuelle de `docs/jenkins.md`), et une version d'OpenSpec ou d'Archgate modifiée à la main dans le `Jenkinsfile` n'est pas détectée par `checkVersions`.

## What Changes

- `forge-protection` : avec le module `jenkins` actif, un contexte exigé qui commence par `continuous-integration/jenkins/` n'est ni un écart ni `non-verifiable` ; il est cité comme non comparable aux jobs des workflows. Sans le module, il reste un écart.
- `checkVersions` : avec le module `jenkins` actif et hors mode `local`, la version lue dans le `Jenkinsfile` (`<paquet>@<version>`) est une source de plus, comparée à `ci.yml`, au manifeste et au poste ; la correction ajoute l'alignement du `Jenkinsfile`.
- `docs/jenkins.md` (français et anglais), `pitfalls.md` et arc42 (sections 8 et 11) ne présentent plus ces deux points comme des limites.
- Tests dans `tests/scaffold.test.mjs`.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `project-audit` : exigence ajoutée pour le module `jenkins`.
- `jenkins-module` : exigence « Limites documentées » mise à jour.

## Impact

`skills/project-bootstrap/scripts/audit.mjs`, modèles `docs/jenkins.md` (`templates` et `templates.en`), `references/pitfalls.md`, arc42 sections 8 et 11, `tests/scaffold.test.mjs`. Aucun changement de fichier généré hors `docs/jenkins.md`.
