# Prototype des profils d'agents : protocole de vérification

Protocole des essais de l'issue #32 (hypothèses du workflow agentique, #31). Chaque hypothèse se confirme ou s'infirme dans un dépôt d'essai, avec la version de Claude Code et la commande utilisée. Les constats vont dans la colonne « Constat » ci-dessous, puis dans `pitfalls.md` quand ils servent à d'autres. Les sources documentaires sont dans #43.

Version de l'outillage à la rédaction du protocole : Claude Code 2.1.314, OpenSpec 1.15.0, Archgate 0.61.0. Reporte celles de chaque essai.

## Dépôt d'essai

Dépôt jetable, hors de ce dépôt, créé avec le plugin (modules `claude`, `openspec`, `githooks`, `agent-teams`) :

1. `git init -b essai-profils`, puis bootstrap avec le skill, ou `scaffold.mjs` et `openspec init --tools claude --language fr --no-animation`.
2. Trois profils minimaux dans `.claude/agents/`, chacun avec `name`, `description`, `tools`, `model`, `maxTurns` et un corps de quelques lignes :
   - `project-lead` : agent principal, délègue, n'écrit pas.
   - `developer` : n'écrit que dans `src/`.
   - `qa-engineer` : lecture seule, avec le hook `read-only-bash.mjs` en frontmatter.
3. Règles `permissions.allow` / `deny` par chemin dans `.claude/settings.json` (écriture permise dans `src/**`, refusée ailleurs).
4. Redémarrer Claude Code dans le dépôt : agents et plugins ne se chargent qu'au démarrage.

## Hypothèses

| # | Hypothèse | Ce que dit la documentation | Essai | Constat |
|---|---|---|---|---|
| H1 | Les hooks de frontmatter d'un agent s'appliquent à un teammate | Page des agent teams : rien | Lancer `qa-engineer` comme teammate (`name` à l'outil Agent) ; lui faire exécuter `cat README.md`, puis `gh pr view 1 && git log` ; noter bloqué ou exécuté. Refaire en subagent pour comparer | _à constater_ |
| H2 | `{ "agent": "project-lead" }` dans `.claude/settings.json` fait de lui l'agent principal | Résumé : valable aussi via `--agent` | Poser le réglage, redémarrer, demander « quel est ton rôle ? » ; vérifier que `/agents` ou le comportement correspond | _à constater_ |
| H3 | Le prompt d'un agent principal personnalisé remplace le prompt système, y compris la consigne de délégation | Résumé ; le guide d'Opus 5 limite la consigne de délégation au préréglage `claude_code` | Sans consigne de délégation dans `project-lead`, demander une tâche multi-étapes ; voir s'il délègue. Refaire avec la consigne | _à constater_ |
| H4 | L'advisor fonctionne avec des teammates | La page des teams n'en parle pas | `/advisor <modèle>` (≥ 2.1.260), lancer un teammate, observer si l'advisor est consulté côté lead et côté teammate | _à constater_ |
| H5 | Imbrication des subagents jusqu'à trois niveaux | Résumé : `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` | `project-lead` lance `developer`, qui lance un subagent, qui en lance un autre ; noter le niveau où cela s'arrête. Idem depuis un teammate (ses subagents tournent au premier plan) | _à constater_ |
| H6 | Des règles `allow` / `deny` par chemin protègent les écritures d'un teammate | En in-process, les teammates appliquent en direct les règles du lead | Teammate `developer` : écrire `src/a.txt` (attendu : permis) et `docs/a.txt` (attendu : refusé). Refaire en volets séparés (tmux) | _à constater_ |
| H7 | Un hook `SessionStart` à source `compact` est rejoué après compaction | Page « context window » : oui | Hook qui écrit une ligne dans un fichier ; remplir le contexte, lancer `/compact`, vérifier la ligne | _à constater_ |
| H8 | `operations.apply.guidance` et `operations.archive.guidance` de `openspec/config.yaml` sont lues par `/opsx:apply` et `/opsx:archive` | Non vérifié | Y mettre une consigne reconnaissable (« termine chaque réponse par ZZZ »), lancer les deux commandes, chercher la trace | _à constater_ |
| H9 | Un schéma local (`openspec schema fork spec-driven`) survit à `openspec update` et accepte un artefact supplémentaire avec sa propre `instruction` | Expérimental | Forker, ajouter un artefact « revue », lancer `openspec update`, puis `openspec schema validate` et `openspec instructions` | _à constater_ |
| H10 | `openspec status --json` et `openspec list --json` suffisent à relire l'avancement depuis le disque | Non vérifié | Créer un changement, avancer ses artefacts, comparer les sorties à l'état réel des fichiers | _à constater_ |

## Consigner un constat

Pour chaque ligne : version de Claude Code (`claude --version`), commande ou action, résultat observé, et le mot « confirmé », « infirmé » ou « partiel ». Un constat qui contredit #43 ou #31 se signale dans ces issues ; un piège reproductible s'ajoute à `pitfalls.md`.

## Hors protocole

H1 recoupe #21 (cas `cat` et commande composée en teammate) : un seul essai suffit pour les deux issues.
