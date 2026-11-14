## Contexte

`--detect` charge déjà le catalogue (un catalogue invalide le fait échouer) et lit le manifeste. Les profils optionnels sont la constante `OPTIONAL_PROFILES` du catalogue ; `describeModules` fournit les champs d'un module.

## Décisions

1. **`available` est calculé une fois** et rapporté par `--detect` et par le rapport de `--update` (dry-run compris) : la phase 5 le lit avant toute simulation.
2. **Absent du manifeste et compatible = proposable.** Les modules qui déclarent un `conflicts` avec un module du manifeste (dans un sens ou dans l'autre) sont exclus. Le manifeste ne consigne pas les refus : un module décliné reste listé à chaque mise à jour, et le skill le dit.
3. **`core` n'est jamais listé.** Les profils ne sont listés que si `agent-profiles` figure au manifeste, dans l'ordre de `OPTIONAL_PROFILES` ; sinon `agent-profiles` est un module proposable et porte la question des profils.
4. **Pas de filtre sur les prérequis** : `available` rapporte `requires`, `requiresAny` et `conflicts` ; le skill ajoute les dépendances et ne propose jamais deux modules incompatibles.
5. **Le skill filtre les profils** : `business-analyst` seulement avec `openspec` (au manifeste ou retenu dans la même mise à jour) ; `compliance-reviewer` seulement après avoir posé la question du domaine réglementé quand `config.regulatedDomain` est absent. Aucun autre profil n'est omis.
6. **Manifeste illisible** (`previous` nul) ou sans liste `modules` : pas de `available`. Un module du manifeste inconnu du catalogue est ignoré par le calcul.
7. **Quatre options au plus par question** : règle générale de pose des questions, ajoutée aussi à la phase 0.
8. **Migrations** : ajouter `agent-profiles` à un ancien projet retire des agents historiques par migration (ARCH-016) ; le skill renvoie à l'étape « Migrations ».

## Risques

- Un projet GitHub verra à chaque mise à jour les modules facultatifs qu'il n'a pas choisis (`jenkins`, `sonar`, `jira`, `compact-recall`…) : le skill les regroupe en questions de quatre options et le dit.
