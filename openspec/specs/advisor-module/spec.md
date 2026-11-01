# advisor-module Specification

## Purpose
Définir le module optionnel `advisor` : la consigne d'appel de l'advisor de Claude Code dans `project-lead` et l'étape optionnelle du « Nouveau poste », sans réglage écrit par le plugin.

## Requirements

### Requirement: Module advisor
Le catalogue SHALL contenir un module `advisor` qui requiert `agent-profiles` et vaut `default: false`, sans fichier propre. Sa description SHALL présenter l'advisor comme expérimental, payant et réglé par l'utilisateur, sans que le plugin écrive de réglage ; il ne déclare pas de question de phase 0, le choix du module en tenant lieu. Sélectionné sans `agent-profiles`, `scaffold.mjs` MUST s'arrêter avec le code 1.

#### Scenario: Module listé
- **WHEN** `scaffold.mjs --list-modules` est lancé
- **THEN** le module `advisor` apparaît, par défaut non, avec une description qui parle de fonction expérimentale, payante et de réglage utilisateur, et sans question

#### Scenario: Sans agent-profiles
- **WHEN** `advisor` est sélectionné sans `agent-profiles`
- **THEN** `scaffold.mjs` s'arrête avec le code 1 en nommant le module requis

### Requirement: Consigne d'appel dans project-lead
Avec `advisor`, `project-lead.md` SHALL contenir une section Advisor qui demande de consulter l'advisor avant de figer un plan, au deuxième échec identique d'un test ou d'une compilation et avant de déclarer une tâche terminée, et d'arbitrer le niveau 3 après son avis. Elle SHALL préciser que la consigne est une incitation sans garantie.

#### Scenario: Section générée
- **WHEN** un projet est généré avec `advisor`
- **THEN** `project-lead.md` contient la section Advisor avec les trois moments et la précision d'incitation

### Requirement: Limites de l'advisor dans project-lead
La section Advisor SHALL préciser que, au niveau 3, l'avis ne lève pas toujours le doute (alors l'utilisateur est consulté), et qu'au niveau 4 il ne remplace pas l'utilisateur, l'advisor voyant toute la conversation sans être indépendant. Quand l'advisor est indisponible (non configuré, modèle moins capable, usage en équipe non documenté), `project-lead` SHALL poursuivre sans lui en le disant.

#### Scenario: Indépendance et repli
- **WHEN** un projet est généré avec `advisor`
- **THEN** `project-lead.md` dit que l'avis ne remplace pas l'utilisateur au niveau 4, qu'il consulte l'utilisateur au niveau 3 si l'avis ne lève pas le doute, et prévoit de poursuivre sans lui

### Requirement: Étape du Nouveau poste
Avec `advisor`, `docs/workflow.md` SHALL contenir une étape optionnelle « Advisor » du « Nouveau poste » : `/advisor <modèle>` ou le réglage `advisorModel`, un modèle au moins aussi capable que le modèle principal, les plateformes non prises en charge, le fait que Claude décide de l'appeler et le coût (tokens ajoutés, héritage par les sous-agents). Aucune version minimale de Claude Code MUST être écrite.

#### Scenario: Étape générée
- **WHEN** un projet est généré avec `advisor`
- **THEN** `docs/workflow.md` contient l'étape, `/advisor` sans argument pour voir ce qui est disponible, et aucune version minimale

### Requirement: Variables qui désactivent l'advisor
L'étape SHALL avertir de ne pas définir `DISABLE_TELEMETRY`, `DO_NOT_TRACK`, `DISABLE_GROWTHBOOK` ni `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, avec lesquels l'advisor reste désactivé, et préciser que la télémétrie d'OpenSpec et d'Archgate est un autre réglage.

#### Scenario: Avertissement généré
- **WHEN** un projet est généré avec `advisor`
- **THEN** `docs/workflow.md` nomme les quatre variables sans prétendre que l'advisor se désactive « sans signal »

### Requirement: Aucun réglage écrit
Le plugin MUST NOT écrire `advisorModel` dans les réglages d'un projet généré, ni définir `DISABLE_TELEMETRY`, `DO_NOT_TRACK`, `DISABLE_GROWTHBOOK`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` ou `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` dans un fichier généré (hors l'avertissement de `docs/workflow.md`).

#### Scenario: Réglages
- **WHEN** un projet est généré avec `advisor`
- **THEN** `settings.json` ne contient ni `advisorModel` ni `DISABLE_TELEMETRY`, et aucun fichier généré, avec tous les modules, ne définit l'une de ces variables

### Requirement: Sans le module
Sans `advisor`, `project-lead.md` et `docs/workflow.md` MUST NOT mentionner l'advisor, `/advisor`, `advisorModel` ni `DISABLE_TELEMETRY`, et `project-lead` SHALL rester complet (échelle d'arbitrage et garde-fous).

#### Scenario: Aucune mention
- **WHEN** un projet est généré avec `agent-profiles` sans `advisor`, en français ou en anglais
- **THEN** les deux fichiers ne contiennent aucune mention de l'advisor et l'échelle à cinq niveaux est présente

#### Scenario: Version anglaise
- **WHEN** un projet est généré avec `advisor` et `docLanguage: "en"`
- **THEN** la section Advisor et l'étape du Nouveau poste sont rédigées en anglais avec les mêmes contenus
