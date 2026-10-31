Issue: #50
ADR: aucun

## Why

Les tests actuels (254 assertions) vérifient de nombreux comportements précis, mais ne génèrent que 7 combinaisons de modules : `archgate`, `arc42`, `projects`, `archgate-plugin` et `agent-teams` ne sont jamais générés seuls, ni la sélection par défaut, ni la sélection complète. Rien ne valide un projet généré avec les vraies CLI (`openspec validate`, `archgate check`) alors que c'est ce que ces outils doivent garantir à ses utilisateurs, et aucun instantané ne signale un changement de modèle involontaire.

## What Changes

- Nouveau fichier `tests/matrix.test.mjs`, lancé par `.bootstrap/checks.json` en plus de `tests/scaffold.test.mjs`.
- **Matrice** de 15 combinaisons déduites du catalogue : `core` seul, chaque module avec sa chaîne de dépendances, la sélection par défaut, la sélection par défaut avec une stack choisie, la sélection complète, et la sélection complète en dépôt public.
- **Invariants** par combinaison : génération sans erreur, aucun paramètre `{{…}}` ni marqueur `@@` restant, JSON valides, fichiers du manifeste présents, clés du manifeste sans antislash, aucun CRLF, bases égales aux fichiers, mise à jour immédiate sans effet, deux générations identiques.
- **Instantanés** `tests/snapshots/<combinaison>.json`, nommés en anglais (chemin et empreinte SHA-256 de chaque fichier; manifeste listé sans empreinte), mis à jour explicitement par `UPDATE_SNAPSHOTS=1`, refusé quand `CI` est défini; un instantané orphelin fait échouer.
- **Validation par les vraies CLI** des sélections par défaut et complète (`openspec init` puis `openspec validate`, `openspec doctor`, `archgate check`) et par l'audit : exigée en CI, ignorée avec un message en local quand les CLI manquent.
- **Documentation** dans `CONTRIBUTING` : lancer les tests, mettre à jour les instantanés, et la décision sur l'évaluation du skill.

Hors périmètre : modifier le générateur ou les modèles; évaluer le skill en CI (écarté : non déterministe, payant, compte de l'utilisateur).

## Capabilities

### New Capabilities
- `generator-test-suite`: garanties vérifiées par la suite de tests du plugin sur la sortie du générateur (matrice des modules, invariants, instantanés, validation par les CLI réelles).

### Modified Capabilities

## Impact

- Nouveaux : `tests/matrix.test.mjs`, `tests/snapshots/*.json`.
- Modifiés : `.bootstrap/checks.json` (une commande de plus), `CONTRIBUTING.md`, `CLAUDE.md` et `.github/pull_request_template.md` (qui ne citaient que l'ancien test).
- CI : la même commande de tests sur les trois systèmes; la validation par les CLI réelles utilise `openspec` et `archgate`, déjà installés par la CI avant les commandes du projet.
- Tout changement de modèle futur change au moins un instantané : à régénérer et à relire dans la même PR.
