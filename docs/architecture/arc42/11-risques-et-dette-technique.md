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
| Teammate nommé autrement que son profil : non borné | Moyenne | Moyen | Convention de nommage ; consigné dans `pitfalls.md` ([ARCH-011](../adrs/ARCH-011-profils-d-agents-bornes-par-un-hook-unique.md)) |
| Profil intégré `Explore` : reçoit tout l'outillage en équipe, non borné | Moyenne | Moyen | Hors périmètre du hook ; consigné dans `pitfalls.md` ([ARCH-011](../adrs/ARCH-011-profils-d-agents-bornes-par-un-hook-unique.md)) |
| Agent lançable (`arc42-keeper`, `spec-reviewer`, `architecture-explorer`) échappant au bornage | Faible | Moyen | Ces agents ont leurs propres bornes dans la table du hook et ne dépendent plus de leur hook de frontmatter ; défaut fermé pour tout agent ou skill hors table ([ARCH-012](../adrs/ARCH-012-agents-skills-et-commandes-lancables-par-un-profil.md)) |
| Hook non constaté sur l'outil `Agent` d'un teammate (constaté pour les autres outils) | Faible | Moyen | À vérifier en session d'équipe ; le hook couvre aussi l'ancien nom d'outil `Task` ; convention de nommage, consigné dans `pitfalls.md` ([ARCH-012](../adrs/ARCH-012-agents-skills-et-commandes-lancables-par-un-profil.md), [ARCH-011](../adrs/ARCH-011-profils-d-agents-bornes-par-un-hook-unique.md)) |
| Écrire puis exécuter : un profil écrit un fichier exécutable dans son périmètre (`tests/x.test.mjs`, règle `*.rules.ts`) puis le fait lancer par `run-checks.mjs` ou `archgate check` | Moyenne | Moyen | Le bornage est un garde-fou, pas un bac à sable ; relecture humaine des changements ([ARCH-011](../adrs/ARCH-011-profils-d-agents-bornes-par-un-hook-unique.md)) |
| Teammate isolé dans un worktree : écritures légitimes refusées (chemin calculé depuis `CLAUDE_PROJECT_DIR`) | Moyenne | Faible | Refus à tort, sans risque ; consigné dans `pitfalls.md` ([ARCH-011](../adrs/ARCH-011-profils-d-agents-bornes-par-un-hook-unique.md)) |
| Casse (`Tests/` refusé), liens et jonctions non résolus | Faible | Faible | Refus à tort sans risque, ou hors modèle de menace ([ARCH-011](../adrs/ARCH-011-profils-d-agents-bornes-par-un-hook-unique.md)) |
| Coût du hook : un `node` par écriture ou commande shell de la session, un second pour une commande de profil hors motifs | Haute | Faible | Accepté, quelques dizaines de millisecondes ([ARCH-011](../adrs/ARCH-011-profils-d-agents-bornes-par-un-hook-unique.md)) |
| Retrait du module `agent-profiles` : le hook déclaré dans `settings.json` et les fichiers générés restent ; sans la table, le hook ne borne plus rien | Faible | Faible | Supprimer à la main ([ARCH-011](../adrs/ARCH-011-profils-d-agents-bornes-par-un-hook-unique.md)) |
| Changement futur du contenu de `agent_type` : la correspondance profil-table casse | Faible | Haut | Tests de contrat du module ([ARCH-011](../adrs/ARCH-011-profils-d-agents-bornes-par-un-hook-unique.md)) |
| Réglage `agent` (`mainAgent`) appliqué à toutes les sessions du clone ; `project-lead` écrit lui-même le code sans profil `developer`, sans garde mécanique contre l'auto-relecture | Moyenne | Moyen | Réglage facultatif et réversible (le retirer redonne l'agent par défaut) ; relecture confiée à `qa-engineer` par consigne ([ARCH-013](../adrs/ARCH-013-chef-de-projet-comme-agent-principal-active-par-mainagent.md)) |

- Quels risques pèsent sur les objectifs de qualité ?
- Quelle dette est acceptée consciemment, et jusqu'à quand ?

_À rédiger._
