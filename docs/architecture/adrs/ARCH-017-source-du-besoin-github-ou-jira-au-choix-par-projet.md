---
id: ARCH-017
title: "Source du besoin : GitHub ou Jira, au choix par projet"
domain: architecture
rules: false
files: ["skills/project-bootstrap/assets/modules/jira/**", "skills/project-bootstrap/scripts/scaffold.mjs", "skills/project-bootstrap/scripts/catalog.mjs"]
---

# Source du besoin : GitHub ou Jira, au choix par projet

## Statut

Accepté.

## Context

Les conventions du workflow généré (branche `<type>/<issue>-<slug>`, id OpenSpec, en-tête `Issue: #N`, `Closes #N`) supposent que le besoin vit dans une issue GitHub. Des équipes le suivent dans Jira. Remplacer les issues partout toucherait une vingtaine de modèles et casserait les projets existants ; ne relier que la clé Jira ne couvre pas les équipes pour qui Jira est la source.

OpenSpec n'accepte que des id en minuscules (`^[a-z0-9]+(-[a-z0-9]+)*$`), alors que les clés Jira sont en majuscules.

## Decision

1. Le module optionnel `jira` (`requiresAny: github` ou `jenkins`, `default: false`) offre deux sources du besoin, choisies par projet avec la clé `jiraSource` : `github` (défaut) ou `jira`.
2. `github` : les issues restent la source, la clé Jira est un lien en plus (champ des formulaires, ligne du gabarit de PR).
3. `jira` : le ticket remplace l'issue. Branche `<type>/<CLE-N>-<slug>`, id OpenSpec en minuscules `<cle-n>-<slug>`, en-tête `Ticket: CLE-N`, corps de PR `Refs CLE-N` au lieu de `Closes #N`.
4. Dans les deux modes, `scripts/check-jira-key.mjs` exige la clé dans le titre de la PR ou le nom de la branche, par le job `pr-title` de `ci.yml` avec `github`, par l'étape `Clé Jira` du `Jenkinsfile` avec `gitlab`.
5. Les textes qui disent « issue » sans variante se lisent « ticket » d'après la table de `docs/jira.md` ; le plugin n'écrit rien dans Jira.

## Do's and Don'ts

### Do

- Poser les variantes par les pseudo-modules complémentaires `jira-source` et `issue-source`, ce dernier actif aussi sans le module.
- Passer le titre et la branche au contrôle par l'environnement, jamais dans une chaîne de shell.

### Don't

- Ne pas écrire une clé Jira en majuscules dans un id de changement OpenSpec.
- Ne pas modifier les fichiers générés d'un projet sans le module `jira`.

## Consequences

### Positive

- Les projets existants et ceux sans Jira ne changent pas.
- Chaque équipe choisit sa source sans fork des modèles.

### Negative

- En mode `jira`, une partie de la prose générée dit encore « issue » : la table de lecture la compense.
- Deux pseudo-modules et deux clés de configuration s'ajoutent à `scaffold.mjs`, ce qu'ARCH-010 reconnaît pour les clés de configuration.

### Risks

- Aucun essai réel avec une instance Jira.
- Sans clé de projet, le motif générique accepte des faux positifs (`UTF-8`, `SHA-256`).

## Compliance and Enforcement

Test du module (`assets/modules/jira/tests/jira.test.mjs`), combinaisons `jira` et `jira-source` de la matrice (instantanés). Pas de règle Archgate : le sujet est du contenu de modèles.

## References

- Issue #23 ; changement OpenSpec `23-jira-module`
- ARCH-005 (conventions de branches), ARCH-010 (modules auto-décrits)
