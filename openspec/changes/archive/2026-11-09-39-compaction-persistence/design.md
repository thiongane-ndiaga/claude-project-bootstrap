## Contexte

Documentation lue le 2026-11-09 : après compaction, le `CLAUDE.md` racine et les règles sans `paths` sont réinjectés depuis le disque ; les règles à `paths:` et les `CLAUDE.md` de sous-dossier disparaissent jusqu'à relecture d'un fichier correspondant ; le corps d'un skill est réinjecté, 5 000 jetons par skill au plus, début conservé ; le matcher `compact` de `SessionStart` existe et la sortie standard d'un hook `SessionStart` est ajoutée au contexte. Non établi : la survie du corps de l'agent principal personnalisé, et l'exécution de `SessionStart` pour un teammate.

## Décisions

- **D1. Échelle dans le `CLAUDE.md` racine.** Le corps de `project-lead` n'est pas garanti : les cinq lignes de l'échelle vont aussi dans `CLAUDE.md` (sous `agent-profiles`), sous un titre distinct de `## Règles` pour ne pas créer de ligne de double encodage. Une phrase dit que « toi » désigne l'agent principal (`project-lead`), car tous les agents lisent `CLAUDE.md`. Un renvoi à `.claude/hooks/profile-guard.mjs` dit où sont appliqués les droits d'écriture. Le test d'égalité de #38 (`workflow.md` ↔ `project-lead.md`) est étendu à `CLAUDE.md`. ARCH-013 (décision 6 et Do) est amendé en conséquence.
- **D2. Aucune règle à `paths:`.** Le plugin n'en génère aucune ; un test le fige sur la sélection complète. Les fichiers que créent les CLI d'outillage sont hors de ce contrôle.
- **D3. Module `compact-recall`, sans clé ni question.** Un module est déjà un choix opt-in (ARCH-010) ; une question de phase 0 ne serait posée qu'une fois le module choisi : l'explication va dans `description`, comme pour `agent-teams`. `buildSettings` ajoute l'entrée `SessionStart` à matcher `compact` avec `push`, après celle du mode `local` qui reste la première. `buildSettings` reste le seul code hors du dossier du module, comme pour les permissions : ARCH-010 mentionne désormais les hooks de `settings.json`. `SessionStart` est un hook stable : aucun réglage payant ni expérimental (ARCH-015).
- **D4. Rappel lu sur le disque, sans CLI.** Racine du projet calculée depuis l'emplacement du script (`../..`), comme `session-path.mjs`. Branche par `git branch --show-current` (fonctionne sur une branche sans commit), `spawnSync` avec délai et stderr capturé, échec ignoré. Changements en cours : dossiers de `openspec/changes/` hors `archive` avec `tasks.md` ; cases `- [x]`/`- [X]` comptées sur le texte normalisé en LF. Au plus dix changements, sortie courte (la sortie d'un hook ajoutée au contexte est plafonnée). Pas d'échelle dans le rappel : elle est dans `CLAUDE.md`, relu après compaction. Aucune dépendance à `openspec` ni à son `PATH` (le hook ne reçoit pas `node_modules/.bin` en mode local).
- **D5. Tests.** Le test d'exécution du hook vit dans `assets/modules/compact-recall/tests/` ; ceux de génération dans `tests/scaffold.test.mjs`. Les tests sans git posent `GIT_CEILING_DIRECTORIES`.
- **D6. `SKILL.md` du plugin.** Test de position (`[STOP]` avant 3 000 caractères, reprise avant 12 000, accord pour les écritures `gh` avant 15 000). Le fichier dépasse 5 000 jetons : la fin est tronquée après compaction, ce qui compte est en tête.
- **D7. Hors périmètre, issue #39 ouverte.** La vérification sur une compaction réelle et `SessionStart` pour un teammate ne peuvent pas être établis sans session interactive : la PR utilise `Refs #39`.
- **D8. Retrait du module.** La fusion de `settings.json` ne retire jamais rien : l'entrée `compact` et le fichier du hook restent après retrait du module ; consigné dans `pitfalls.md`.

## Risques

- Une compaction réelle n'est pas rejouée ici.
- Le rappel peut devenir obsolète si la structure de `openspec/changes/` change : le test de contenu le détecte.
