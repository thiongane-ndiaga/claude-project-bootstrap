## Contexte

Le format de module (ARCH-010) n'a pas de sélection fichier par fichier ; `when` accepte des pseudo-modules. Le hook de bornage (ARCH-011, ARCH-012) applique une table par profil. Le propriétaire a retenu : clé `profiles` (liste), `developer` borné par une liste d'exclusion, livraison en deux lots.

## Décisions

- **D1. Pseudo-modules `profile-<nom>`** actifs quand le profil est listé, dérivés de `OPTIONAL_PROFILES` dans `catalog.mjs` (une seule liste pour la validation et le catalogue). Chaque fichier de profil porte `when: ["profile-<nom>"]`.
- **D2. Normalisation de `profiles`** dans `scaffold.mjs` : triée, sans doublon ; `[]` ou `null` supprime la clé avant l'héritage du manifeste, comme `mainAgent: null`.
- **D3. `business-analyst` exige `openspec`** : son travail est le changement OpenSpec.
- **D4. `developer` : `writeExcept`** au lieu de `write` (liste d'exclusion, comparaison en minuscules sur des segments sans points ni espaces finals ; une entrée terminée par `/` est un dossier, les autres des fichiers exacts). Protégés : dossiers `.archgate/`, `.bootstrap/`, `.claude/`, `.git/`, `.githooks/`, `.github/`, `docs/architecture/`, `openspec/changes/archive/`, `openspec/schemas/`, `openspec/specs/` ; fichiers `CLAUDE.md`, `AGENTS.md`, `docs/workflow.md`, `openspec/config.yaml`, `openspec/config.yml`, `release-please-config.json`, `.release-please-manifest.json`. `openspec/changes/` reste ouvert pour cocher les tâches.
- **D5. `shellOpen`** pour `developer` : la stack n'est pas choisie, donc pas de commandes de build ni de test connues. Limite consignée (ARCH-014, `pitfalls.md`).
- **D6. `business-analyst`** : `write: ["openspec/changes/"]`, shell `openspec new change`, `openspec instructions …` et `openspec context` en plus de la lecture seule, avec les guillemets facultatifs que les skills OpenSpec 1.16 emploient (`openspec new change "<nom>"`), skills `opsx:propose`, `opsx:update` et leurs noms `openspec-…` (le nom du skill dépend de l'installation d'OpenSpec).
- **D7. Pas de référence à un module absent** : les blocs `@@module` des trois profils couvrent `github`, `openspec` et `archgate` ; la phrase de périmètre de `developer` ne nomme pas de dossier propre à un module.
- **D9. Chemin réel pour tous les profils de la table** : `realTarget` résout l'ancêtre existant le plus long (`realpathSync.native`) puis ajoute le reste du chemin, ce qui couvre liens, jonctions, noms courts 8.3 et casse réelle ; un segment contenant `:` (flux NTFS) est refusé. Le chemin relatif est résolu depuis `cwd` de l'événement. Une jonction de `tests/` vers l'extérieur est donc refusée aussi pour `qa-engineer`.
- **D10. `keep` sur le hook** : avertissement du rapport (les profils ne sont bornés que par la version du projet).
- **D11. Désactivation** : les fichiers de profils retirés de la sélection sont signalés (`retired`) et sortent du manifeste, mais le générateur ne supprime jamais de fichier : ils restent sur le disque.
- **D8. Lot 2 reporté** : acceptance-tester, scout, devops-engineer, compliance-reviewer (domaine réglementé déclaré) et second-opinion suivent dans une autre PR de #34.

## Risques

- Une liste d'exclusion est plus faible qu'une liste d'autorisation ; un dossier de gouvernance ajouté plus tard n'est protégé qu'une fois listé.
- Les entrées de table des trois profils existent sans la clé `profiles` : un agent du projet du même nom est borné (consigné dans ARCH-014).
- Un teammate `developer` dans un worktree écrit sous `.claude/worktrees/` : tout lui est refusé (consigné).
- Le shell de `developer` n'est pas borné.
- Le nom d'un skill OpenSpec peut varier selon la version installée ; la table liste les deux formes connues.
