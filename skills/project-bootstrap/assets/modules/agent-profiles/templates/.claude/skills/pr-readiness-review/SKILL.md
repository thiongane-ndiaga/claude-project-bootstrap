---
name: pr-readiness-review
description: Vérifier avant d'ouvrir ou de fusionner une PR que la chaîne issue, changement, branche, PR et ADR est complète, que le modèle de PR est rempli et que la CI est verte. Lecture seule : rend un tableau maillon, statut, correction. Lancée par `qa-engineer`.
---

# Contrôle de la PR avant le merge

Contrôle décrit dans `docs/workflow.md`. Tu ne modifies rien et tu n'utilises aucune commande `gh` qui écrit.

@@module:issue-source
- Branche courante (`git branch --show-current`) au format `<type>/<issue>-<slug>`.
@@end
@@module:jira-source
- Branche courante (`git branch --show-current`) au format `<type>/<CLE-N>-<slug>`.
@@end
@@module:dependabot
@@module:issue-source
- Exception : une branche `dependabot/…` (titre `ci(deps): …`) n'a ni issue ni `Closes #N`.
@@end
@@module:jira-source
- Exception : une branche `dependabot/…` (titre `ci(deps): …`) n'a ni issue ni `Refs <CLE-N>`.
@@end
@@end
@@module:openspec
@@module:issue-source
- Changement OpenSpec `openspec/changes/<issue>-<slug>/` (ou archivé sous `openspec/changes/archive/`) dont `proposal.md` commence par `Issue: #<issue>` et `ADR: …`.
@@end
@@module:jira-source
- Changement OpenSpec `openspec/changes/<cle-n>-<slug>/` (ou archivé sous `openspec/changes/archive/`) dont `proposal.md` commence par `Ticket: <CLE-N>` et `ADR: …`.
@@end
@@end
@@module:archgate
- Chaque ADR cité existe (`archgate adr show <id>`).
@@end
- Commits au format Conventional Commits (`git log main..HEAD --oneline`).
@@module:issue-source
- PR éventuelle (`gh pr view` et `gh pr checks`) : titre Conventional Commits, `Closes #<issue>` dans le corps, checklist du modèle remplie, checks verts.
@@end
@@module:jira-source
- PR éventuelle (`gh pr view` et `gh pr checks`) : titre Conventional Commits, `Refs <CLE-N>` dans le corps, checklist du modèle remplie, checks verts.
@@end
- Le contrôle qualité passe (mêmes commandes que `.claude/hooks/quality-gate.mjs`).
@@module:arc42
- Si le changement touche l'architecture : sections arc42 impactées citées dans la PR.
@@end
- Rends un tableau maillon / statut (OK, manquant, incohérent) / correction proposée.
