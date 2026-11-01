## Contexte

Essais de #113 (Claude Code 2.1.316, `claude -p` avec `--agents` et `--settings`, aucune modification de réglages) :

- **Q1.** `tools: Agent(rev)` restreint les types lançables pour un agent principal (`general-purpose` refusé : « Agent type 'general-purpose' not found »), mais **pas pour un sous-agent** : un profil lancé en sous-agent a lancé `general-purpose`. L'allowlist du frontmatter ne borne donc pas un profil.
- **Q2.** Un agent lancé par un profil garde ses propres bornes en sous-agent : son hook de frontmatter l'a bloqué, y compris imbriqué.
- Un hook `PreToolUse` de `settings.json` sur l'outil `Agent` reçoit l'appelant (`agent_type`) et `tool_input.subagent_type`, `description`, `prompt`, `run_in_background` (et `name` pour un agent nommé) ; sur `Skill`, `tool_input.skill`.
- `archgate:reviewer` lance des agents `general-purpose` ; `archgate:adr-author` n'en lance pas et n'a pas de `context: fork`.

## Décisions

- **D1. L'allowlist vit dans `profile-guard.mjs`**, pas dans `Agent(...)` : la table `PROFILES` gagne `agents` et `skills` par profil ; le hook gère `Agent`, `Task` (ancien nom) et `Skill` en plus de l'écriture et du shell.
- **D2. Défaut fermé** : liste vide ou absente, tout est refusé ; un `subagent_type` absent, vide ou nul vaut `general-purpose` et est refusé.
- **D3. Pas d'agent nommé** (`name`, `team_name`) : un agent nommé est un teammate, dont le hook de frontmatter ne s'applique pas.
- **D4. Les agents lançables entrent dans la table avec leurs bornes** : `arc42-keeper` n'écrit que dans `docs/architecture/arc42/`, `spec-reviewer` n'écrit nulle part et son shell est en lecture seule, `architecture-explorer` n'écrit nulle part. Elles ne dépendent plus de leur hook de frontmatter, donc valent aussi pour un agent lancé depuis un teammate, et pour un agent d'utilisateur ou de plugin de même nom. Sans `agents` ni `skills`, ces agents ne lancent rien.
- **D5. `archgate:reviewer` reste à l'agent principal** : il lance des agents `general-purpose`, refusés par D2. `archgate:adr-author` est permis à `architect` pour cadrer l'ADR ; la création passe par `archgate adr create` puis `Edit`.
- **D6. `qa-engineer` reçoit `Agent` sans `Skill`** ; `architect` reçoit `Agent` et `Skill`.
- **D7. Cas teammate** : le hook se déclenche pour les appels d'un teammate comme pour ceux d'un sous-agent (constat de #32 pour `Read`) ; son déclenchement sur l'outil `Agent` d'un teammate n'a pas été constaté dans une session d'équipe. Les bornes propres de D4 réduisent l'exposition à ce point, qui reste consigné comme à vérifier.
- **D8. Décision d'architecture** : ces choix remplacent la décision 1 d'ARCH-011 ; ils sont consignés dans ARCH-012, qui porte le tableau des droits par profil.
- **D9. Outils sans objet** : avec `agent-profiles` sans les modules des agents cités, `Agent` et `Skill` restent dans `tools` sans effet (rien n'est lançable), sans risque.

## Risques

- Nom de teammate différent du profil : non borné, documenté (ARCH-011).
- Profil intégré `Explore` : reçoit tout l'outillage en équipe, hors périmètre, documenté.
- Un skill de la table qui changerait (lancement d'un agent, `context: fork`) : à revoir à chaque mise à jour du plugin (ARCH-012).
- Droits d'`openspec` et d'`archgate` au-delà du tableau : à l'agent principal.
