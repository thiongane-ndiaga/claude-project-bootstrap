## MODIFIED Requirements

### Requirement: Clé profiles
La configuration SHALL accepter une clé facultative `profiles`, liste de noms parmi `acceptance-tester`, `business-analyst`, `compliance-reviewer`, `developer`, `devops-engineer`, `product-owner`, `scout` et `second-opinion`. Seuls les profils listés SHALL être générés dans `.claude/agents/` ; absente, aucun profil optionnel. Un nom inconnu, une valeur qui n'est pas une liste, ou la clé sans le module `agent-profiles` MUST faire échouer `scaffold.mjs`. Les dépendances des profils sont une exigence à part.

#### Scenario: Clé absente
- **WHEN** `profiles` est absent
- **THEN** aucun profil optionnel n'est généré et le manifeste ne contient pas `profiles`

#### Scenario: Profils listés
- **WHEN** `profiles` vaut `["product-owner", "developer", "business-analyst", "developer"]`
- **THEN** les trois profils sont générés et le manifeste consigne la liste triée sans doublon

#### Scenario: Nouveaux profils
- **WHEN** `profiles` vaut `["second-opinion", "scout", "acceptance-tester"]`
- **THEN** les trois profils sont générés et le manifeste consigne la liste triée

#### Scenario: Profils du lot 2b
- **WHEN** `profiles` vaut `["devops-engineer"]`
- **THEN** seul `devops-engineer` est généré

#### Scenario: Refus
- **WHEN** `profiles` contient un nom inconnu, n'est pas une liste, ou est donné sans `agent-profiles`
- **THEN** `scaffold.mjs` s'arrête avec le code 1 sans écrire de fichier

### Requirement: Question de phase 0 sur les profils optionnels
Le module `agent-profiles` SHALL déclarer, en plus de la question sur l'agent principal, une question de phase 0 sur les profils optionnels à générer (clé `profiles`), qui cite les huit profils, les dépendances de `business-analyst` et de `compliance-reviewer` et le défaut : aucun. Il SHALL déclarer en plus une question sur le domaine réglementé (clé `regulatedDomain`).

#### Scenario: Question listée
- **WHEN** `scaffold.mjs --list-modules` est lancé
- **THEN** le module `agent-profiles` porte trois questions, dont une citant `profiles`, les huit noms et le défaut aucun, et une citant `regulatedDomain` et le défaut non

### Requirement: Valeurs de départ par agent
Les valeurs SHALL être, dans l'ordre `model`, `effort`, `maxTurns` : `architect` opus, high, 40 ; `qa-engineer` opus, high, 40 ; `spec-reviewer` opus, high, 30 ; `architecture-explorer` opus, high, 40 ; `second-opinion` opus, high, 30 ; `compliance-reviewer` opus, high, 30. Les agents sonnet et haiku ont leur exigence propre. Les valeurs SHALL être identiques en français et en anglais.

#### Scenario: Table des valeurs
- **WHEN** les agents sont générés avec `docLanguage: "fr"`
- **THEN** chacun porte le triplet de la table

#### Scenario: Version anglaise
- **WHEN** les agents sont générés avec `docLanguage: "en"`
- **THEN** chacun porte le même triplet

### Requirement: Valeurs de départ des agents sonnet et haiku
Les valeurs SHALL être, dans l'ordre `model`, `effort`, `maxTurns` : `developer` sonnet, high, 60 ; `business-analyst` sonnet, high, 40 ; `product-owner` sonnet, medium, 20 ; `acceptance-tester` sonnet, medium, 25 ; `devops-engineer` sonnet, medium, 25 ; `arc42-keeper` sonnet, medium, 30 ; `traceability-checker` sonnet, medium, 25 ; `scout` haiku, medium, 20.

#### Scenario: Table des valeurs sonnet et haiku
- **WHEN** les agents sont générés
- **THEN** chacun de ces agents porte son triplet

### Requirement: Cohérence avec la consigne de l'advisor
La règle de présence de la consigne de l'advisor SHALL continuer de se fonder sur `model:` : le bloc reste présent exactement dans les profils du module `agent-profiles` dont le modèle est de la famille `sonnet` ou `haiku`.

#### Scenario: Valeurs de départ
- **WHEN** les agents sont générés avec la clé `advisor` et tous les profils optionnels
- **THEN** la consigne figure dans `product-owner`, `developer`, `business-analyst`, `acceptance-tester`, `devops-engineer` et `scout`, et dans aucun autre agent

