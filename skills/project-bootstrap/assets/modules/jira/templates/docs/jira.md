# Jira

Le module `jira` relie le workflow à Jira : la clé d'un ticket (`{{JIRA_KEY_EXAMPLE}}`) figure dans la branche ou le titre de chaque PR, et `scripts/check-jira-key.mjs` le vérifie dans le job `pr-title` de `ci.yml`. Le plugin n'écrit rien dans Jira.

@@module:issue-source
Source du besoin : **les issues GitHub**. La clé Jira est un lien en plus : champ « Clé Jira » dans les formulaires d'issues, ligne `Jira :` dans le gabarit de PR. Branche, id OpenSpec et `Closes #N` ne changent pas.
@@end
@@module:jira-source
Source du besoin : **les tickets Jira**. Ils remplacent les issues GitHub dans les conventions : branche `<type>/{{JIRA_KEY_EXAMPLE}}-<slug>` (clé en majuscules), id OpenSpec en minuscules (`abc-123-<slug>` : OpenSpec refuse les majuscules), en-tête `Ticket: {{JIRA_KEY_EXAMPLE}}` dans `proposal.md`, `Refs {{JIRA_KEY_EXAMPLE}}` dans le corps de PR à la place de `Closes #N`.
@@end

## Nommage

- La clé va dans la **description** du titre de PR, pas dans le scope : `feat(import): {{JIRA_KEY_EXAMPLE}} accept monthly rent lines` (le scope de `check-pr-title.mjs` n'accepte que `[a-z0-9-]`).
- Une branche ne se renomme pas sur une PR ouverte : en cas d'erreur, ouvrir une nouvelle PR.
- Les branches `dependabot/` et `release-please--` sont exemptées.

## Étapes manuelles

Le plugin n'écrit rien dans Jira : ces étapes sont les tiennes.

1. Créer le projet Jira (ou repérer sa clé).
2. Installer l'app Jira Cloud pour GitHub et connecter le dépôt (interface web de Jira).
3. Ajouter, dans les paramètres du dépôt, des « Autolink references » (préfixe de la clé suivi de `-`, vers l'URL des tickets Jira) pour rendre les clés cliquables dans GitHub.
4. Fermer les tickets dans Jira (à la main, ou par une automatisation Jira sur les PR fusionnées) : `Refs` ne ferme rien.
5. Le module `projects` fait double emploi avec un tableau Jira : tu peux le désactiver.

## Limites

- Aucun essai réel avec une instance Jira : le plugin teste seulement la génération et le script.
- Sans clé de projet (`jira`), le contrôle accepte toute clé `XXX-N`, ce qui laisse passer des faux positifs comme `UTF-8` ou `SHA-256` ; fixer la clé du projet.
- Le `Jenkinsfile` du module `jenkins` ne contrôle pas la clé Jira : seul `ci.yml` le fait.
- La clé de projet va de 2 à 10 caractères (majuscules et chiffres, sans tiret bas).

@@module:jira-source
## Table de lecture : issue → ticket

Les textes générés qui parlent d'« issue » se lisent ainsi quand Jira est la source du besoin.

| Texte | Se lit |
|---|---|
| issue, `#N` | ticket Jira, `{{JIRA_KEY_EXAMPLE}}` |
| `Closes #N` | `Refs {{JIRA_KEY_EXAMPLE}}` |
| `Issue: #N` (en-tête de `proposal.md`) | `Ticket: {{JIRA_KEY_EXAMPLE}}` |
| `<type>/<issue>-<slug>`, `<issue>-<slug>` | `<type>/{{JIRA_KEY_EXAMPLE}}-<slug>`, id OpenSpec en minuscules |
| `gh issue view`, `gh issue list`, `gh issue create` | Jira : les agents n'y ont pas accès, demander le texte du ticket à l'utilisateur ou le recopier dans `proposal.md` |
| formulaire « Décision d'architecture » | ticket Jira de type décision |
| profil `product-owner` | n'ouvre pas d'issue GitHub ; le besoin se rédige dans Jira |
@@end
