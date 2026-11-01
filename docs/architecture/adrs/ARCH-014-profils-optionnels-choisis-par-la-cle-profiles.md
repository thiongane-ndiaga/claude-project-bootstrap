---
id: ARCH-014
title: Profils optionnels choisis par la clé profiles
domain: architecture
rules: false
files: ["skills/project-bootstrap/assets/modules/agent-profiles/**"]
---

# Profils optionnels choisis par la clé profiles

## Statut

Accepté.

## Context

Le module `agent-profiles` livre trois profils fixes (`architect`, `qa-engineer`, `project-lead`). D'autres rôles sont utiles selon le projet (`product-owner`, `developer`, `business-analyst`, puis `acceptance-tester`, `devops-engineer`, `scout`, `compliance-reviewer`, `second-opinion`) mais ne doivent exister que s'ils sont choisis. Le format de module (ARCH-010) décrit un fichier par module ; il n'a pas de sélection par fichier.

## Decision

1. **Clé de configuration `profiles`** : liste de noms de profils optionnels (`business-analyst`, `developer`, `product-owner` à ce stade). Seuls les profils listés sont générés. Absente (défaut), aucun profil optionnel. `[]` ou `null` la désactive : ni héritée du manifeste ni consignée. Un nom inconnu, une valeur qui n'est pas une liste, ou la clé sans le module `agent-profiles` fait échouer `scaffold.mjs` (code 1). La liste est consignée au manifeste triée et sans doublon, et héritée par `--update`.
2. **Un pseudo-module par profil** : `profile-<nom>` est actif quand le profil est listé ; `module.json` le cite dans le `when` du fichier du profil. Le catalogue valide ces noms comme les autres pseudo-modules.
3. **Dépendances d'un profil** : `business-analyst` exige le module `openspec`.
4. **Bornes de chaque profil dans la table du hook** (ARCH-011, ARCH-012) : `product-owner` ne peut écrire nulle part et son shell est en lecture seule ; `business-analyst` n'écrit que dans `openspec/changes/`, lance `openspec new change` et `openspec instructions` et les skills `opsx:propose` et `opsx:update` ; `developer` écrit partout sauf dans les dossiers de gouvernance (liste d'exclusion `writeExcept`). Aucun n'a l'outil `Agent`.
5. **Liste d'exclusion de `developer`** : dossiers `.archgate/`, `.bootstrap/`, `.claude/`, `.git/`, `.githooks/`, `.github/`, `docs/architecture/`, `openspec/changes/archive/`, `openspec/schemas/`, `openspec/specs/` ; fichiers `CLAUDE.md`, `AGENTS.md`, `docs/workflow.md`, `openspec/config.yaml`, `openspec/config.yml`, `release-please-config.json`, `.release-please-manifest.json`. Une entrée terminée par `/` est un dossier, les autres sont des fichiers exacts. `openspec/changes/` reste ouvert pour cocher les tâches. La comparaison ignore la casse, ainsi que les points et espaces finals d'un segment (Windows).
6. **Chemin réel** : pour tous les profils de la table, le hook compare le chemin réel de l'écriture (ancêtre existant le plus long résolu : liens, jonctions, noms courts 8.3, casse réelle) et refuse un segment contenant `:` (flux NTFS). Un chemin hors du projet est refusé.
7. **Shell de `developer` non borné** : la pile n'est pas choisie, donc ni commandes de build ni de test connues. Le bornage des dossiers de gouvernance vaut pour `Write`, `Edit`, `MultiEdit` et `NotebookEdit` ; la ligne de commande peut y écrire. Le profil lui interdit de publier (push, issue, PR, release) et de modifier autre chose que `tasks.md` dans un changement.
8. **Formes des skills OpenSpec** : les commandes de `business-analyst` acceptent les guillemets autour des noms (`openspec new change "<nom>"`) et `openspec context`, comme les skills OpenSpec les lancent.
9. **Désactivation** : les fichiers des profils retirés sont signalés (`retired`) et sortent du manifeste, mais restent sur le disque ; `project-lead` délègue tant qu'ils existent.
10. **Questions de phase 0** : le module déclare la question sur `profiles` ; les profils suivants s'ajoutent avec leurs lots.

## Do's and Don'ts

### Do

- Ajouter un profil optionnel par son fichier, son pseudo-module, sa ligne dans `OPTIONAL_PROFILES` et son entrée dans la table du hook.
- Tester chaque profil avec les cas de refus de sa table.

### Don't

- Ne pas donner l'outil `Agent` à un profil optionnel.
- Ne pas compter sur la liste d'exclusion de `developer` comme sur une frontière de sécurité.

## Consequences

### Positive

- Un projet choisit ses rôles profil par profil ; aucun fichier de profil n'est écrit sans l'avoir demandé.
- `project-lead` délègue à `developer` et `business-analyst` dès qu'ils existent, sans autre réglage.

### Negative

- Une liste d'exclusion est plus faible qu'une liste d'autorisation : les dossiers de gouvernance doivent être tenus à jour dans la table.
- Une entrée de table et un pseudo-module par profil à maintenir.

### Risks

- Le shell de `developer` peut écrire dans les dossiers de gouvernance. La relecture par `qa-engineer` et par l'humain reste la garantie.
- Un nouveau dossier de gouvernance ajouté par un module n'est pas protégé tant qu'il n'est pas dans la liste.
- Les entrées de table `developer`, `product-owner` et `business-analyst` existent même sans la clé `profiles` : un agent du projet qui porte l'un de ces noms est borné sans l'avoir demandé.
- Avec `keep` sur `profile-guard.mjs`, les profils choisis ne sont bornés que par la version du projet ; le rapport l'avertit.
- Un teammate `developer` isolé dans un worktree écrit sous `.claude/worktrees/` et se voit tout refuser.

## Compliance and Enforcement

Tests du module (`tests/profile-guard.test.mjs`) pour les entrées de table et la liste d'exclusion ; tests de génération pour la clé `profiles` (liste, doublons, refus, héritage, désactivation) et pour les profils ; instantanés de la matrice. Pas de règle Archgate.

## References

- Issue #34 ; changement OpenSpec `34-optional-profiles-batch1`
- ARCH-010 (modules auto-décrits), ARCH-011 (bornage par un hook unique), ARCH-012 (agents, skills et commandes lançables), ARCH-013 (chef de projet)
