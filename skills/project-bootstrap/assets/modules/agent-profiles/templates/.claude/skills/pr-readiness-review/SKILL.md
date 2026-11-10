---
name: pr-readiness-review
description: Vérifier avant d'ouvrir ou de fusionner une PR que la chaîne issue, changement, branche, PR et ADR est complète, que le modèle de PR est rempli et que la CI est verte. Lecture seule : rend un tableau maillon, statut, correction. Lancée par `qa-engineer`.
---

# Contrôle de la PR avant le merge

Contrôle décrit dans `docs/workflow.md`. Tu ne modifies rien et tu n'utilises aucune commande `gh` qui écrit.

- Branche courante (`git branch --show-current`) au format `<type>/<issue>-<slug>`.
@@module:dependabot
- Exception : une branche `dependabot/…` (titre `ci(deps): …`) n'a ni issue ni `Closes #N`.
@@end
@@module:openspec
- Changement OpenSpec `openspec/changes/<issue>-<slug>/` (ou archivé sous `openspec/changes/archive/`) dont `proposal.md` commence par `Issue: #<issue>` et `ADR: …`.
@@end
@@module:archgate
- Chaque ADR cité existe (`archgate adr show <id>`).
@@end
- Commits au format Conventional Commits (`git log main..HEAD --oneline`).
- PR éventuelle (`gh pr view` et `gh pr checks`) : titre Conventional Commits, `Closes #<issue>` dans le corps, checklist du modèle remplie, checks verts.
- Le contrôle qualité passe (mêmes commandes que `.claude/hooks/quality-gate.mjs`).
@@module:arc42
- Si le changement touche l'architecture : sections arc42 impactées citées dans la PR.
@@end
- Rends un tableau maillon / statut (OK, manquant, incohérent) / correction proposée.
