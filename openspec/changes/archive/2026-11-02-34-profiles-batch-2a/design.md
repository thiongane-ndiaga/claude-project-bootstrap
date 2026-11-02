## Contexte

Le lot 1 a établi le mécanisme : `OPTIONAL_PROFILES` (catalogue), pseudo-modules `profile-<nom>`, fichiers `when` du `module.json`, table `PROFILES` du hook, question de phase 0. Le lot 2a l'applique à trois profils de lecture seule.

## Décisions

- **D1. Pas de conception nouvelle.** Aucune clé, aucun ADR : ARCH-014 prévoit l'ajout de profils par la liste `profiles`.
- **D2. Droits.** Entrées `{ write: [], shell: [], agents: [], skills: [] }` comme `product-owner` : `shell: []` délègue à `read-only-bash.mjs` : seules les lectures (`openspec validate|show|list|status`, `archgate check|adr list|adr show`, `git status|diff|log|show`, `gh … view|list|checks`) passent. `second-opinion` n'a pas `Bash` dans sa liste `tools`, mais son entrée est utile : un agent de ce nom lancé avec un autre type (teammate sur `general-purpose`) est ramené à la lecture seule. Un `agent_type` absent de la table n'est pas borné.
- **D3. Outils.** `acceptance-tester` et `scout` : `Read, Glob, Grep, Bash`. `second-opinion` : `Read, Glob, Grep, WebSearch, WebFetch`.
- **D4. Advisor.** La règle de #126 (consigne dans tout profil de modèle sonnet ou haiku) s'applique à `acceptance-tester` et `scout` : leurs modèles portent le bloc `advisor-on`. `second-opinion` (opus) n'en a pas. Le test de cohérence existant le vérifie sans changement.
- **D5. Neutralité de `second-opinion`.** Le sous-agent ne reçoit que le texte de son brief. La neutralité dépend de la rédaction du brief par le chef de projet ; le profil rappelle le format (question, options, preuves) et demande d'écarter et de signaler toute préférence. Aucun mécanisme ne garantit la neutralité du brief.
- **D6. `acceptance-tester` sans lire le code.** Consigne seulement : `Read` reste disponible. Ses preuves sont l'issue, les specs, `gh pr checks`, `gh run view`, `openspec validate` et le rapport de tests de `qa-engineer` joint au brief ; il ne lance ni lanceur de tests ni contrôle qualité, que le hook refuse. Sans `github` ou `openspec`, les références sont omises et les critères viennent du brief.
- **D7. `project-lead`.** Ligne de délégation et section Parcours : `scout` pour l'exploration factuelle, `acceptance-tester` pour la recette après `qa-engineer`, `second-opinion` aux niveaux 3 et 4 de l'échelle, chacun conditionné à la présence du fichier dans `.claude/agents/`, brief neutre pour `second-opinion`, lancé en sous-agent (en équipe, les messages d'un teammate peuvent transmettre la préférence).
- **D8. Textes amendés sans nouvelle décision** : ARCH-014 (liste des noms), ARCH-015 (valeurs de départ avec haiku et le nouveau profil opus), `SKILL.md`, `bootstrap-config.md`, `pitfalls.md` (le nom `scout` est générique : une entrée de table s'applique même sans la clé `profiles` ; différence avec `Explore` ; `WebSearch` et `WebFetch` de `second-opinion` hors du hook ; `effort` sur haiku non vérifié).
- **D9. Avertissement advisor.** La clé `advisor` sans profil sonnet ou haiku choisi (dont `second-opinion` seul) avertit.
- **D10. Qui écrit ne relit pas.** Les trois profils n'écrivent rien : leur modèle porte la règle sous la forme « tu contestes ce qu'ont écrit d'autres, jamais ta propre production ».

## Risques

- Un `acceptance-tester` qui lit le code contourne l'indépendance voulue ; limite documentée dans `pitfalls.md`.
- Un brief de contre-avis non neutre fausse l'avis ; la consigne de `project-lead` et celle du profil le rappellent.
- `scout` sur haiku : résumés moins fiables sur un gros dépôt ; il cite ses preuves pour que le chef de projet vérifie.
