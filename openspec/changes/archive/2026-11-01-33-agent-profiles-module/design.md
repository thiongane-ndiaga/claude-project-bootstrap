## Contexte

Constats de #32 (Claude Code 2.1.316) : la liste `tools` est respectée en sous-agent et en équipe ; le hook de frontmatter ne l'est pas en équipe ; un hook de `settings.json` voit tous les appels avec `agent_type` (nom du profil pour un sous-agent, nom du teammate pour un teammate). Voir ARCH-011.

## Décisions

- **D1. Hook unique `profile-guard.mjs`** dans le module `agent-profiles`, déclaré par `buildSettings` quand le module est actif. Il est autonome : il applique ses préfixes d'écriture (sans dépendre de `restrict-path.mjs`, qui appartient à `arc42`) et délègue la lecture seule du shell à `read-only-bash.mjs`, que le module `claude` fournit toujours (second `node` lancé seulement pour une commande hors motifs de la table).
- **D2. Table `PROFILES`** en tête du script : `{ write: [préfixes], shell: [motifs] }` par profil. Le projet l'adapte à sa stack (par exemple les dossiers de tests).
- **D3. Commandes supplémentaires** comparées par expression régulière ancrée sur la commande entière, sans séparateur ni redirection. Le titre d'`archgate adr create` est entre guillemets doubles et se limite aux lettres, chiffres, espaces et `,.:'’_-` : PowerShell évalue les parenthèses et traite les guillemets typographiques comme des guillemets doubles, donc une classe « tout sauf quelques caractères » laisse passer une expression.
- **D4. Aucun profil n'a `Agent` ni `Skill`** : un agent lancé par un profil porterait un autre `agent_type` et échapperait au bornage, et un skill peut lancer des agents (`archgate:reviewer` en lance). Un profil demande à l'agent principal de lancer l'agent ou le skill.
- **D5. `qa-engineer` écrit dans `tests/` et `test/`** : la stack n'est pas choisie, donc pas de motif par extension ; la table se complète.
- **D6. Références conditionnelles** par blocs `@@module:archgate-plugin`, `archgate`, `openspec`, `github`, `arc42` dans les profils ; la description du profil ne cite aucun module.
- **D7. Coexistence** : aucun agent existant n'est retiré ou renommé (issue #110). `architect` écrit dans `docs/architecture/`, donc aussi dans `arc42/` que gère `arc42-keeper` : chevauchement accepté.
- **D8. Refus par défaut** pour un profil de la table : chemin absent, racine inconnue ou exception donnent le code 2 (un code 1 laisse l'outil s'exécuter). Une entrée illisible, profil inconnu, donne 0.
- **D9. Le bornage est un garde-fou contre l'erreur, pas un bac à sable** : un profil peut écrire un fichier dans son périmètre puis le faire exécuter par un contrôle autorisé (`tests/x.test.mjs` puis `run-checks.mjs`, ou une règle `*.rules.ts` puis `archgate check`). La relecture humaine reste la garantie ; ces deux chemins sont consignés dans `pitfalls.md`.
- **D10. `model: opus`** est posé dans les deux profils comme dans les agents existants ; la configuration par profil (`model`, `effort`, `maxTurns`) relève de #37.

## Risques

- Nom de teammate différent du profil : non borné, documenté.
- Profil intégré `Explore` : reçoit tout l'outillage en équipe, hors périmètre, documenté.
- Teammate dans un worktree : chemin calculé depuis `CLAUDE_PROJECT_DIR`, écritures légitimes refusées, documenté.
- Casse (`Tests/` refusé), liens et jonctions non résolus : refus à tort sans risque, ou hors modèle de menace.
- Coût d'un `node` par écriture ou commande : accepté (ARCH-011).
- Retrait du module : le hook déjà déclaré reste dans `settings.json` (fusion par union) et ne borne plus rien sans la table.
