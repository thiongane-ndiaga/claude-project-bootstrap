## MODIFIED Requirements

### Requirement: Conservation de la base des fichiers générés
À chaque génération, mise à jour ou adoption, le générateur SHALL enregistrer dans `.bootstrap/base/<chemin du fichier>.base` le contenu que le modèle a produit, normalisé en fins de ligne LF. Sont exclus : les fichiers fusionnés par lignes ou par JSON, les fichiers propres au projet (`owned`), ceux listés dans `keep` (leur base antérieure reste en place) et tout fichier resté en conflit non résolu. Avec `--dry-run`, aucune base n'est écrite.

#### Scenario: Première génération
- **WHEN** un projet est généré
- **THEN** chaque fichier concerné a une copie de son contenu produit dans `.bootstrap/base/` avec le suffixe `.base`, et ni les fichiers fusionnés, ni les fichiers `owned` ou `keep` n'en ont

#### Scenario: Modèle inchangé
- **WHEN** `--update` s'exécute alors que le modèle d'un fichier personnalisé n'a pas changé et que sa base manque
- **THEN** la base est écrite avec le contenu actuel du modèle, car son empreinte égale celle enregistrée au manifeste

#### Scenario: Fichier en conflit
- **WHEN** un fichier reste en conflit après `--update`
- **THEN** sa base existante n'est pas remplacée, et aucune base n'est créée s'il n'en avait pas

#### Scenario: Simulation
- **WHEN** `--update --dry-run` s'exécute
- **THEN** aucun fichier de `.bootstrap/base/` n'est créé ni modifié

## ADDED Requirements

### Requirement: Référence de base figée pendant keep
Tant qu'un fichier est listé dans `keep`, le générateur SHALL conserver l'empreinte `generated` de son entrée du manifeste, qui désigne sa base, et MUST NOT la remplacer par celle du modèle actuel ; `sha256` suit le fichier du projet. Cela ne vaut ni pour un fichier `owned`, ni pour un fichier fusionné par lignes ou JSON. Sans entrée antérieure, `generated` reçoit l'empreinte du modèle actuel et aucune base n'est écrite.

#### Scenario: Modèle changé pendant keep
- **WHEN** `--update` s'exécute alors qu'un fichier est dans `keep` et que son modèle a changé
- **THEN** le fichier et sa base restent intacts, et l'empreinte `generated` de son entrée est celle d'avant la mise à jour

#### Scenario: Ajout à keep avec modèle changé
- **WHEN** un fichier est ajouté à `keep` au passage même où son modèle change
- **THEN** l'empreinte `generated` de son entrée reste celle de la génération précédente et sa base n'est pas modifiée

#### Scenario: Fichier dans keep dès la première génération
- **WHEN** un fichier du modèle est listé dans `keep` à la première génération et existe déjà dans le projet
- **THEN** aucune base n'est écrite, et `generated` est l'empreinte du modèle actuel

### Requirement: Fichier retiré de keep réconcilié
Une entrée du manifeste au statut `kept`, non `owned` et non fusionnée par lignes ou JSON, dont le chemin ne figure plus dans `keep`, SHALL être traitée comme un fichier modifié par le projet : fusion à trois voies à partir de sa base, conflit, repli, adoption et simulation des autres fichiers modifiés. Sans base, le fichier est en conflit jusqu'à `--adopt`. Un fichier toujours dans `keep` MUST rester intact.

#### Scenario: Retrait de keep avec base valide sans conflit
- **WHEN** un fichier retiré de `keep` a été modifié par le projet, que son modèle a changé depuis sa base et que la fusion est sans conflit
- **THEN** le fichier est fusionné et listé dans `reconciled`, son entrée du manifeste passe au statut `reconciled` avec l'empreinte du nouveau modèle, sa base devient le nouveau modèle, et le code de sortie est 0

#### Scenario: Retrait de keep avec conflit
- **WHEN** un fichier retiré de `keep` produit des conflits de fusion
- **THEN** le fichier reste intact, il figure dans `conflicts`, avec `--diff` sa proposition avec marqueurs est sous `diffs`, la base et l'entrée du manifeste ne changent pas, et le code de sortie est 3

#### Scenario: Retrait de keep sans base
- **WHEN** un fichier retiré de `keep` a un modèle changé et sa base n'existe pas
- **THEN** il est listé dans `conflicts` avec le diff simple entre le projet et le modèle, il reste intact, il n'est pas listé dans `baseInvalid`, et la commande ne s'interrompt pas sur une erreur

#### Scenario: Retrait de keep avec base altérée
- **WHEN** un fichier retiré de `keep` a un modèle changé et une base dont l'empreinte diffère de `generated`
- **THEN** il est listé dans `conflicts` avec le diff simple, il reste intact, il figure dans `baseInvalid`, et la commande ne s'interrompt pas sur une erreur

#### Scenario: Retrait de keep sans base, modèle inchangé
- **WHEN** un fichier retiré de `keep` n'a pas de base, parce qu'il était dans `keep` dès la première génération, et que son modèle n'a pas changé
- **THEN** il est listé dans `conflicts` et reste intact, jusqu'à ce que `--adopt` le consigne

#### Scenario: Retrait de keep avec modèle inchangé
- **WHEN** un fichier retiré de `keep` a une base et a été modifié par le projet alors que son modèle n'a pas changé depuis cette base
- **THEN** il est listé dans `customized`, et ni le fichier ni son entrée du manifeste ne sont modifiés ; sa base est réécrite avec le modèle actuel si elle manque ou diffère

#### Scenario: Fichier toujours dans keep
- **WHEN** `--update` s'exécute alors que le fichier est toujours listé dans `keep`
- **THEN** il est listé dans `kept`, ni fusionné, ni remplacé, ni signalé en conflit

#### Scenario: Fichier fusionné par lignes retiré de keep
- **WHEN** un fichier fusionné par lignes ou par JSON, tel que `.gitignore`, est retiré de `keep`
- **THEN** il est fusionné par son mécanisme propre, sans base ni fusion à trois voies, comme avant ce changement

#### Scenario: Simulation d'un retrait de keep
- **WHEN** `--update --dry-run` s'exécute et la fusion d'un fichier retiré de `keep` serait sans conflit
- **THEN** le fichier est listé dans `reconciled`, mais ni lui, ni sa base, ni le manifeste ne sont modifiés

#### Scenario: Idempotence après adoption
- **WHEN** un conflit d'un fichier retiré de `keep` est consigné par `--adopt`, puis `--update` s'exécute de nouveau sans changement du modèle
- **THEN** le fichier est listé dans `customized`, et la seconde exécution n'écrit ni fichier, ni base, ni manifeste
