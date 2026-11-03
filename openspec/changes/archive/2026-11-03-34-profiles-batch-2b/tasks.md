## 1. Générateur et hook

- [x] 1.1 `catalog.mjs` : deux noms dans `OPTIONAL_PROFILES`, `devops-engineer` dans `ADVISOR_PROFILES` ; `module.json` : fichiers `when`, question sur `profiles` mise à jour (huit noms) et nouvelle question sur `regulatedDomain` (le module passe de deux à trois questions)
- [x] 1.2 `scaffold.mjs` : clé `regulatedDomain` (règle de la décision D1, `null` seul désactive, héritage, exigence du module, dépendance du profil, avertissement sans profil, paramètre) ; `state.mjs` (`ANSWER_KEYS`)
- [x] 1.3 `profile-guard.mjs` (français et anglais) : deux entrées de la table

## 2. Modèles

- [x] 2.1 `devops-engineer` (blocs `github`, `release`, `openspec`, `archgate`, `advisor-on`) et `compliance-reviewer` (blocs `openspec`, `archgate`, domaine dans le corps), français et anglais
- [x] 2.2 `project-lead` : délégation et traçabilité gardée par `traceability-checker` (français et anglais)

## 3. Tests

- [x] 3.1 `scaffold.test.mjs` : génération sur choix, dépendance, valeurs de `regulatedDomain` (valides et refusées dont NFD, espaces seuls, `false`, nombre), `null`, héritage, retrait du module, avertissement, valeurs de départ, outils, consigne advisor, modules absents, domaine absent du frontmatter, délégation, anglais ; mise à jour du compte de questions (`apQuestions.length`), de la question aux huit noms, de `PROFILES` et `TABLE` du test de frontmatter
- [x] 3.2 `profile-guard.test.mjs` : lecture seule et lancements refusés pour les deux profils ; test des commandes entre accents graves des modèles acceptées par `read-only-bash.mjs`
- [x] 3.3 `state.test.mjs` : l'état de reprise conserve `regulatedDomain`
- [x] 3.4 Matrice : listes `profiles` et `regulatedDomain` (dont un domaine à ponctuation), instantanés relus

## 4. Documentation

- [x] 4.1 `SKILL.md` (question du domaine, avertissement de visibilité), `bootstrap-config.md`, `pitfalls.md` (domaine visible dans le dépôt, pas un juriste, recouvrement avec `traceability-checker`, `devops-engineer` sans `github`), table des valeurs
- [x] 4.2 ARCH-014 amendé, allégé et `files:` étendu ; ARCH-015 (valeurs, `compliance-reviewer` parmi les plus coûteux) ; arc42 (5, 8, 11) via `arc42-keeper`
- [x] 4.3 `advisor-module` : énumération des profils opus de l'exigence de consigne corrigée

## 5. Validation

- [x] 5.1 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `openspec validate --all --strict`
