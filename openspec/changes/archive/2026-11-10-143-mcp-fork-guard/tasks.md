## 1. Génération et hook

- [x] 1.1 `scaffold.mjs` : seconde entrée `PreToolUse` au matcher `mcp__.*` ; `tests/scaffold.test.mjs` adapté (deux entrées, première identique, `--update` d'un `settings.json` à une entrée)
- [x] 1.2 `profile-guard.mjs` (français et anglais) : `WRITE_WORDS`, classement MCP, `mcpAllow`, message de refus, nom de skill normalisé et validé, `forkedSkill` (candidats, en-tête tolérant, défaut fermé), commentaires de tête
- [x] 1.3 `profile-guard.test.mjs` : configuration utilisateur factice (`CLAUDE_CONFIG_DIR`, `HOME`, `USERPROFILE`) ; outils MCP de lecture, d'écriture, trompeurs, mal formés, `mcpAllow` propre à l'entrée, agent hors table ; skills isolés de projet et de plugin (`installed_plugins.json` et repli sur le cache), commandes, en-têtes (guillemets, commentaire, CRLF, BOM), profil à liste, noms piégés, introuvable, fichier illisible

## 2. Textes générés et documentation

- [x] 2.1 `project-lead.md` (français et anglais) : outils MCP limités à la lecture ; `workflow.md` (français et anglais) : ligne sur les outils MCP ; `SKILL.md` : annonce de phase 1
- [x] 2.2 ADR amendés : ARCH-011 (entrée de hook, outils MCP), ARCH-012 (skills isolés pour tous, Do et Risks), ARCH-013 (limites levées) ; `pitfalls.md` (lignes sur `project-lead`, MCP, faux négatifs connus `getDiagnostics`, `take_screenshot`, `guide`, `query`, coût d'un processus par appel) et `agent-profiles-prototype.md` ; arc42 sections 8 et 11 (`arc42-keeper`)
- [x] 2.3 Instantanés régénérés et relus

## 3. Essai en session réelle

- [x] 3.1 `claude -p` dans un dépôt d'essai généré : `mcp__plugin_github_github__issue_write` refusé pour `project-lead` (message complet), skill de projet `context: fork` refusé, `/forky`, un skill de plugin isolé si disponible, un skill ordinaire permis ; mesurer si une seconde entrée `mcp__.*` déclenche aussi le hook sur `TodoWrite` ou `Task*` ; constats dans la table H du prototype et `pitfalls.md`
- [x] 3.2 Constat des agents d'un skill `context: fork` avec `agent: developer` ou `agent: Explore` (`agent_type` porté), consigné

## 4. Suites de la revue de spec

- [x] 4.1 Constats B1, B2, C1 à C11 et S1 à S7 de `spec-reviewer` traités dans les artefacts ci-dessus (S1, S3 consignés dans le design)
