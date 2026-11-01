## Contexte

Essai de #35 (Claude Code 2.1.316, plugin Archgate 0.18.0 chargé par `--plugin-dir`) : sans réglage de projet, l'agent répond en agent Archgate ; avec `"agent": "project-lead"` dans le `.claude/settings.json` du projet, il répond en `project-lead`. Essai de délégation avec le projet généré (`mainAgent` présent) : sur « fais relire util.py », `project-lead` lance `qa-engineer`.

## Décisions

- **D1. Pas de conflit** avec `archgate-plugin` : le réglage de projet l'emporte ; aucun `conflicts` n'est ajouté.
- **D2. `mainAgent` facultatif**, une seule valeur `"project-lead"`, validé dans `scaffold.mjs` à côté de `cliInstall` ; consigné au manifeste, hérité par `--update`, présent parmi les réponses de `state.mjs`. Désactivé par défaut pour qu'aucun projet change d'agent sans l'avoir demandé.
- **D3. `project-lead.md` sans `tools`** : un agent principal garde tous les outils ; sans `hooks` : il n'est pas borné (ARCH-013). Il est absent de la table du hook (`agent_type` de l'agent principal est absent des entrées).
- **D4. Délégation détectée à l'exécution** : le prompt dit de déléguer à `developer` ou `business-analyst` « s'ils existent dans `.claude/agents/` », ce qui évite une condition de module tant que #34 n'est pas livrée.
- **D5. Savoir-faire d'Archgate réparti** : le brief joint les briefings (`archgate review-context --base`) ; la validation reste à `qa-engineer` ; la capture (`lessons-learned`) est lancée par le chef de projet qui demande les ADR à `architect` (le skill n'est pas permis à `architect`, ARCH-012).
- **D6. Blocs conditionnels** `@@module:archgate`, `archgate-plugin`, `openspec`, `github` dans `project-lead.md` ; aucune mention de module hors blocs (test).
- **D7. Échelle d'arbitrage sans module advisor** : le niveau 3 est tranché par le chef de projet, l'utilisateur en cas de doute ; le module `advisor` (#36) le complétera.

## Risques

- Quand `project-lead` écrit lui-même le code, « qui écrit ne relit pas » repose sur sa consigne et sur `qa-engineer`.
- Le réglage `agent` s'applique à toutes les sessions du clone ; le retirer redonne l'agent par défaut.
- Les garde-fous de `project-lead` sont des consignes, pas des mécanismes.
