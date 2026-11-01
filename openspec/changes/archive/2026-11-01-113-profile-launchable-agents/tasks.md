## 1. Hook et profils

- [x] 1.1 `profile-guard.mjs` (fr et en) : listes `agents` et `skills` dans `PROFILES`, gestion des outils `Agent`, `Task` et `Skill`, défaut fermé, refus d'un agent nommé, bornes propres des agents lançables
- [x] 1.2 `buildSettings` : matcher étendu à `Agent`, `Task` et `Skill`
- [x] 1.3 `architect.md` et `qa-engineer.md` (fr et en) : outils `Agent` (et `Skill`), consignes de lancement direct

## 2. Tests

- [x] 2.1 Tests du module : agents permis, non permis, sans `subagent_type`, nommé, `team_name`, plugin, casse, `Task`, skills permis et non permis, liste absente, bornes propres des agents lançables
- [x] 2.2 `scaffold.test.mjs` : outils des profils, matcher du hook, table identique en français et en anglais
- [x] 2.3 Régénérer les instantanés (`agent-profiles`, `full*`) et vérifier que les autres sont inchangés
- [x] 2.4 Essai réel `claude -p` (2.1.316) : `architect` lance `arc42-keeper`, `general-purpose` et `spec-reviewer` sont refusés avec le message du hook ; consigné dans `agent-profiles-prototype.md`

## 3. Documentation

- [x] 3.1 ARCH-012 (tableau des droits par profil), ARCH-011 renvoyant à ARCH-012, `pitfalls.md`, `agent-profiles-prototype.md`
- [x] 3.2 arc42 (8 et 11) via `arc42-keeper`
- [x] 3.3 Issue de suivi : essai en session d'équipe du hook sur l'outil `Agent` d'un teammate

## 4. Validation

- [x] 4.1 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `openspec validate --all --strict`
