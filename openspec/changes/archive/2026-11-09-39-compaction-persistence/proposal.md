Issue: #39
ADR: ARCH-013 (amendé : échelle d'arbitrage doublée dans le `CLAUDE.md` racine), ARCH-010 (amendé : hooks de `settings.json` par module)

## Why

Après une compaction, les règles à `paths:` et les `CLAUDE.md` de sous-dossier sont perdus jusqu'à ce qu'un fichier correspondant soit relu ; le corps d'un skill est tronqué à 5 000 jetons (début conservé) ; le `CLAUDE.md` racine est relu depuis le disque (documentation lue le 2026-11-09). Rien ne garantit que le corps de l'agent principal personnalisé survive : ARCH-013 compte à tort sur `project-lead.md` seul, l'échelle d'arbitrage doit aussi figurer dans le `CLAUDE.md` racine.

## What Changes

- Avec `agent-profiles`, le `CLAUDE.md` généré contient l'échelle d'arbitrage (mêmes lignes que `project-lead`, avec une phrase disant que « toi » désigne l'agent principal) et renvoie à `profile-guard.mjs` et à `docs/workflow.md` pour les droits d'écriture.
- Nouveau module optionnel `compact-recall` (`requires: claude`, `default: false`, sans clé de configuration) : hook `SessionStart` à matcher `compact` qui écrit sur la sortie standard un rappel lu sur le disque (branche, changements OpenSpec en cours avec leurs tâches faites), sans dépendre d'aucune CLI sauf git.
- Tests : aucune règle à `paths:` ni `CLAUDE.md` de sous-dossier dans les fichiers générés par le plugin ; échelle de `CLAUDE.md` égale à celle de `project-lead` ; exécution du hook ; position des étapes critiques du `SKILL.md`.
- Specs amendées : `agent-profiles` (garde-fous de `project-lead`), `cli-install-modes` (hook de session : seul `session-path.mjs` est visé).
- `pitfalls.md` consigne ce qui survit à la compaction et ce qui reste non vérifié.

## Capabilities

### New Capabilities

- `compaction-persistence` : règles critiques hors des règles à `paths:`, rappel optionnel après compaction.

### Modified Capabilities

- `agent-profiles` : garde-fous de `project-lead` (l'échelle ne dépend plus du seul prompt de l'agent).
- `cli-install-modes` : le hook de session du mode local est le seul `session-path.mjs`, d'autres `SessionStart` peuvent coexister.

## Impact

- Modèles `core` (`CLAUDE.md`), nouveau module `compact-recall` (modèles français et anglais, test du module), `scaffold.mjs` (`buildSettings`), tests, instantanés, `SKILL.md`, `pitfalls.md`, ARCH-013, ARCH-010, arc42 (section 8).
- Hors périmètre : la vérification sur une compaction réelle et le comportement de `SessionStart` pour un teammate (#114), l'issue #39 reste donc ouverte (`Refs #39`) ; les CLI `openspec status --json` et `archgate session-context` : le hook ne reçoit pas le `PATH` des CLI locales (mode `local`) et elles peuvent être absentes (mode global sans CLI), il lit donc le disque.
