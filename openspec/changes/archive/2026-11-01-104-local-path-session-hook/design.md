## Contexte

`CLAUDE_ENV_FILE` est fourni aux hooks `SessionStart` ; Claude Code exécute son contenu comme du shell avant chaque commande de l'outil Bash. L'outil PowerShell ne l'exécute pas et n'en retient que des affectations simples dont la valeur ne contient ni `/` ni `\` (documentation des hooks de Claude Code). La clé `env` de `settings.json` n'étend pas le PATH (valeurs littérales).

## Décisions

- **D1. Un script Node dédié** (`session-path.mjs`) plutôt qu'une commande shell : portable, cohérent avec les autres hooks (forme `command: "node"` + `args`), chemin calculé à l'exécution depuis `import.meta.url`, donc valable sur chaque poste et sans chemin absolu commité.
- **D2. Syntaxe Bash.** Le fichier est lu par Bash : le dossier est entre apostrophes (apostrophe interne échappée en `'\''`) puis `:"$PATH"`, soit `export PATH='/c/a/node_modules/.bin':"$PATH"`. La conversion `C:\a\b` vers `/c/a/b` ne s'applique que sous Windows (un `\` est un caractère légal ailleurs). Les chemins UNC deviennent `//serveur/partage`, que Git Bash accepte ; Cygwin n'est pas géré.
- **D3. Un hook de démarrage ne bloque jamais** : `CLAUDE_ENV_FILE` absent ou écriture impossible → code 0.
- **D4. Condition `cli-local`** : le modèle est déclaré dans le module `claude` avec `when: ["cli-local"]` ; le hook n'est inscrit dans `settings.json` (`buildSettings`) qu'en mode `local`.
- **D5. Pas de contrôle d'audit nouveau** : le fichier est suivi par le manifeste, donc une dérive est déjà signalée par l'audit ; un contrôle `--workstation` de plus ne vérifierait que cela.
- **D6. Sans `matcher`** : le hook s'exécute pour toutes les sources de `SessionStart` (démarrage, reprise, `/clear`, compaction), donc le PATH est posé après chacune. Un préfixe répété (hook, `quality-gate.mjs`, `npm run claude`) n'a aucun effet.

## Limite restante

Outil PowerShell et terminal personnel : `npm run claude` ou `npx`. Documentée dans `pitfalls.md`, `docs/workflow.md` et ARCH-007.

## Risques

- Le comportement de `CLAUDE_ENV_FILE` sous Windows dépend de Git Bash ; vérifié par un essai réel avant la fusion (`claude --debug`, puis `command -v openspec` dans l'outil Bash).
