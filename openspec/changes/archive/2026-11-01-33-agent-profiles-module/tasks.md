## 1. Module et hook

- [x] 1.1 Créer `assets/modules/agent-profiles/module.json` et les modèles `profile-guard.mjs` (fr et en)
- [x] 1.2 Écrire `architect.md` et `qa-engineer.md` (fr et en), blocs conditionnels Archgate, OpenSpec, GitHub, arc42
- [x] 1.3 Déclarer le hook dans `buildSettings` (`scaffold.mjs`)

## 2. Tests

- [x] 2.1 Tests du module : table, refus, motifs ancrés, injections par le titre (guillemets typographiques, parenthèses, accent grave, saut de ligne, options), PowerShell, chemins (absolu, `..`, voisin, casse, hors projet), refus en cas d'erreur interne, sous-agent et teammate, agent non borné
- [x] 2.2 `scaffold.test.mjs` : génération, outils des profils (sans `Agent` ni `Skill`, sans `hooks`), déclaration de `settings.json`, absence sans le module, références conditionnelles, règle « qui écrit ne relit pas », anglais, fusion avec un hook existant
- [x] 2.3 Régénérer les instantanés (nouvelle combinaison, `full*` modifiés) et vérifier que les autres sont inchangés

## 3. Documentation

- [x] 3.1 `pitfalls.md` : teammate nommé autrement, `Bash` en équipe, profil intégré `Explore`, écrire puis exécuter, worktree, coût du hook
- [x] 3.2 arc42 (blocs de construction, concepts, risques) via `arc42-keeper`
- [x] 3.3 Essai réel (Claude Code 2.1.316) : sous-agent `qa-engineer` avec le hook généré, écriture hors périmètre refusée, `git status` permis ; teammate : `agent_type` établi dans #32 (`references/agent-profiles-prototype.md`)

## 4. Validation

- [x] 4.1 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `openspec validate --all --strict`
