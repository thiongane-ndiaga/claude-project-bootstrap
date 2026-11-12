## Contexte

`audit.mjs` lit `ci.yml` pour les versions (`checkVersions`) et compare les contextes exigés aux jobs des workflows (`expectedContexts`). Un statut Jenkins de GitHub Branch Source se nomme `continuous-integration/jenkins/pr-merge` ou `…/branch` et n'est pas un job de workflow.

## Décisions

- **D1. Préfixe, pas nom exact.** Le nom dépend du type de job et de la configuration du serveur ; le préfixe `continuous-integration/jenkins/` couvre les statuts de commit du plugin GitHub Branch Source. Un contexte ayant ce préfixe, avec le module `jenkins` actif, est classé « Jenkins » avant le test de l'application émettrice : il est `ok` même s'il vient d'une application tierce (GitHub App de Jenkins).
- **D2. Un écart reste un écart.** Les autres contextes sont traités comme avant ; un check inexistant à côté d'un contexte Jenkins reste un écart. Sans le module, un contexte Jenkins reste un écart.
- **D3. Pas de comparaison au nom du job Jenkins.** Le nom réel dépend du serveur : l'audit ne peut que le reconnaître, le message le dit.
- **D4. Versions du `Jenkinsfile`.** Lues par `<paquet>@<chiffre…>` (`@fission-ai/openspec`, `archgate`), seulement hors mode `local` (en mode `local` le `Jenkinsfile` n'épingle rien : `npm ci`). Source nommée `Jenkinsfile` dans le message ; la correction existante est suivie de « aligner la version du Jenkinsfile sur <version> ». Fichier absent ou version introuvable : source ignorée, sans erreur.

## Risques

- Un projet qui renomme le paquet dans son `Jenkinsfile` n'est pas lu : la source est ignorée, comme avant.
