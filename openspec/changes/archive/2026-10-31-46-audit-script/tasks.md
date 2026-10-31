## 1. Squelette, rapport et contrôles locaux

- [x] 1.1 Créer `scripts/audit.mjs` : `runAudit`, exécuteur réel (avec et sans shell, `cwd`, télémétrie coupée) et injectable, sonde de CLI (127 / 9009 / ENOENT → `non-verifiable`), format des résultats, ligne de commande (`--target`, `--json`, `--forge`, `--workstation`, `--repo`, `--project`, `--owner`), garde d'exécution directe avec `realpathSync`, codes 0, 1, 2; tests : projet sain sans écart, cible absente et `--repo` invalide (code 2, aucune commande lancée), exception d'un contrôle → `non-verifiable`, délai dépassé, sortie `--json` avec compte par statut, tout `non-verifiable` (résumé explicite, code 0), chemin de cible avec espaces.
- [x] 1.2 Manifeste, version du plugin, mise à jour en attente et bases invalides (processus enfant `scaffold.mjs --update --dry-run`, règles de D4); tests sur des projets générés : manifeste absent (`non-verifiable`), manifeste illisible (écart), version en retard, `reconciled` en attente, conflit (sortie 3 normale), base altérée, `manifest: updated` seul et `merged` non comptés, projet à jour (`ok`).
- [x] 1.3 Hooks git et cohérence formulaires / `labels.json`; tests avec git réel dans des dépôts temporaires : 100644 dans l'index, 100755 dans l'index mais 100644 dans le dernier commit, `core.hooksPath` non réglé, bit absent sur disque (hors Windows), cible dans un dépôt parent (`non-verifiable`), formulaire qui pose un label inconnu, casse ignorée, liste en bloc et chaîne à virgules lues, format inconnu → `non-verifiable`.
- [x] 1.4 Versions des CLI et des actions (D7), outils du projet (D8) et réglages / ADR d'exemple (D9); tests avec un exécuteur simulé : trois sources concordantes, CLI du poste différente, CLI absente, SHA d'une action différent entre `ci.yml` et `release.yml` ou du manifeste, `archgate check` en échec, `openspec doctor` sorti en 0 avec statut d'erreur, racine d'un dépôt parent, `agent: archgate:developer` dans les réglages du projet, `GEN-001` présent.

## 2. Forge et poste de travail

- [x] 2.1 Contrôles `--forge` : labels du dépôt, protection de `main` et rulesets face aux jobs de tous les workflows (matrice, `name:`), `--forge` sans dépôt; tests avec un `gh` simulé : label absent, check exigé inexistant, contexte d'une autre application, ruleset seul, 404 et 403 (`non-verifiable`), aucun appel `gh` sans `--forge` ni `--workstation`.
- [x] 2.2 Migrations en attente (D11) avec un `gh` qui refuse toute écriture; tests : `plan()` de toutes les migrations applicables y compris consignées (0001 dérivée après consignation), notes dans le message, écritures refusées (`-X POST`, `-f` sans `-X GET`, `graphql` avec `mutation`), module absent → migration ignorée.
- [x] 2.3 Automatisations du Project (D12, variables GraphQL); tests : « Item closed » désactivée (écart), « Auto-add » activée avec la mention de la vérification manuelle, `--project` sans `--owner` et sans numéro (`non-verifiable`), requête sans interpolation de l'owner.
- [x] 2.4 Contrôles `--workstation` (D13, `home` injectable, `CLAUDE_CONFIG_DIR`); tests : Node trop ancien, git absent, scope `project` manquant, jeton sans liste de scopes (`non-verifiable`), préfixe npm non inscriptible (correction sans `sudo`), plugin Archgate en portée utilisateur qui impose un agent (installation locale non signalée), poste sain sans écart.
- [x] 2.5 Table piège → contrôle (D15) : un test par ligne de la table qui introduit volontairement le piège dans un projet généré (ou son faux environnement) et constate l'écart attendu; un test qui vérifie que chaque puce de `pitfalls.md` nommée dans la table a une ligne.

## 3. Documentation, intégration et vérification

- [x] 3.1 Mettre à jour `SKILL.md` (audit en fin de phase 3 et étape de contrôle de la phase 5, accord avant `--forge`, mise en garde sur la confiance), `references/verification.md` et `references/versioning.md`; test : `SKILL.md` contient ces consignes; vérifier que les commandes et options citées existent.
- [x] 3.2 Lancer l'audit réel sur ce dépôt (`audit.mjs --target .`) avec les CLI installées : zéro écart attendu, ou les écarts réels listés et expliqués; comparer avant et après les empreintes des fichiers suivis et de `.git/index` (inchangées), puis `node .claude/hooks/quality-gate.mjs` renvoie 0.

## Workflow follow-up
- `/opsx:archive` dans la PR, avant le merge.
