## ADDED Requirements

### Requirement: Langue de la documentation générée
`bootstrap.json` SHALL accepter une clé facultative `docLanguage`. Les langues disponibles SHALL être `fr` et chaque code `<lang>` pour lequel le dossier `assets/templates.<lang>/` existe (un dossier `templates.fr` est ignoré). Une valeur absente équivaut à `fr` et MUST NOT être écrite au manifeste ; une valeur présente SHALL y être consignée. Une langue indisponible MUST faire échouer `scaffold.mjs` (code de sortie 1, aucun fichier écrit) en listant les langues disponibles.

#### Scenario: Valeur absente
- **WHEN** `docLanguage` est absente
- **THEN** la documentation est en français, le manifeste ne contient pas `docLanguage` et la sortie est identique à celle d'avant la clé

#### Scenario: Anglais
- **WHEN** `docLanguage` vaut `en`
- **THEN** les fichiers qui ont une version anglaise sont générés en anglais et le manifeste consigne `docLanguage: en`

#### Scenario: Langue indisponible
- **WHEN** `docLanguage` vaut `de`
- **THEN** `scaffold.mjs` s'arrête avec le code 1 en nommant `en` et `fr`

### Requirement: Langue et mode conservés à la mise à jour
`scaffold.mjs --update` SHALL rejouer `docLanguage` et `cliInstall` du manifeste. Quand `--config` ne définit pas l'une de ces clés, la valeur du manifeste SHALL être conservée : une configuration sans la clé MUST NOT faire changer la langue ni le mode des fichiers restés tels que générés.

#### Scenario: Mise à jour sans configuration
- **WHEN** `--update` est lancé sur un projet dont le manifeste consigne `docLanguage: en`
- **THEN** la langue est rejouée sans fichier créé, mis à jour ni en conflit

#### Scenario: Configuration sans la clé
- **WHEN** `--update --config` reçoit une configuration sans `docLanguage` pour un projet en anglais
- **THEN** la langue reste l'anglais et aucun fichier n'est remplacé par sa version française

#### Scenario: Détection
- **WHEN** `scaffold.mjs --detect` est lancé
- **THEN** il liste les langues disponibles (`languages`) et rapporte la langue et le mode du manifeste

### Requirement: Sélection des modèles par langue
Pour une langue autre que `fr`, le générateur SHALL lire un modèle dans `assets/templates.<lang>/` quand le fichier de même chemin relatif y existe, sinon dans `assets/templates/`. Les chemins générés MUST être identiques dans toutes les langues, et la génération MUST être identique à chaque exécution pour une langue donnée.

#### Scenario: Fichier sans version anglaise
- **WHEN** un projet est généré en anglais et qu'un modèle n'a pas de version anglaise
- **THEN** le fichier est généré à partir du modèle français

#### Scenario: Même arborescence
- **WHEN** un projet est généré avec les mêmes modules en `fr` et en `en`
- **THEN** la liste des chemins générés est la même

#### Scenario: Reproductibilité
- **WHEN** un projet est généré deux fois en anglais avec la même configuration
- **THEN** les deux générations sont identiques

### Requirement: Paramètres localisés
Les paramètres de modèle qui portent du texte (libellé de visibilité, systèmes de la CI, note sur le blocage par la CI, note de crédit des Actions) SHALL prendre leur valeur dans une table propre à la langue. `docLanguageName` SHALL valoir par défaut `Français` en `fr` et `English` en `en`, et une valeur explicite de `docLanguageName` ou de `actionsCreditNote` l'emporte sur le défaut de la langue.

#### Scenario: Libellé de visibilité
- **WHEN** un projet privé est généré en anglais
- **THEN** le libellé de visibilité est `private` et non `privé`

#### Scenario: Nom de langue explicite
- **WHEN** `docLanguageName` est renseigné
- **THEN** il est utilisé tel quel

### Requirement: Vocabulaire du statut des ADR par langue
Les ADR générés SHALL écrire leur section de statut et leurs valeurs dans la langue du projet (`## Statut` et `Proposé`, `Accepté`… en français ; `## Status` et `Proposed`, `Accepted`… en anglais), et la règle ARCH-003 générée dans chaque langue SHALL accepter le vocabulaire de cette langue. `archgate check` MUST réussir sur un projet généré en anglais.

