---
name: spec-review
description: Relire un changement OpenSpec (proposal, specs, design, tasks) face à son issue, aux ADR et aux specs en vigueur, avant /opsx:apply. Lecture seule : rend des constats classés. Lancée par `qa-engineer`.
---

# Revue de spec

À lancer avant `/opsx:apply`, sur `openspec/changes/<id>/`. Tu ne modifies pas le changement.

@@module:github
@@module:issue-source
- Lis l'issue liée (`Issue: #N` en tête de `proposal.md`) avec `gh issue view N`.
@@end
@@module:jira-source
- Lis le ticket lié (`Ticket: <CLE-N>` en tête de `proposal.md`) : `gh` ne lit pas Jira, demande son texte à l'utilisateur ou lis ce qu'en recopie `proposal.md`.
@@end
@@end
@@module:gitlab
@@module:issue-source
- Lis l'issue liée (`Issue: #N` en tête de `proposal.md`) dans GitLab (l'interface, ou `glab issue view N`, non pré-approuvé).
@@end
@@module:jira-source
- Lis le ticket lié (`Ticket: <CLE-N>` en tête de `proposal.md`) : `gh` ne lit pas Jira, demande son texte à l'utilisateur ou lis ce qu'en recopie `proposal.md`.
@@end
@@end
@@module:archgate
- Lis les ADR cités et ceux dont le sujet recoupe le changement (`archgate adr list`).
@@end
- Cherche : exigences de l'issue non couvertes, scénarios manquants (cas d'erreur, limites), contradictions avec un ADR ou avec `openspec/specs/`, décision transverse qui mériterait un ADR, hors-périmètre absent, tâches non vérifiables, choix de stack implicite non couvert par un ADR accepté.
- Rends des constats classés (bloquant / à corriger / suggestion), chacun avec le fichier concerné et une proposition.
