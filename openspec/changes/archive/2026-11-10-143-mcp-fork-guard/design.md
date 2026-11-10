## Context

Les constats sont dans le commentaire de #143 : le matcher `mcp__.*` déclenche le hook pour l'agent principal ; les profils à liste `tools` n'ont pas d'outil MCP ; les appels d'outils d'un skill `context: fork` portent `agent_type: "general-purpose"` et un `agent_id`. La revue de spec a durci deux décisions de l'issue : les mots d'écriture l'emportent sur le préfixe de lecture (`find_and_replace`, `get_or_create_*`, `run_query`, `mark_all_notifications_read`), et le contrôle `context: fork` vaut pour tout profil de la table, pas seulement `skillsOpen`. Les décisions sont portées par ARCH-011, ARCH-012 et ARCH-013 ; ce document ne traite que l'implémentation.

## Decisions

- **Entrée de hook** : `scaffold.mjs` ajoute à `settings.hooks.PreToolUse` une seconde entrée `{ matcher: "mcp__.*" }` vers le même hook, la première restant octet pour octet. `settings.json` est fusionné par `mergeJson` (réunion des tableaux sans doublon) : un projet existant reçoit la seconde entrée sans changement de mode de la première.
- **Nom de l'outil MCP** : `mcp__<serveur>__<outil>` ; Claude Code remplace les caractères hors `[A-Za-z0-9_-]` du serveur par `_`, donc la partie finale est prise après le dernier `__`. Une partie finale vide ou un nom sans second `__` est refusé.
- **Classement** : la partie finale est de lecture si elle matche `^(get|list|search|read|find|fetch|view|describe|show|check)(_|$)` ou `_(read|get|list|search)$`, et qu'aucun de ses mots (séparés par `_`, en minuscules) n'est dans `WRITE_WORDS` : `create update delete remove write set add edit modify replace insert send post put patch merge mark move upload publish run exec execute mutate mutation trigger cancel dismiss assign approve apply commit push or query`. Un outil hors classement doit figurer dans `mcpAllow` (noms complets, propre à l'entrée).
- **Refus** : le message nomme l'outil, `mcpAllow` et l'utilisateur ; pour un outil dont le nom contient `github`, il cite aussi `gh issue` et `gh pr`.
- **Skills** : le nom est normalisé (blancs retirés, `/` initial retiré) et doit matcher `^[\w-][\w.-]*(:[\w-][\w.-]*)?$`, sinon refus (code 2). La liste `skills` d'un profil à liste se compare toujours au nom brut. Le contrôle `context: fork` s'applique à tout profil de la table.
- **Candidats d'un skill** : sans espace de noms, `.claude/skills/<nom>/SKILL.md`, `.claude/commands/<nom>.md`, `<config>/skills/<nom>/SKILL.md`, `<config>/commands/<nom>.md` ; avec `<ns>:<nom>`, `.claude/commands/<ns>/<nom>.md`, `<config>/commands/<ns>/<nom>.md` et, pour chaque dossier de plugin `<ns>` (chemins `installPath` des entrées `<ns>@…` de `<config>/plugins/installed_plugins.json`, puis `<config>/plugins/cache/*/<ns>/*/` en repli), `skills/<nom>/SKILL.md` et `commands/<nom>.md`. Un seul candidat à `context: fork` suffit au refus. `<config>` est `CLAUDE_CONFIG_DIR` ou `~/.claude`.
- **En-tête** : entre deux lignes `---` (BOM et CRLF tolérés), une ligne `context:` valant `fork`, avec ou sans guillemets, suivie d'un commentaire éventuel. Un fichier absent vaut « pas de `fork` » ; un fichier présent mais illisible est un refus (défaut fermé). Une racine du projet inconnue est un refus.
- **Tests du hook** : `CLAUDE_CONFIG_DIR`, `HOME` et `USERPROFILE` pointent vers un dossier temporaire, pour ne pas lire la vraie configuration.
- **Mise à jour** : le hook est un fichier géré ; sa fusion à trois voies s'applique.

## Risks / Trade-offs

- Le classement par le nom est une heuristique à défaut fermé : un outil de lecture au nom inhabituel (`getDiagnostics`, `take_screenshot`, `guide`, `query`) est refusé et s'ajoute à `mcpAllow` ; un outil d'écriture au nom de lecture sans mot d'écriture serait permis.
- Un skill introuvable (installation hors de `installed_plugins.json` et du cache, chemins de `plugin.json`, `--plugin-dir`, `--add-dir`) n'est pas refusé.
- Un processus `node` de plus par appel MCP dans toutes les sessions du projet, y compris sans `agent_type`.
- `permissionDecision: "ask"` demanderait l'accord de l'utilisateur à la place du refus ; écarté tant que son comportement en `-p` et en équipe n'est pas constaté.
