# advisor-module Specification

## Purpose
Définir le module optionnel `advisor` : la clé `advisor` (question de phase 0, défaut non) qui ajoute aux profils sonnet et haiku la consigne de consulter l'advisor de Claude Code et une étape optionnelle au « Nouveau poste », sans réglage écrit par le plugin (ARCH-015).

## Requirements

### Requirement: Module advisor
Le catalogue SHALL contenir un module `advisor` qui requiert `agent-profiles` et vaut `default: false`, sans fichier propre. Sa description SHALL présenter l'advisor comme expérimental, payant et réglé par l'utilisateur, sans que le plugin écrive de réglage. Il SHALL déclarer une question de phase 0 sur l'activation (clé `advisor`, défaut non). Sélectionné sans `agent-profiles`, `scaffold.mjs` MUST s'arrêter avec le code 1.

#### Scenario: Module listé
- **WHEN** `scaffold.mjs --list-modules` est lancé
- **THEN** le module `advisor` apparaît, par défaut non, avec une description qui parle de fonction expérimentale, payante et de réglage utilisateur, et une question sur la clé `advisor` au défaut non

#### Scenario: Sans agent-profiles
- **WHEN** `advisor` est sélectionné sans `agent-profiles`
- **THEN** `scaffold.mjs` s'arrête avec le code 1 en nommant le module requis

### Requirement: Étape du Nouveau poste
Avec la clé `advisor`, `docs/workflow.md` SHALL contenir une étape optionnelle « Advisor » du « Nouveau poste » : `/advisor <modèle>` ou le réglage `advisorModel`, un modèle au moins aussi capable que le modèle principal, les plateformes non prises en charge, le fait que Claude décide de l'appeler et le coût (tokens ajoutés, héritage par les sous-agents). Aucune version minimale de Claude Code MUST être écrite.

#### Scenario: Étape générée
- **WHEN** un projet est généré avec le module `advisor` et la clé `advisor`
- **THEN** `docs/workflow.md` contient l'étape, `/advisor` sans argument pour voir ce qui est disponible, et aucune version minimale

### Requirement: Variables qui désactivent l'advisor
L'étape SHALL avertir de ne pas définir `DISABLE_TELEMETRY`, `DO_NOT_TRACK`, `DISABLE_GROWTHBOOK` ni `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, avec lesquels l'advisor reste désactivé, et préciser que la télémétrie d'OpenSpec et d'Archgate est un autre réglage.

#### Scenario: Avertissement généré
- **WHEN** un projet est généré avec le module `advisor` et la clé `advisor`
- **THEN** `docs/workflow.md` nomme les quatre variables sans prétendre que l'advisor se désactive « sans signal »

### Requirement: Aucun réglage écrit
Le plugin MUST NOT écrire `advisorModel` dans les réglages d'un projet généré, ni définir `DISABLE_TELEMETRY`, `DO_NOT_TRACK`, `DISABLE_GROWTHBOOK`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` ou `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` dans un fichier généré (hors l'avertissement de `docs/workflow.md`), conformément à ARCH-015.

#### Scenario: Réglages
- **WHEN** un projet est généré avec le module `advisor` et la clé `advisor`
- **THEN** `settings.json` ne contient ni `advisorModel` ni `DISABLE_TELEMETRY`, et aucun fichier généré, avec tous les modules, ne définit l'une de ces variables

### Requirement: Clé advisor
La configuration SHALL accepter une clé facultative `advisor` valant `true`, posée par la question de phase 0 du module. Elle est refusée sans le module `advisor` ou avec une autre valeur (code 1, aucun fichier écrit). `null` ou `false` la désactive : ni héritée du manifeste ni consignée. Elle est consignée au manifeste seulement quand elle est présente et héritée par `--update`.

#### Scenario: Clé présente
- **WHEN** `advisor` vaut `true` avec le module `advisor`
- **THEN** le manifeste consigne `advisor: true` et la consigne et l'étape sont générées

