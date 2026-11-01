## Why

En mode `cliInstall: local`, `openspec` et `archgate` ne sont que dans `node_modules/.bin`. Une session lancée par `claude` ne les trouve pas : seul `npm run claude` pose le PATH. Le plugin doit fonctionner avec la commande habituelle (issue #104, suite de #28).

## What Changes

- En mode `local`, un hook `SessionStart` (`.claude/hooks/session-path.mjs`) ajoute `node_modules/.bin` au PATH de l'outil Bash de la session, par `CLAUDE_ENV_FILE`.
- Le hook est déclaré dans `.claude/settings.json` uniquement en mode `local`.
- La documentation (`docs/workflow.md`, `SKILL.md`, `pitfalls.md`, ARCH-007) remplace « une session démarrée autrement ne trouvera pas les CLI » par la limite réelle : l'outil PowerShell et le terminal personnel ne reçoivent pas le PATH.

## Capabilities

### New Capabilities

(aucune)

### Modified Capabilities

- `cli-install-modes` : nouvelle exigence du hook de session ; la documentation du mode retenu décrit la limite restante.

## Impact

- Module `claude` : un modèle (`when: ["cli-local"]`) en français et en anglais ; `buildSettings` dans `scaffold.mjs`.
- Instantanés `default-cli-local` régénérés ; modes `global` et `user` inchangés.
- Hors périmètre : l'outil PowerShell (la documentation de Claude Code n'y transmet pas une valeur contenant `/` ou `\`), le terminal de l'utilisateur.
