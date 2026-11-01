Issue: #49
ADR: ARCH-010

## Why

Tous les modules passent par le catalogue central `assets/modules.json`, les modèles vivent dans deux arbres communs (`assets/templates/`, `assets/templates.en/`) et le tableau des modules est recopié dans `SKILL.md`. Chaque nouveau module modifie ces quatre endroits, ce qui rend les contributions extérieures difficiles et les conflits fréquents.

## What Changes

- Un module devient un dossier `assets/modules/<nom>/` : `module.json` (description, `requires`, `default`, `conflicts`, `questions` de phase 0, liste `files`), ses modèles (`templates/`, `templates.<lang>/`) et ses tests (`tests/*.test.mjs`). Les 12 modules existants et leurs 50 fichiers (93 modèles français et anglais déplacés) sont migrés ; `assets/modules.json` et les arbres communs disparaissent.
- Un fichier appartient au module qui le déclare ; `when` ne liste que les modules supplémentaires nécessaires. La condition de génération, donc la sortie, reste identique (fichiers, manifeste et rapports identiques à ceux du catalogue central ; les instantanés de la matrice ne changent pas). Les ADR d'outillage ARCH-001 à ARCH-005 appartiennent à `archgate`, les formulaires d'issues à `github`, les fichiers transverses à `core`.
- Nouveau `scripts/catalog.mjs` : découverte, validation (champs connus, références, modèle présent, aucun modèle orphelin, chemin unique, numéro d'ADR unique, chemins sûrs et non réservés au générateur, liens symboliques refusés) et assemblage du catalogue, trié par chemin, utilisé par `scaffold.mjs`, les tests et la matrice.
- Une langue est disponible quand le module `core` a son dossier `templates.<lang>/`.
- `scaffold.mjs --list-modules` (JSON ou `--format table`, sans `--target`) remplace le tableau recopié dans `SKILL.md` et rapporte les `questions` ; `--catalog` désigne un dossier de modules ; un catalogue invalide fait échouer toute commande.
- `tests/modules.test.mjs` lance les tests propres aux modules (`--root` pour une copie du plugin) ; `.bootstrap/checks.json` le lance.
- `CONTRIBUTING.md` décrit le format et la procédure d'ajout ; ADR ARCH-010 ; arc42.

Hors périmètre : charger des modules hors du plugin, versionner les modules séparément, déplacer les tests transverses existants. **Reste codé hors du dossier d'un module** (limite assumée, ARCH-010) : les permissions de `.claude/settings.json` par module (`buildSettings`), les étapes de `state.mjs`, les contrôles de `audit.mjs`, les migrations, les blocs `@@module` des fichiers transverses et la consommation des réponses aux `questions` (elles guident le skill, sans schéma de configuration propre au module).

## Capabilities

### New Capabilities
- `module-catalog`: format d'un module (dossier, descripteur), découverte et validation du catalogue, liste générée, tests de module.

### Modified Capabilities
- `doc-languages`: les modèles d'une langue se trouvent dans le dossier `templates.<lang>/` du module qui déclare le fichier ; la langue est fournie par `core`.

## Impact

- Déplacés : les 50 modèles français et leurs 43 versions anglaises vers `assets/modules/<module>/templates*/`.
- Nouveaux : `assets/modules/*/module.json`, `scripts/catalog.mjs`, `tests/modules.test.mjs`, ADR `ARCH-010`.
- Modifiés : `scaffold.mjs`, `SKILL.md`, `tests/scaffold.test.mjs`, `tests/matrix.test.mjs`, `.bootstrap/checks.json`, `references/versioning.md`, `references/bootstrap-config.md`, `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`, ADR ARCH-008, arc42.
- Supprimé : `assets/modules.json`.
- Instantanés : inchangés. Projets existants : aucun effet (les fichiers générés sont les mêmes).