## ADDED Requirements

### Requirement: Dépendances des profils optionnels
`business-analyst` SHALL exiger le module `openspec`. `compliance-reviewer` SHALL exiger la clé `regulatedDomain`. Un profil dont la dépendance manque MUST faire échouer `scaffold.mjs` (code 1, aucun fichier écrit).

#### Scenario: business-analyst sans openspec
- **WHEN** `profiles` liste `business-analyst` sans le module `openspec`
- **THEN** `scaffold.mjs` s'arrête avec le code 1

#### Scenario: compliance-reviewer sans domaine
- **WHEN** `profiles` liste `compliance-reviewer` sans `regulatedDomain`
- **THEN** `scaffold.mjs` s'arrête avec le code 1 en nommant la clé manquante

### Requirement: Clé regulatedDomain
La configuration SHALL accepter une clé facultative `regulatedDomain`, texte libre posé par la question de phase 0 du module. Après normalisation NFC et retrait des espaces U+0020 de début et de fin, la valeur MUST faire de 1 à 120 points de code, contenir au moins une lettre ou un chiffre et n'avoir que des lettres, marques, chiffres, espaces U+0020 et la ponctuation `,.;:'’()/&_-`.

#### Scenario: Domaine valide
- **WHEN** `regulatedDomain` vaut `RGPD, paiement` avec `compliance-reviewer` listé
- **THEN** le profil est généré et nomme ce domaine

### Requirement: Valeurs refusées de regulatedDomain
Toute autre valeur que celle de l'exigence précédente (non-texte, `false`, liste, nombre) MUST faire échouer `scaffold.mjs` (code 1, aucun fichier écrit), de même que la clé donnée sans le module `agent-profiles`.

#### Scenario: Valeur refusée
- **WHEN** `regulatedDomain` est vide, faite d'espaces ou de ponctuation seule, dépasse 120 points de code, contient un retour à la ligne, une tabulation, un guillemet droit, une accolade, un accent grave ou `@`, ou n'est pas un texte
- **THEN** `scaffold.mjs` s'arrête avec le code 1 sans écrire de fichier

#### Scenario: Clé sans le module
- **WHEN** `regulatedDomain` est donnée sans le module `agent-profiles`
- **THEN** `scaffold.mjs` s'arrête avec le code 1

### Requirement: Emploi de regulatedDomain
Le texte de `regulatedDomain` SHALL être injecté uniquement dans le corps du modèle de `compliance-reviewer`, jamais dans un frontmatter ni dans un autre fichier généré. Le plugin MUST NOT en déduire d'exigence. Le texte est visible dans le dépôt (modèle du profil et manifeste).

#### Scenario: Emplacement
- **WHEN** `compliance-reviewer` est généré avec un domaine
- **THEN** le domaine figure dans le corps du profil, pas dans son frontmatter, et dans aucun autre fichier hors manifeste

### Requirement: Traitement de la réponse sur le domaine par le skill
`SKILL.md` SHALL demander de poser la question du domaine réglementé en phase 0 quand `compliance-reviewer` est choisi, de prévenir que le texte est visible dans le dépôt, et de reporter la valeur dans `bootstrap.json` (`regulatedDomain`). Il SHALL demander de ne pas proposer `compliance-reviewer` quand le projet ne déclare aucun domaine.

#### Scenario: Profil sans domaine
- **WHEN** l'utilisateur choisit `compliance-reviewer` sans domaine
- **THEN** le skill demande le domaine avant de lancer le générateur

### Requirement: Désactivation et héritage de regulatedDomain
`regulatedDomain: null` SHALL désactiver la clé : elle n'est ni héritée du manifeste ni consignée. Sans cette valeur, `--update` SHALL conserver la clé du manifeste. Retirer la clé alors que le manifeste liste `compliance-reviewer` MUST faire échouer `scaffold.mjs`.

#### Scenario: Héritage
- **WHEN** `--update` est lancé sans `regulatedDomain` sur un projet dont le manifeste la consigne
- **THEN** la valeur est conservée et le profil reste généré

#### Scenario: Désactivation avec le profil hérité
- **WHEN** `--update` est lancé avec `regulatedDomain: null` alors que `compliance-reviewer` est hérité
- **THEN** `scaffold.mjs` s'arrête avec le code 1

#### Scenario: Désactivation sans le profil
- **WHEN** `--update` est lancé avec `regulatedDomain: null` sans `compliance-reviewer`
- **THEN** la clé quitte le manifeste

#### Scenario: Retrait du module
- **WHEN** `--update` retire `agent-profiles` avec `profiles: []` alors que `regulatedDomain` est héritée
- **THEN** `scaffold.mjs` s'arrête avec le code 1 tant que `regulatedDomain: null` n'est pas aussi passé

#### Scenario: Reprise
- **WHEN** une génération est interrompue puis reprise après une réponse sur `regulatedDomain`
- **THEN** l'état de reprise conserve la valeur

### Requirement: Clé regulatedDomain sans profil
Quand `regulatedDomain` est présente sans `compliance-reviewer` dans `profiles`, la clé SHALL n'avoir aucun effet et le rapport de `scaffold.mjs` SHALL porter un avertissement.

#### Scenario: Avertissement
- **WHEN** `regulatedDomain` vaut `RGPD` et `profiles` ne liste pas `compliance-reviewer`
- **THEN** aucun fichier de `compliance-reviewer` n'est généré et le rapport porte l'avertissement

### Requirement: Profil compliance-reviewer
`compliance-reviewer` SHALL relire les specs et les ADR face aux exigences du domaine déclaré, citer pour chaque constat la source (document et passage), distinguer l'exigence connue de l'hypothèse, et rappeler qu'il ne remplace pas un juriste. Il MUST NOT écrire de fichier : la table du hook lui refuse l'écriture et limite son shell à la lecture.

#### Scenario: Lecture seule
- **WHEN** `agent_type` vaut `compliance-reviewer`, écrit un fichier ou lance `rm x`
- **THEN** le hook se termine avec le code 2 ; `git log` est permis

#### Scenario: Modèle du profil
- **WHEN** `compliance-reviewer` est généré avec `regulatedDomain` valant `RGPD`
- **THEN** son modèle nomme `RGPD`, demande une source par constat et rappelle qu'il ne remplace pas un juriste

#### Scenario: Modules absents
- **WHEN** `compliance-reviewer` est généré sans les modules `openspec` et `archgate`
- **THEN** son modèle ne mentionne ni `openspec` ni `archgate` et cite les documents du dépôt

### Requirement: Profil devops-engineer
`devops-engineer` SHALL lire l'état de la CI, des PR et des releases, et rendre des constats avec preuves ; la traçabilité issue, changement, PR et ADR reste à `traceability-checker` tant que celui-ci existe. Il MUST NOT écrire de fichier ni publier : les écritures passent par `project-lead`. La table du hook lui refuse l'écriture et limite son shell à la lecture.

#### Scenario: Lecture seule
- **WHEN** `agent_type` vaut `devops-engineer`, écrit un fichier ou lance `rm x`
- **THEN** le hook se termine avec le code 2 ; `gh pr checks 3` et `git log` sont permis

#### Scenario: Modules absents
- **WHEN** `devops-engineer` est généré sans les modules `github`, `release`, `openspec` et `archgate`
- **THEN** son modèle ne mentionne ni `gh`, ni release-please, ni `openspec`, ni `archgate`

### Requirement: Outils et droits des profils du lot 2b
`devops-engineer` et `compliance-reviewer` SHALL déclarer `Read, Glob, Grep, Bash` sans `Write`, `Edit`, `Agent` ni `Skill`. Leurs entrées de la table du hook SHALL n'accorder ni écriture, ni commande supplémentaire, ni lancement d'agent ou de skill.

#### Scenario: Lancements refusés
- **WHEN** `agent_type` vaut l'un de ces deux profils et lance un agent ou un skill
- **THEN** le hook se termine avec le code 2

### Requirement: Délégation de project-lead aux profils du lot 2b
La consigne de `project-lead` SHALL déléguer la lecture de la CI et de la livraison à `devops-engineer` et la relecture réglementaire à `compliance-reviewer`, seulement si ces profils existent dans `.claude/agents/`, et garder la traçabilité à `traceability-checker` quand il existe.

#### Scenario: Consigne de délégation
- **WHEN** `project-lead` est généré
- **THEN** sa consigne cite les deux profils conditionnés à leur présence dans `.claude/agents/`
