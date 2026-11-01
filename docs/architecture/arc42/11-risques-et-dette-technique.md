# 11. Risques et dette technique

> Les risques connus et la dette technique, par ordre de priorité.

| Risque / dette | Probabilité | Impact | Mesure envisagée |
|---|---|---|---|
| Outil PowerShell ou terminal personnel en mode `local` : `openspec` et `archgate` introuvables (`node_modules/.bin` absent du `PATH`) | Moyenne | Faible | `npm run claude` ou `npx` ; le hook de session couvre l'outil Bash, le hook qualité, la CI et l'audit ajoutent déjà `node_modules/.bin` au `PATH` ([ARCH-007](../adrs/ARCH-007-installation-des-cli-d-outillage.md)) |
| Mise à jour manuelle des `devDependencies` en mode `local` (Dependabot ne couvre que `github-actions`) | Moyenne | Faible | `npm install --save-exact` ([ARCH-007](../adrs/ARCH-007-installation-des-cli-d-outillage.md)) |
| `package.json` existant conservé tel quel : `devDependencies` à ajouter à la main | Moyenne | Faible | Documenté dans l'ADR |
| Deux versions de chaque modèle à maintenir (français et langue traduite) | Haute | Moyen | Modifier les deux dans la même PR ; tests de parité ([ARCH-008](../adrs/ARCH-008-modeles-de-documentation-par-langue.md)) |
| Écart de sens entre deux versions, ou français sans accent dans un modèle sans version traduite : non détectable par les tests | Moyenne | Moyen | Relecture en PR ([ARCH-008](../adrs/ARCH-008-modeles-de-documentation-par-langue.md)) |
| Langue autre que `fr` et celles des `templates.*` du module `core` refusée (le skill ne traduit plus) | Moyenne | Faible | Ajouter un dossier `templates.<code>/` ([ARCH-008](../adrs/ARCH-008-modeles-de-documentation-par-langue.md)) |
| Étape non vérifiable marquée faite à tort : crue par la reprise | Moyenne | Moyen | L'audit de la phase 3 reste le contrôle final ([ARCH-009](../adrs/ARCH-009-etat-de-reprise-et-journal-des-effets.md)) |
| Preuves antérieures au bootstrap (`.git`, manifeste existants) : déduction faussée sans état | Moyenne | Faible | Lire `resume` et ses incohérences avant de poursuivre ([ARCH-009](../adrs/ARCH-009-etat-de-reprise-et-journal-des-effets.md)) |
| Journal des effets limité à ce que le skill déclare, non recoupé par l'audit | Moyenne | Faible | Accepté ; `effect` avant toute action globale ([ARCH-009](../adrs/ARCH-009-etat-de-reprise-et-journal-des-effets.md)) |
| Fichier mal rangé dans un module : non détecté par la génération (le chemin reste le même) | Moyenne | Faible | `scaffold.mjs --list-modules` et relecture en PR ([ARCH-010](../adrs/ARCH-010-modules-auto-decrits.md)) |
| Modèle localisé oublié : retombe sur le français sans erreur | Moyenne | Moyen | Combinaisons `full` et `full-en` de la matrice et test de parité ([ARCH-010](../adrs/ARCH-010-modules-auto-decrits.md)) |
| Dette : permissions de `settings.json`, étapes de `state.mjs`, contrôles de `audit.mjs`, migrations et blocs `@@module` transverses restent codés hors du dossier d'un module ; réponses aux `questions` non consommées par un schéma de configuration | Haute | Moyen | Acceptée ; un module ne peut pas encore tout porter seul ([ARCH-010](../adrs/ARCH-010-modules-auto-decrits.md)) |

- Quels risques pèsent sur les objectifs de qualité ?
- Quelle dette est acceptée consciemment, et jusqu'à quand ?

_À rédiger._
