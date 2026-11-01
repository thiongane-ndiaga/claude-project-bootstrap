## ADDED Requirements

### Requirement: Validation du frontmatter des agents générés
Un test SHALL parcourir tous les fichiers `.claude/agents/*.md` d'une génération avec tous les modules et tous les profils optionnels, en français et en anglais, et n'examiner que les clés de premier niveau du frontmatter. Il SHALL échouer si une clé n'appartient pas à la liste documentée, si `effort` n'est pas `low`, `medium`, `high`, `xhigh` ou `max`, ou si `maxTurns` n'est pas un entier strictement positif.

#### Scenario: Champ inconnu
- **WHEN** la fonction de validation reçoit un frontmatter déclarant `effrot: high`
- **THEN** elle échoue en nommant le champ

#### Scenario: Clés imbriquées des hooks
- **WHEN** un agent déclare `hooks` avec des clés imbriquées (`PreToolUse`, `matcher`, `command`)
- **THEN** seules les clés de premier niveau sont examinées et le test passe

#### Scenario: Génération conforme
- **WHEN** tous les modules et les profils optionnels sont générés
- **THEN** le test passe en français et en anglais

### Requirement: Nommage des fichiers d'agents
Le même test SHALL échouer si le nom d'un fichier d'agent n'est pas en minuscules, chiffres et tirets, ou si le `name` du frontmatter diffère du nom de fichier. Les cas négatifs SHALL passer par une fonction de validation appelée sur un texte et un nom fournis, non sur des fichiers écrits.

#### Scenario: Nom de fichier non conforme
- **WHEN** la fonction reçoit le nom `Developer.md` ou `qa_engineer.md`
- **THEN** elle échoue en nommant le fichier

#### Scenario: Nom différent du fichier
- **WHEN** la fonction reçoit `developer.md` avec `name: dev`
- **THEN** elle échoue en nommant le fichier
