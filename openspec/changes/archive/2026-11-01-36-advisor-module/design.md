## Contexte

Documentation officielle de l'advisor lue le 2026-11-01 (code.claude.com/docs/en/advisor, settings-reference, env-vars) : expérimental, API Anthropic, pas Bedrock ni Google Cloud ni Foundry ; activé par `/advisor`, `advisorModel` ou `--advisor` ; l'advisor doit être au moins aussi capable que le modèle principal, sinon il n'est pas attaché ; Claude décide de l'appeler, aucun réglage ne l'impose ni ne le plafonne ; `DISABLE_TELEMETRY`, `DO_NOT_TRACK`, `DISABLE_GROWTHBOOK` et `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` (sessions qui sautent la récupération des feature flags) le laissent désactivé, de même que `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` ; les sous-agents l'héritent ; les teammates ne sont pas documentés. La version minimale de la fonction de base n'est pas donnée : « 2.1.260 » est celle de `/advisor` hors terminal.

## Décisions

- **D1. Module sans fichier propre** : seuls des blocs `@@module:advisor` dans `project-lead.md` (module `agent-profiles`) et `docs/workflow.md` (module `core`) portent le contenu, comme `agent-teams`.
- **D2. Aucun réglage écrit** : l'advisor est payant, expérimental et propre à l'utilisateur ; `advisorModel` accepte pourtant n'importe quel fichier de réglages, y compris ceux du projet. Écrire une valeur imposerait un coût et un modèle à tous les contributeurs.
- **D3. Pas de négation de module** : l'échelle d'arbitrage reste identique ; la section Advisor précise le niveau 3 (tranche après avis, l'utilisateur si le doute reste) et le niveau 4 (l'avis ne remplace pas l'utilisateur). Le niveau 3 sans module n'est pas dupliqué.
- **D4. Consigne = incitation** : aucun mécanisme ne garantit l'appel ; la section le dit.
- **D5. Indépendance** : l'advisor voit toute la conversation ; une décision structurante revient à l'utilisateur, un contre-avis indépendant au brief neutre (profil du lot 2 de #34) n'est pas nommé tant qu'il n'existe pas.
- **D6. Pas de version minimale écrite** : la documentation n'en donne pas pour la fonction de base ; l'étape explique que `/advisor` sans argument ouvre le sélecteur et indique ce qui est disponible, plutôt que de citer un numéro.
- **D8. Pas de question de phase 0** : choisir le module vaut oui ; une question « mentionner l'advisor ? » ferait répondre deux fois à la même question et ne reporterait rien dans la configuration. Les avertissements (expérimental, payant, réglage utilisateur) sont dans la description du module, affichée au choix.
- **D7. Pas d'ADR** : application de ARCH-010 (module) et ARCH-013 (`project-lead`).

## Risques

- La documentation est expérimentale et peut changer ; `pitfalls.md` date ses constats.
- Que l'advisor serve à un teammate n'est pas établi (#114).
- Le texte « Anthropic API only » de la page est ambigu avec « abonnement ou API » ; on écrit « non disponible sur Bedrock, Google Cloud ni Foundry », qui ne tranche pas la facturation.
