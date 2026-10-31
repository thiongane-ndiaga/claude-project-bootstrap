# generated-files-update Specification

## Purpose
Définir comment la mise à jour d'un projet déjà généré traite les fichiers que le projet a modifiés quand le modèle du plugin change : conservation de la base, fusion à trois voies, repli sûr sur le conflit. Les modèles du plugin sont des fichiers texte.

## Requirements

### Requirement: Conservation de la base des fichiers générés
À chaque génération, mise à jour ou adoption, le générateur SHALL enregistrer dans `.bootstrap/base/<chemin du fichier>.base` le contenu que le modèle a produit, normalisé en fins de ligne LF. Sont exclus : les fichiers fusionnés par lignes ou par JSON, les fichiers propres au projet (`owned`), ceux listés dans `keep` ou au statut `kept`, et tout fichier resté en conflit non résolu. Avec `--dry-run`, aucune base n'est écrite.

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

### Requirement: Base neutre pour les outils du projet
Les copies de base MUST porter une extension neutre (`.base`) pour que les compilateurs, linters et formateurs du projet ne les traitent pas comme du code.

#### Scenario: Copie d'un fichier TypeScript
- **WHEN** un modèle produit un fichier `.ts` ou `.mjs`
- **THEN** sa base est enregistrée avec le suffixe `.base` ajouté au nom complet

### Requirement: Base valide
Une base SHALL être considérée valide quand l'empreinte de son contenu relu, normalisé en LF, égale l'empreinte « générée » enregistrée au manifeste pour ce fichier.

#### Scenario: Base relue en CRLF
- **WHEN** la base a été réécrite avec des fins de ligne CRLF par le système de fichiers du projet
- **THEN** elle reste valide, car son empreinte est calculée après normalisation en LF

### Requirement: Fusion à trois voies d'un fichier modifié
Quand un fichier du projet diffère du modèle, que le modèle a changé depuis la génération et que sa base est valide, le générateur SHALL fusionner la base, le fichier du projet et le nouveau modèle. La fusion se fait en LF et le style d'origine du fichier du projet (CRLF ou LF) est restauré à l'écriture. Les fichiers fusionnés par lignes ou par JSON conservent leur mécanisme propre, prioritaire.

#### Scenario: Modifications éloignées
- **WHEN** le projet a ajouté une ligne loin de celles que le nouveau modèle modifie
- **THEN** le fichier contient à la fois l'ajout du projet et le changement du modèle, il est listé dans `reconciled` du rapport, et la commande se termine avec le code 0

#### Scenario: Fichier en CRLF
- **WHEN** le fichier du projet utilise des fins de ligne CRLF et la fusion est sans conflit
- **THEN** le fichier fusionné conserve des fins de ligne CRLF

#### Scenario: Le projet contient déjà le changement du modèle
- **WHEN** la fusion donne exactement le contenu actuel du fichier
- **THEN** le fichier n'est pas réécrit, il figure dans `identical`, son entrée du manifeste prend l'empreinte du nouveau modèle et sa base est mise à jour

#### Scenario: Persistance de la personnalisation
- **WHEN** un fichier a été fusionné, puis le modèle change à nouveau
- **THEN** le fichier n'est pas remplacé par le modèle : il est fusionné de nouveau à partir de la base mise à jour

#### Scenario: Fichier partagé
- **WHEN** le fichier est fusionné par lignes ou par JSON (par exemple `.gitignore`)
- **THEN** la fusion à trois voies ne s'applique pas et le mécanisme existant garde la priorité

#### Scenario: Simulation d'une fusion
- **WHEN** `--update --dry-run` s'exécute et une fusion serait sans conflit
- **THEN** le fichier est listé dans `reconciled`, mais ni lui, ni sa base, ni le manifeste ne sont modifiés

### Requirement: Conflit signalé sans écrire de marqueurs
Quand la fusion à trois voies produit des conflits, le générateur MUST NOT modifier le fichier du projet. Il SHALL le lister dans `conflicts` et se terminer avec le code 3. Avec `--diff`, il SHALL fournir sous `diffs` la proposition de fusion, marqueurs de conflit compris, à la place du diff simple avec le modèle.

#### Scenario: Modifications voisines
- **WHEN** le projet et le nouveau modèle modifient les mêmes lignes
- **THEN** le fichier reste intact, il figure dans `conflicts`, et avec `--diff` le rapport contient sous `diffs` sa proposition avec marqueurs

#### Scenario: Adoption d'un conflit
- **WHEN** `--adopt` accompagne la mise à jour et la fusion produit des conflits
- **THEN** le fichier est conservé tel quel et consigné `adopted`, sa base devient le nouveau modèle et le code de sortie est 0

#### Scenario: Fusion propre avec adoption
- **WHEN** `--adopt` accompagne la mise à jour et la fusion est sans conflit
- **THEN** la fusion est appliquée et le fichier n'est pas adopté

### Requirement: Repli sur le comportement existant
Si la base est absente, si son empreinte ne correspond pas à celle du manifeste, ou si l'outil de fusion est indisponible, échoue ou est interrompu, le générateur SHALL traiter le fichier comme avant l'introduction de la base : conflit signalé, jamais d'écrasement. Une base présente mais invalide SHALL être signalée dans le rapport sous `baseInvalid`.

#### Scenario: Base absente
- **WHEN** un fichier est modifié, son modèle a changé et sa base n'existe pas
- **THEN** le fichier est listé dans `conflicts`, reste intact, et n'est pas listé dans `baseInvalid`

#### Scenario: Base altérée
- **WHEN** le contenu de la base a été modifié et ne correspond plus à l'empreinte du manifeste
- **THEN** la base est ignorée, le fichier est traité comme sans base et figure dans `baseInvalid`

#### Scenario: Outil de fusion indisponible
- **WHEN** `git` n'est pas disponible au moment de la mise à jour
- **THEN** le fichier est listé dans `conflicts` et reste intact

### Requirement: Date de génération figée
Le générateur SHALL enregistrer la date de génération dans la configuration du manifeste lors de la première génération, et la réutiliser aux mises à jour, y compris quand la configuration est fournie à nouveau par `--config` sans date, afin que le contenu produit par les modèles qui l'emploient ne change pas d'un jour à l'autre. Une date fournie explicitement par la configuration reste prioritaire.

#### Scenario: Mise à jour un autre jour
- **WHEN** `--update` s'exécute plusieurs jours après la génération sans changement de modèle
- **THEN** aucun fichier ne change et aucun n'est considéré comme dont le modèle a changé

#### Scenario: Mise à jour avec une nouvelle configuration
- **WHEN** `--update --config` fournit une configuration sans date
- **THEN** la date enregistrée au manifeste est conservée

### Requirement: Idempotence
Une seconde exécution de `--update` sans changement du modèle, de la configuration ni des fichiers du projet SHALL NOT créer, remplacer, fusionner ni réécrire de fichier, de base ni le manifeste.

#### Scenario: Deuxième mise à jour
- **WHEN** `--update` s'exécute deux fois de suite après une fusion sans conflit
- **THEN** la seconde exécution ne liste rien dans `created`, `updated`, `merged`, `reconciled` ni `conflicts`, le fichier fusionné figure dans `customized`, le rapport ne contient pas de clé `manifest`, et aucune base n'est réécrite
