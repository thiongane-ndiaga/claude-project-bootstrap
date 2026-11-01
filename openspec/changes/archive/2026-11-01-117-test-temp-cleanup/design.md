## Contexte

Une trentaine d'appels `mkdtempSync(path.join(tmpdir(), "pb-…"))` répartis dans quatre suites créent des dossiers que presque aucun test ne supprime. La CI n'est pas touchée (poste éphémère), mais un poste de développement accumule des dizaines de milliers de dossiers.

## Décisions

- **D1. Rediriger le dossier temporaire** plutôt que modifier chaque appel : `tests/tmp-root.mjs` crée `pb-run-…` puis fixe `TMPDIR`, `TEMP` et `TMP`. `os.tmpdir()` suit la variable à chaque appel, donc aucun appel existant ne change, et les processus enfants (générateur, CLI, audit) héritent de la racine.
- **D2. Nettoyage sur l'événement `exit`** de Node : il s'exécute aussi après un échec ou un `process.exit`. Si le dossier est verrouillé (Windows), le nettoyage échoue sans bruit et le dossier reste.
- **D3. Une racine par suite** : chaque suite importe le module ; un processus enfant qui l'importerait réutilise la racine du parent (`PB_TMP_ROOT`) sans la supprimer.
- **D4. `KEEP_TMP=1`** conserve la racine et affiche son chemin au démarrage.
- **D5. Les tests de module** (`agent-profiles`) nettoient déjà leur dossier ; lancés par `modules.test.mjs`, ils héritent de sa racine.

## Risques

- Un test qui compare un chemin à `os.tmpdir()` d'avant la redirection : aucun n'existe (la suite passe).
- Un dossier verrouillé à la sortie reste dans le dossier temporaire du système, comme avant.
