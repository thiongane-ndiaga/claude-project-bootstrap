Issue: #48
ADR: ARCH-008

## Why

Quand la langue choisie n'est pas le français, le skill traduit les fichiers générés après la génération. Le résultat n'est pas reproductible d'une exécution à l'autre, il ne correspond à aucun modèle (donc à aucune base de fusion) et la mise à jour d'un projet traduit repose sur des fichiers que le plugin ne sait plus produire.

## What Changes

- Nouvelle clé `docLanguage` de `bootstrap.json` : `fr` (défaut) ou `en`, consignée au manifeste seulement quand elle est présente. Une langue sans modèles est refusée (code 1) en listant les langues disponibles.
- Nouveau dossier `assets/templates.en/` : version anglaise des seuls modèles qui ont du texte (documents, ADR, formulaires, agents, scripts avec messages). Les modèles sans texte sont partagés avec le français. Les noms de fichiers sont identiques dans toutes les langues.
- Les paramètres qui portent du texte (`VISIBILITY_FR`, `CI_OS_FR`, `CI_BLOCKING_NOTE`, `ACTIONS_CREDIT_NOTE`) prennent leur valeur dans une table par langue ; `VISIBILITY_FR` et `CI_OS_FR` sont renommés `VISIBILITY_LABEL` et `CI_OS_TEXT`.
- `docLanguageName` reste le libellé affiché ; sa valeur par défaut dépend de la langue (`Français`, `English`).
- Le skill ne traduit plus : la phase 0 propose les langues disponibles, `openspec init --language` reçoit le code choisi.
- La matrice ajoute `default-en` et `full-en`. Des tests de parité vérifient chaque modèle anglais face à son modèle français (marqueurs `@@module`, paramètres `{{…}}`, squelette de code des scripts) et qu'un modèle sans version anglaise ne contient aucun caractère accentué.
- `--update` conserve la langue (et le mode d'installation) du manifeste quand `--config` ne les redéfinit pas ; `--detect` liste les langues disponibles et rapporte celles du manifeste.
- Le vocabulaire du statut des ADR suit la langue (`## Status`, `Proposed`…) et la règle ARCH-003 de chaque langue l'accepte.
- `CONTRIBUTING` documente l'ajout d'une langue ; ADR ARCH-008.

Hors périmètre : traduction de `SKILL.md` et des messages du plugin, fichiers générés par `openspec init`, autres langues que l'anglais. **Changement de comportement assumé** : une langue autre que `fr` et `en`, servie jusqu'ici par la traduction du skill, est désormais refusée tant que ses modèles n'existent pas.

## Capabilities

### New Capabilities
- `doc-languages`: langues de la documentation générée, sélection des modèles, paramètres localisés et garanties de parité entre langues.

### Modified Capabilities
- `generator-test-suite`: deux combinaisons de la matrice (`default-en`, `full-en`) et les tests de parité entre langues.

## Impact

- Modifiés : `scripts/scaffold.mjs` (clé, sélection du dossier de modèles, paramètres par langue, héritage à la mise à jour, `--detect`), modèle français d'ARCH-004 (renommage de deux paramètres, sans effet sur la sortie), `SKILL.md`, `references/bootstrap-config.md`, `CONTRIBUTING.md`, `tests/scaffold.test.mjs`, `tests/matrix.test.mjs`, ADR `ARCH-008`.
- Nouveaux : `assets/templates.en/**`, instantanés `default-en.json` et `full-en.json`.
- Les instantanés existants ne changent pas (ni le manifeste, ni les fichiers français). Projets existants : français implicite, aucun effet.
