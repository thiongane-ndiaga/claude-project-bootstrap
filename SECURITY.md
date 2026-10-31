# Politique de sécurité

## Signaler une vulnérabilité
Ne crée pas d'issue publique. Utilise le signalement privé de GitHub : onglet **Security** du dépôt, puis **Report a vulnerability**.

Indique la version du plugin (`.claude-plugin/plugin.json`), le fichier ou le modèle concerné et les étapes pour reproduire. Tu auras un accusé de réception sous 7 jours.

## Périmètre
Ce plugin génère des fichiers (hooks, workflows GitHub, réglages Claude Code) et ne s'exécute que sur demande de l'utilisateur. Sont concernés en particulier : un modèle qui affaiblit une protection (hook en lecture seule contournable, permissions de workflow trop larges, action non épinglée sur un SHA), ou un script qui écrit hors du dossier cible.

## Versions prises en charge
Seule la dernière version publiée reçoit des correctifs.
