## Contexte

`ci.yml` (module `github`) porte les blocs `@@module:openspec`, `@@module:archgate`, `@@module:cli-local`, `@@module:cli-npm-global` et les paramètres `{{OPENSPEC_VERSION}}`, `{{ARCHGATE_VERSION}}`. Le moteur de blocs retire toute ligne contenant `@@module` ou `@@end`, quelle que soit la syntaxe de commentaire : `// @@module:…` convient au `Jenkinsfile`, et `{{…}}` n'entre pas en collision avec le `${…}` de Groovy. `scripts/check-pr-title.mjs` appartient à `github`, dont `jenkins` dépend (ARCH-010).

## Décisions

- **D1. Complément, pas remplacement.** `ci.yml` reste la CI de référence ; `docs/jenkins.md` le dit.
- **D2. Étapes de `ci.yml`, même ordre, noms fixés** : `Node`, `Titre de PR` (PR seulement), `CLI d'outillage`, `OpenSpec validate`, `Archgate check`, `Chaîne d'outils du projet`, `Commandes du projet`. Écarts admis : `archgate check --output console` (les annotations GitHub n'ont pas de sens sous Jenkins), pas d'action `project-setup`, mode d'installation des CLI.
- **D3. Chaîne d'outils par un fichier du projet.** L'action `project-setup` est `owned` pour que le projet y installe sa stack sans conflit de fusion (ARCH-006). Son équivalent est `scripts/jenkins-setup.sh`, `owned`, appelé par l'étape `Chaîne d'outils du projet` ; le modèle est un fichier presque vide qui explique son rôle. Le `Jenkinsfile` n'a donc pas à être édité pour cela.
- **D4. Node en première étape.** Le script `node -e` échoue avec un message qui nomme la version (ou l'absence de `node`) sous 20.19 ; syntaxe sans `?.` ni `??` pour s'analyser sous un Node ancien ; extrait et exécuté par le test avec une version simulée. Pas de `tools { nodejs … }` : le nom de l'installation est propre au serveur.
- **D5. Titre de PR.** `when { changeRequest() }`, `withEnv(["PR_TITLE=${env.CHANGE_TITLE}"])` et `sh` en guillemets simples : le titre est contrôlé par l'auteur de la PR, une interpolation dans une chaîne `sh` serait une injection de commande. `docs/jenkins.md` traite aussi la confiance accordée aux PR de fork par GitHub Branch Source.
- **D6. Installation des CLI (amende ARCH-007).** Un `npm install -g` sur un agent auto-hébergé échoue quand le préfixe npm n'est pas inscriptible et modifie un état partagé entre jobs. Mode `local` : `npm ci`, `PATH` du pipeline commençant par `node_modules/.bin`. Autres modes (`global`, `user`) : `npm install -g --prefix "$WORKSPACE/.ci-tools"` à la version épinglée de chaque CLI active, `PATH` commençant par `.ci-tools/bin`. Le `PATH` est posé au niveau du pipeline, donc vaut aussi pour `run-checks`.
- **D7. Options.** `timeout` de dix minutes comme `ci.yml`. L'annulation des builds concurrents (`abortPrevious`) dépend de la version du plugin : non reprise.
- **D8. Aucun effet sur `settings.json`**, aucun hook, aucun secret, aucune question de phase 0.
- **D9. Documentation selon le contexte.** `docs/jenkins.md` contient des blocs `@@module:visibility-private` (pas de protection de branche sur GitHub Free : l'étape du contrôle requis est impossible) et `@@module:cli-local` (`package-lock.json` commité, `package.json` préexistant conservé sans `devDependencies`). Limites listées : `ciOs` ignoré, étiquette d'agent à poser, historique possiblement superficiel, titre de PR modifié qui ne relance pas forcément le job, audit `forge-protection`.
- **D10. Tests.** Génération et conflit dans `tests/scaffold.test.mjs` ; exécution du script de Node et parité avec `ci.yml` dans `assets/modules/jenkins/tests/jenkins.test.mjs` (ARCH-010) ; matrice avec une combinaison `jenkins-cli-local`. Le `Jenkinsfile` n'est pas exécuté par un Jenkins : consigné comme limite, avec la validation manuelle par le linter déclaratif.

## Risques

- Le nom du contexte de statut dépend du job et l'audit `forge-protection` peut signaler un écart quand il est ajouté aux contrôles requis : limite documentée, suivie par #147.
- Le test de parité compare les modèles du plugin ; une version modifiée à la main dans le `Jenkinsfile` d'un projet n'est pas détectée (`audit.mjs` ne lit que `ci.yml` et `package.json`) : limite documentée.
