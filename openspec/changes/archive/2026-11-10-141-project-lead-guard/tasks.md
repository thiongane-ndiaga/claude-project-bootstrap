## 1. Hook

- [x] 1.1 `profile-guard.mjs` (français et anglais) : entrée `project-lead`, `namedAgents` (liste), `skillsOpen`, `shellHint`, entrées `shell` fonctionnelles, fonction `ghPilot`, commentaires de tête
- [x] 1.2 `profile-guard.test.mjs` : écritures refusées, shell d'écriture refusé avec message, pilotage permis et refusé (formes Bash et PowerShell, `--admin=true`, `-dw`, `--body`, `--repo`, `--body-file ../x`), agents nommés (avec et sans `team_name`, `second-opinion`), agents refusés (`Explore`, plugin), skills ouverts, agent principal sans type ; la substitution de `agents: [],` du test existant vise l'entrée `architect`

## 2. Textes générés

- [x] 2.1 `project-lead.md` et `qa-engineer.md` (français et anglais) : le hook borne `project-lead`, ni `/opsx:apply`, `/opsx:archive` ni `/opsx:sync`, corps longs par `--body-file` écrit par `developer`, `archgate:reviewer` retiré
- [x] 2.2 `workflow.md` et `CLAUDE.md` du module `core` (français et anglais) : archivage par `openspec archive <id> --yes` avec `agent-profiles`, ligne `project-lead`, règles doublées, ligne sur l'agent absent de la table, ligne sur les commandes `gh` d'écriture
- [x] 2.3 `SKILL.md` : annonce de `mainAgent` (shell borné, `/opsx:apply` et `/opsx:archive` refusés dans la session principale)

## 3. Tests et documentation

- [x] 3.1 `scaffold.test.mjs` : lignes sur `project-lead` absent de la table (1746), table sans agent lançable (1697) et `archgate:reviewer` (1744, 1750) adaptées ; instantanés régénérés et relus
- [x] 3.2 ADR amendés : ARCH-011 (options, shell fonctionnel, parenthèses entre guillemets), ARCH-012 (décisions 2 à 4, ligne `project-lead`), ARCH-013 (décision 1, règle et conséquence), ARCH-016 (décision 7) ; `pitfalls.md` (lignes sur `project-lead` et `Bash`, `context: fork`, MCP, `--body-file`) et `agent-profiles-prototype.md` ; arc42 sections 8 et 11 via `arc42-keeper`
- [x] 3.3 Essai en session réelle : `project-lead` agent principal refusé en shell d'écriture et sur `general-purpose`, teammate nommé permis ; constats consignés dans `pitfalls.md` et `agent-profiles-prototype.md`

## 4. Suites de la revue de spec

- [x] 4.1 Constats B1, B2, C1 à C12 et S1 à S7 de la revue de `spec-reviewer` traités dans les artefacts ci-dessus
