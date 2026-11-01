---
id: ARCH-008
title: Modèles de documentation par langue
domain: architecture
rules: false
files: ["skills/project-bootstrap/**"]
---

# Modèles de documentation par langue

## Statut

Accepté.

## Context

Les modèles du plugin sont en français. Pour un projet dans une autre langue, le skill traduisait les fichiers après la génération : le résultat change d'une exécution à l'autre, ne correspond à aucun modèle et ne peut donc ni servir de base de fusion (ARCH-006) ni être contrôlé par un instantané. Une clé de chaîne par phrase rendrait une trentaine de modèles illisibles et ne tient pas pour la prose (arc42, ADR, `docs/workflow.md`).

## Decision

1. Dans chaque module (ARCH-010), les modèles de référence sont dans `templates/` (français). Une langue `<code>` ajoute `templates.<code>/`, qui ne contient que les fichiers ayant du texte ; tout fichier absent est lu dans le `templates/` du même module.
2. Langues disponibles = `fr` et les dossiers `templates.<code>` du module `core` (`templates.fr` est refusé ; un `templates.<code>` absent de `core` aussi). La clé `docLanguage` de `bootstrap.json` choisit la langue (défaut `fr`, consignée au manifeste seulement si présente, héritée du manifeste par `--update`). Une langue indisponible est refusée.
3. Les noms de fichiers sont identiques dans toutes les langues, y compris les slugs français d'arc42 et des ADR : l'arborescence est le contrat.
4. Les paramètres qui portent du texte se résolvent dans une table par langue ; le skill ne traduit plus.
5. Parité testée : mêmes marqueurs `@@module` et paramètres `{{…}}` ; mêmes squelettes de code pour les scripts (chaînes et commentaires retirés, littéraux de regex conservés pour les hooks) ; les règles `.rules.ts` d'ADR sont comparées sans chaînes, commentaires ni regex car leur vocabulaire (`## Status`, statuts) suit la langue. Un modèle sans version anglaise ne contient aucune lettre accentuée.
6. Le vocabulaire du statut d'un ADR suit la langue du projet (`## Statut` / `## Status`, `Accepté` / `Accepted`) ; la règle ARCH-003 de chaque langue accepte le sien.

## Do's and Don'ts

### Do

- Modifier la version française et chaque version traduite dans la même PR.
- Garder les noms de fichiers des modèles identiques d'une langue à l'autre.

### Don't

- Ne pas faire traduire des fichiers générés par le skill.
- Ne pas créer `templates.fr/`.

## Consequences

### Positive

- Génération reproductible par langue, bases de fusion et instantanés valables pour chaque langue.
- Ajouter une langue ne demande aucune modification du générateur.

### Negative

- Deux versions de chaque modèle à maintenir.
- Une langue autre que le français et l'anglais est refusée tant que ses modèles n'existent pas.

### Risks

- Un écart de sens entre deux versions n'est pas détectable par les tests, pas plus que du français sans accent dans un modèle sans version traduite.

## Compliance and Enforcement

Tests de parité de `tests/scaffold.test.mjs`, combinaisons `default-en` et `full-en` de la matrice (instantanés et validation par les CLI réelles). Pas de règle Archgate : le sujet est le contenu des modèles du plugin.

## References

- Issue #48 ; changement OpenSpec `48-doc-languages`
- ARCH-006 (mise à jour des fichiers générés)
