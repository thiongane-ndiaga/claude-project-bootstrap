# Jenkins

Le `Jenkinsfile` à la racine **complète** `.github/workflows/ci.yml` : il rejoue les mêmes contrôles sur un serveur Jenkins existant. Il ne le remplace pas ; `ci.yml` reste la CI de référence.

Étapes, dans l'ordre de `ci.yml` : vérification de Node, titre de PR (pull request seulement), installation des CLI d'outillage, `openspec validate`, `archgate check`, chaîne d'outils du projet (`scripts/jenkins-setup.sh`), puis `node .bootstrap/run-checks.mjs`.

## Étapes manuelles

Le plugin ne peut ni installer ni configurer Jenkins. À faire une fois :

1. Disposer d'un serveur Jenkins et d'un agent **Linux ou macOS** avec Node ≥ 20.19, git et un shell `sh`.
2. Installer le plugin **GitHub Branch Source** (il remonte le statut de build à GitHub).
3. Créer un job **multibranche** (ou une organisation GitHub) qui pointe sur le dépôt et lit le `Jenkinsfile` à la racine.
4. Ajouter des **identifiants** GitHub (jeton ou application GitHub) au job.
5. Configurer le **webhook** GitHub vers le serveur Jenkins.
6. Régler la **confiance des PR de fork** dans GitHub Branch Source (« Trust: From users with Admin or Write permission ») : sinon une PR de fork peut faire exécuter son propre `Jenkinsfile` sur l'agent, avec les identifiants du job.
7. Ajouter le contexte de statut du job aux **contrôles requis** de la protection de branche de `main` (son nom dépend de la configuration du job).
8. Valider le fichier avec le **linter déclaratif** de Jenkins avant d'activer le job.
9. Installer la chaîne d'outils de la stack sur l'agent ou dans `scripts/jenkins-setup.sh` (fichier du projet, jamais écrasé par une mise à jour du plugin).

@@module:visibility-private
Dépôt privé : un dépôt privé sur GitHub Free n'a pas de protection de branche, donc l'étape 7 est impossible. Ne pas merger une PR dont le job Jenkins est rouge.
@@end
@@module:cli-local
Mode `local` des CLI : le `Jenkinsfile` lance `npm ci`. Commiter `package-lock.json` (sans lui, `npm ci` échoue) ; un `package.json` préexistant est conservé par le plugin, sans les `devDependencies` : les ajouter à la main.
@@end

## Limites

- Complément de `ci.yml`, non un remplacement ; un `Jenkinsfile` existant n'est jamais écrasé (conflit à résoudre à la main).
- `agent any` peut retomber sur un agent Windows où `sh` échoue : poser une étiquette d'agent dans le `Jenkinsfile`.
- `ciOs` de `.bootstrap/checks.json` est ignoré : un seul agent.
- L'historique git peut être superficiel selon la configuration de GitHub Branch Source, alors que `ci.yml` récupère tout l'historique.
- Une modification du titre de la PR ne relance pas toujours le job.
- Les CLI sont installées dans `.ci-tools` de l'espace de travail, sans toucher au préfixe npm de l'agent.
- Le `Jenkinsfile` n'est exécuté par aucun test du plugin ; l'audit `forge-protection` peut signaler le contexte Jenkins comme introuvable parmi les jobs des workflows, et les versions du `Jenkinsfile` ne sont pas contrôlées par l'audit.