#### Scenario: Refus
- **WHEN** `advisor` vaut `"oui"`, ou `true` sans le module `advisor`
- **THEN** `scaffold.mjs` s'arrête avec le code 1 sans écrire de fichier

#### Scenario: Héritage et désactivation
- **WHEN** `--update` est lancé sans `advisor`, puis avec `advisor: null` ou `advisor: false`
- **THEN** la clé est d'abord conservée, puis retirée du manifeste avec la consigne et l'étape

#### Scenario: Retrait du module
- **WHEN** `--update` retire le module `advisor` alors que la clé est héritée
- **THEN** `scaffold.mjs` s'arrête avec le code 1 tant que `advisor: null` n'est pas aussi passé

### Requirement: Consigne d'appel dans les profils sonnet et haiku
Avec la clé `advisor`, chaque profil dont le modèle par défaut est `sonnet` ou `haiku` SHALL contenir la consigne de consulter l'advisor aux points de décision de son rôle, en précisant que le profil décide de l'appeler, que rien ne l'impose, et qu'il poursuit sans lui s'il est indisponible. Les profils `opus` (`architect`, `qa-engineer`) et `project-lead` MUST NOT la contenir.

#### Scenario: Profils concernés
- **WHEN** un projet est généré avec la clé `advisor` et les profils `product-owner`, `developer` et `business-analyst`
- **THEN** ces trois profils contiennent la consigne

#### Scenario: Profils non concernés
- **WHEN** le même projet est généré
- **THEN** `architect`, `qa-engineer` et `project-lead` ne mentionnent pas l'advisor

#### Scenario: Version anglaise
- **WHEN** un projet est généré avec la clé `advisor` et `docLanguage: "en"`
- **THEN** la consigne des profils et l'étape du Nouveau poste sont rédigées en anglais avec les mêmes contenus

### Requirement: Clé sans profil concerné
Quand la clé `advisor` vaut `true` sans profil de la famille sonnet ou haiku choisi (`product-owner`, `developer`, `business-analyst`, `acceptance-tester`, `scout`), `scaffold.mjs` SHALL porter un avertissement dans le rapport : aucun profil sonnet ou haiku ne reçoit la consigne et seule l'étape du « Nouveau poste » est générée.

#### Scenario: Aucun profil optionnel
- **WHEN** `advisor` vaut `true` sans `profiles`
- **THEN** le rapport porte l'avertissement et `docs/workflow.md` contient l'étape

#### Scenario: Seul second-opinion
- **WHEN** `advisor` vaut `true` avec `profiles` valant `["second-opinion"]`
- **THEN** le rapport porte l'avertissement

#### Scenario: Profils choisis
- **WHEN** `advisor` vaut `true` avec `profiles` contenant au moins un des cinq profils sonnet ou haiku
- **THEN** le rapport ne porte pas cet avertissement

### Requirement: Cohérence entre le modèle d'un profil et la consigne
Un test SHALL vérifier, sur les modèles français et anglais, que le bloc de consigne est présent dans tout profil dont le frontmatter déclare un modèle de la famille `sonnet` ou `haiku`, et absent de tout autre, y compris d'un profil sans `model`.

#### Scenario: Règle respectée
- **WHEN** les modèles de profils sont examinés
- **THEN** le bloc de consigne figure exactement dans les profils sonnet et haiku

### Requirement: Sans la clé ou sans le module
Sans la clé `advisor`, ou sans le module `advisor`, aucun profil ni `docs/workflow.md` MUST mentionner l'advisor, `/advisor`, `advisorModel` ni `DISABLE_TELEMETRY`, et `project-lead` SHALL rester complet (échelle d'arbitrage et garde-fous).

#### Scenario: Aucune mention
- **WHEN** un projet est généré avec le module `advisor` sans la clé, ou sans le module, en français ou en anglais
- **THEN** aucun profil ni `docs/workflow.md` ne mentionne l'advisor et l'échelle à cinq niveaux est présente