#### Scenario: ADR anglais
- **WHEN** un projet est généré en anglais avec le module `archgate`
- **THEN** les ADR ont `## Status` avec la valeur `Proposed` et `archgate check` réussit

### Requirement: Parité des marqueurs et des paramètres
Chaque modèle anglais SHALL avoir les mêmes lignes de marqueurs `@@module`/`@@end` (dans le même ordre) et les mêmes paramètres `{{…}}` que le modèle français de même chemin. Un modèle sans version anglaise MUST NOT contenir de lettre accentuée. Un fichier de `assets/templates.<lang>/` sans équivalent dans `assets/templates/` MUST faire échouer le test.

#### Scenario: Modèle anglais divergent
- **WHEN** un modèle anglais perd un marqueur ou un paramètre
- **THEN** le test de parité échoue en nommant le fichier

#### Scenario: Modèle sans texte
- **WHEN** un modèle n'a pas de version anglaise et contient « é »
- **THEN** le test de parité échoue en nommant le fichier

#### Scenario: Modèle anglais orphelin
- **WHEN** un fichier de `assets/templates.en/` n'existe pas dans `assets/templates/`
- **THEN** le test échoue en nommant le fichier

### Requirement: Parité du code des scripts
Pour un script (`.mjs`, `.ts`, `.githooks/pre-push`), le code d'un modèle anglais, une fois retirés les chaînes et les commentaires, SHALL être identique à celui du modèle français, littéraux de regex compris. Seules les règles `.rules.ts` d'ADR, dont le vocabulaire suit la langue, sont comparées sans leurs littéraux de regex.

#### Scenario: Hook de sécurité modifié
- **WHEN** la liste blanche de regex du hook lecture seule anglais diffère de la version française
- **THEN** le test de parité échoue

#### Scenario: Texte ou commentaire traduit
- **WHEN** une chaîne ou un commentaire d'un script est traduit
- **THEN** le test de parité n'échoue pas

### Requirement: Parité de la structure des données et des documents
Pour un YAML, la structure d'un modèle anglais SHALL être identique à celle du français hors commentaires, libellés (`name`, `description`, `label`, `placeholder`) et chaînes. Pour un JSON, elle SHALL l'être hors valeurs de `description`. Pour un document markdown, le nombre de titres SHALL être identique.

#### Scenario: Structure YAML modifiée
- **WHEN** un YAML anglais ajoute une clé que le YAML français n'a pas
- **THEN** le test de parité échoue

#### Scenario: Libellé traduit
- **WHEN** le `name` d'un formulaire d'issue est traduit
- **THEN** le test de parité n'échoue pas

### Requirement: Comportement des scripts dans chaque langue
Les scripts générés en anglais (hook lecture seule, `restrict-path`, `check-pr-title`, `sync-labels`) SHALL avoir les mêmes codes de sortie et les mêmes appels que leur version française, et les agents en lecture seule de chaque langue SHALL ne citer que des commandes acceptées par le hook.

#### Scenario: Hook lecture seule anglais
- **WHEN** le hook anglais reçoit `git log main..HEAD --oneline` puis `git log main..HEAD --format=%s`
- **THEN** il accepte la première (code 0) et refuse la seconde (code 2)

### Requirement: Le skill ne traduit plus
`SKILL.md` SHALL proposer à la phase 0 les langues disponibles (`languages` de `--detect`), passer le code choisi à `docLanguage` et à `openspec init --language`, adapter la section de statut des ADR à la langue, et MUST NOT demander de traduire des fichiers générés. Une langue sans modèles MUST être refusée avec la proposition de `fr` ou `en` et le renvoi vers `CONTRIBUTING`.

#### Scenario: Langue demandée sans modèles
- **WHEN** l'utilisateur demande une langue sans modèles
- **THEN** le skill lui propose `fr` ou `en` et lui indique comment ajouter une langue
