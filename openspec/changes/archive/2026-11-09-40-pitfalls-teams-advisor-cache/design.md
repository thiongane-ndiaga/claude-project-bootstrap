## Décisions

- **D1.** Une section « Équipes d'agents, advisor et cache » en fin de `pitfalls.md`, une puce par piège, avec l'URL de la page entre parenthèses et la date de lecture dans le titre.
- **D2.** Le piège sur `ANTHROPIC_BASE_URL` : la documentation (env-vars, settings) ne dit pas s'il touche la session principale ; il est consigné comme constat non vérifié dans la documentation, à confirmer par un essai.
- **D3.** Le plugin Archgate fixe `agent` comme réglage par défaut de plugin (`settings.json` du plugin, `{ "agent": "archgate:developer" }`) : « impose » est inexact, le réglage de l'utilisateur, du projet ou local le remplace.
