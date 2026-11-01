## Contexte

L'advisor est un réglage de session ; les sous-agents l'héritent et Claude Code vérifie le couple modèle appelant / advisor pour chacun (advisor au moins aussi capable que le modèle appelant, sinon il n'est pas attaché). Le plugin ne peut donc pas l'activer par profil : il décide seulement quels profils reçoivent la consigne de le consulter. Les profils en `opus` (`architect`, `qa-engineer`) n'ont pas d'advisor plus faible à appeler utilement ; le couple recommandé est Sonnet avec Opus comme advisor.

## Décisions

- **D1. Clé `advisor` (`true`)** plutôt qu'un module à effet immédiat : l'activation devient une décision de phase 0, par la question que le module déclare (défaut non). Choisir le module sans la clé ne génère rien.
- **D2. Pseudo-module `advisor-on`**, actif quand la clé vaut `true`, cité par les blocs `@@module:advisor-on` des profils et de `docs/workflow.md`. La clé exige le module `advisor`, qui exige `agent-profiles`.
- **D3. Consigne dans les profils sonnet et haiku**, à leurs points de décision (approche, deuxième échec, brouillon ou changement avant de rendre la main). Elle dit que le profil décide d'appeler l'advisor, que rien ne l'impose, et de poursuivre sans lui s'il est indisponible.
- **D4. `project-lead` sans section Advisor** : son modèle est celui de la session, inconnu du plugin ; le niveau 3 de l'échelle reste sans avis.
- **D5. Règle sur `model:` vérifiée par test** : le bloc doit être présent exactement dans les profils `sonnet` ou `haiku`. Un profil sans `model` (project-lead) n'est pas concerné. Quand #37 rendra le modèle configurable, la consigne devra suivre le modèle choisi.
- **D6. `null` et `false`** désactivent la clé avant l'héritage, comme `mainAgent: null` et `profiles: []`.
- **D7. ADR-015** consigne le principe général : le plugin n'écrit pas de réglage payant ou expérimental de l'utilisateur (advisor, drapeaux expérimentaux, variables qui coupent des services), exception encadrée pour `settings.local.json` avec accord.

- **D8. Liste `tools:` fermée** : essai réel (Claude Code 2.1.316, session avec advisor) : un sous-agent déclaré `tools: [Read]` dispose de `Read` et de l'outil `advisor`. La liste fermée des profils ne filtre donc pas l'advisor. Pour un teammate, l'appel n'est pas garanti (#114), ce que la consigne dit.
- **D9. Avertissement** quand `advisor: true` est donné sans profil optionnel : seule l'étape de `docs/workflow.md` est alors générée.

## Risques

- Une consigne dans un profil est une incitation : aucun mécanisme n'impose l'appel.
- Un profil `sonnet` lancé avec un modèle principal plus capable (surcharge de session) n'aura pas d'advisor attaché : le repli « poursuis sans lui » le couvre.
- Le modèle d'un profil peut être surchargé par l'utilisateur ; la règle de cohérence porte sur le modèle par défaut du modèle de fichier.
