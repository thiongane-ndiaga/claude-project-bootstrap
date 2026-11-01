## MODIFIED Requirements

### Requirement: Langue de la documentation générée
`bootstrap.json` SHALL accepter une clé facultative `docLanguage`. Les langues disponibles SHALL être `fr` et chaque code `<lang>` pour lequel le module `core` a un dossier `templates.<lang>/` (`templates.fr` est refusé). Une valeur absente équivaut à `fr` et MUST NOT être écrite au manifeste ; une valeur présente SHALL y être consignée. Une langue indisponible MUST faire échouer `scaffold.mjs` (code de sortie 1, aucun fichier écrit) en listant les langues disponibles.

#### Scenario: Valeur absente
- **WHEN** `docLanguage` est absente
- **THEN** la documentation est en français, le manifeste ne contient pas `docLanguage` et la sortie est identique à celle d'avant la clé

#### Scenario: Anglais
- **WHEN** `docLanguage` vaut `en`
- **THEN** les fichiers qui ont une version anglaise sont générés en anglais et le manifeste consigne `docLanguage: en`

#### Scenario: Langue indisponible
- **WHEN** `docLanguage` vaut `de`
- **THEN** `scaffold.mjs` s'arrête avec le code 1 en nommant `en` et `fr`

### Requirement: Sélection des modèles par langue
Pour une langue autre que `fr`, le générateur SHALL lire un modèle dans le dossier `templates.<lang>/` du module qui le déclare quand le fichier de même chemin relatif y existe, sinon dans le dossier `templates/` de ce module. Les chemins générés MUST être identiques dans toutes les langues, et la génération MUST être identique à chaque exécution pour une langue donnée.

#### Scenario: Fichier sans version anglaise
- **WHEN** un projet est généré en anglais et qu'un modèle n'a pas de version anglaise
- **THEN** le fichier est généré à partir du modèle français

#### Scenario: Même arborescence
- **WHEN** un projet est généré avec les mêmes modules en `fr` et en `en`
- **THEN** la liste des chemins générés est la même

#### Scenario: Reproductibilité
- **WHEN** un projet est généré deux fois en anglais avec la même configuration
- **THEN** les deux générations sont identiques

### Requirement: Parité des marqueurs et des paramètres
Chaque modèle anglais SHALL avoir les mêmes lignes de marqueurs `@@module`/`@@end` (dans le même ordre) et les mêmes paramètres `{{…}}` que le modèle français de même chemin. Un modèle sans version anglaise MUST NOT contenir de lettre accentuée. Un fichier du dossier `templates.<lang>/` d'un module sans équivalent dans son dossier `templates/` MUST faire échouer le test.

#### Scenario: Modèle anglais divergent
- **WHEN** un modèle anglais perd un marqueur ou un paramètre
- **THEN** le test de parité échoue en nommant le fichier

#### Scenario: Modèle sans texte
- **WHEN** un modèle n'a pas de version anglaise et contient « é »
- **THEN** le test de parité échoue en nommant le fichier

#### Scenario: Modèle anglais orphelin
- **WHEN** un fichier du dossier `templates.en/` d'un module n'existe pas dans le dossier `templates/` de ce module
- **THEN** le test échoue en nommant le fichier
