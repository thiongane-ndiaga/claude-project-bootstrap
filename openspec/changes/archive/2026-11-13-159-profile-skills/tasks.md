## 1. ADR

- [x] 1.1 ARCH-012 : décision 4 reformulée pour citer `archgate:planner` avec `archgate:reviewer` ; nouvelle décision sur les skills de `developer` et `architect` ; ligne `developer` ajoutée au tableau des droits et `archgate:cli-reference` à celle d'`architect`

## 2. Hook et profils

- [x] 2.1 `profile-guard.mjs` (français et anglais) : `developer.skills` = `openspec-apply-change`, `opsx:apply` ; `architect.skills` + `archgate:cli-reference`
- [x] 2.2 `developer.md` (français et anglais) : `Skill` dans `tools`, lance le skill d'apply sur le changement du brief ; la règle « Tu ne lances aucun agent ni skill » devient « aucun agent ni autre skill que celui d'apply »
- [x] 2.3 `architect.md` : cite `archgate:cli-reference` pour écrire les règles, seulement avec `archgate-plugin`
- [x] 2.4 `project-lead.md` : le brief d'apply dit que `developer` lance le skill

## 3. Tests et documentation

- [x] 3.1 `agent-profiles/tests/profile-guard.test.mjs` : `developer` permis pour les deux noms (code 0), refusé pour `archgate:reviewer`, `archgate:adr-author`, `opsx:archive`, `opsx:sync`, `opsx:propose` (code 2), et refusé pour un skill à `context: fork` ; `architect` permis pour `archgate:cli-reference` ; le libellé de la ligne 127 (« ni agent ni skill ») est corrigé
- [x] 3.2 `tests/scaffold.test.mjs` (ligne « developer : outils d'écriture et Bash, sans Skill ») : `developer` a `Skill` sans `Agent` ; textes de `developer.md` et d'`architect.md` ; `tests/matrix.test.mjs` : instantanés des projets avec `agent-profiles` relus, seuls les profils `developer`, `architect`, `project-lead` et le hook changent
- [x] 3.3 `skills/project-bootstrap/references/pitfalls.md` : la table « Qui fait quoi » suit `PROFILES`
- [x] 3.4 arc42 : section 8 (puces « Shell de `developer` non borné » et « Skills à contexte isolé ») et section 5 (profils d'`agent-profiles`)
- [x] 3.5 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `archgate check` et `openspec validate --all --strict` verts
