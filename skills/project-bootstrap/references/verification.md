# Vérification de bout en bout

Sans code applicatif. Coche ce qui s'applique aux modules choisis et rapporte : réussi, échoué, contournement.

1. **Issue** (github) : issue de test avec la structure d'un formulaire (`gh issue create --label type:feature --body-file …`). Avec projects : elle apparaît en *Todo*.
2. **Branche** `feat/<N>-tooling-smoke-test`.
3. **OpenSpec** (openspec) : `/opsx:propose` d'un changement de documentation `<N>-…` (`proposal.md` commence par `Issue: #N`), revue par le subagent `spec-reviewer` invoqué explicitement, `/opsx:apply`, puis `openspec archive <id> --yes` dans la branche → spec créée sous `openspec/specs/`.
4. **Archgate** (archgate) : `archgate check` passe ; injecte une violation (ex. retirer le `# 12. ` de la section 12 d'arc42, ou passer un `uses:` sur un tag) → code 1 et **push refusé par le pre-push** ; restaure → passe. Vérifie chaque règle livrée de la même façon (avec `rules: false`, les règles d'un ADR ne sont pas chargées : tester la règle `adr-format` séparément).
5. **PR** (github) : titre volontairement non conforme → job `pr-title` rouge ; titre corrigé → vert. Corps avec `Closes #N`.
6. **Merge** en squash → issue fermée ; avec projects, issue et PR en *Done*.
7. **Release** (release) : PR « chore(main): release 0.0.1 » (approuver son run CI si besoin), merge → tag `v0.0.1` et GitHub Release avec changelog. Proposer de la garder ou de la supprimer.
8. **Agents** (claude, après redémarrage) : un subagent du projet invoqué explicitement ; si le hook lecture seule bloque `cat` ou une commande composée, c'est le comportement attendu.
9. **Agent teams** (agent-teams) : deux teammates (`traceability-checker`, `spec-reviewer`) en lecture seule sur la PR de test, qui échangent un message ; constater que les hooks de frontmatter ne les bloquent pas (limite connue). Arrêt par `shutdown_request`.
10. **Autre OS** : sur le second système, procédure « Nouveau poste » de `docs/workflow.md`, puis `node .claude/hooks/quality-gate.mjs`.
