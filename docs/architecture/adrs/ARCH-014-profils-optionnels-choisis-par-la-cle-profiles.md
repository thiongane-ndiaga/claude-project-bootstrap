---
id: ARCH-014
title: Profils optionnels choisis par la clé profiles
domain: architecture
rules: false
files: ["skills/project-bootstrap/assets/modules/agent-profiles/**", "skills/project-bootstrap/scripts/scaffold.mjs", "skills/project-bootstrap/scripts/catalog.mjs", "skills/project-bootstrap/scripts/state.mjs"]
---

# Profils optionnels choisis par la clé profiles

## Statut

Accepté.

## Context

Le module `agent-profiles` livre trois profils fixes (`architect`, `qa-engineer`, `project-lead`). D'autres rôles sont utiles selon le projet mais ne doivent exister que s'ils sont choisis. Le format de module (ARCH-010) décrit un fichier par module ; il n'a pas de sélection par fichier.

## Decision

1. **Clé `profiles`** : liste de noms de profils optionnels, définie par `OPTIONAL_PROFILES` du catalogue. Seuls les profils listés sont générés. Absente (défaut), aucun. `[]` ou `null` la désactive : ni héritée du manifeste ni consignée. Un nom inconnu, une valeur qui n'est pas une liste, ou la clé sans le module `agent-profiles` fait échouer `scaffold.mjs` (code 1). Consignée triée sans doublon, héritée par `--update`.
2. **Un pseudo-module par profil** : `profile-<nom>` est actif quand le profil est listé ; `module.json` le cite dans le `when` du fichier du profil.
3. **Dépendances** : `business-analyst` exige le module `openspec` ; `compliance-reviewer` exige la clé `regulatedDomain`, texte libre posé par une question de phase 0, validé par liste blanche (le texte entre dans le corps du modèle), jamais injecté dans un frontmatter. Sans le profil, la clé est sans effet et le rapport avertit.
4. **Bornes dans la table du hook** (ARCH-011, ARCH-012) : les profils en lecture seule n'écrivent nulle part et leur shell est celui de `read-only-bash.mjs` ; `business-analyst` n'écrit que dans `openspec/changes/` ; `developer` écrit partout sauf dans une liste d'exclusion de dossiers de gouvernance, avec un shell non borné (la pile n'est pas choisie). Aucun profil optionnel n'a l'outil `Agent`. Le détail est dans la spec `agent-profiles`.
5. **Chemin réel** : pour tous les profils, le hook compare le chemin réel de l'écriture (liens, jonctions, noms courts 8.3, casse) et refuse un segment contenant `:` ; un chemin hors du projet est refusé.
6. **Désactivation** : les fichiers des profils retirés sont signalés (`retired`) et sortent du manifeste, mais restent sur le disque ; `project-lead` délègue tant qu'ils existent.
7. **Questions de phase 0** : le module déclare une question par clé (`mainAgent`, `profiles`, `regulatedDomain`).

## Do's and Don'ts

### Do

- Ajouter un profil optionnel par son fichier, son pseudo-module, sa ligne dans `OPTIONAL_PROFILES` et son entrée dans la table du hook.
- Tester chaque profil avec les cas de refus de sa table.

### Don't

- Ne pas donner l'outil `Agent` à un profil optionnel.
- Ne pas compter sur la liste d'exclusion de `developer` comme sur une frontière de sécurité.
- Ne pas injecter un paramètre libre dans un fichier d'instructions sans liste blanche.

## Consequences

### Positive

- Un projet choisit ses rôles profil par profil ; aucun fichier de profil n'est écrit sans l'avoir demandé.
- `project-lead` délègue aux profils choisis dès qu'ils existent, sans autre réglage.

### Negative

- Une liste d'exclusion est plus faible qu'une liste d'autorisation : les dossiers de gouvernance doivent être tenus à jour dans la table.
- Une entrée de table et un pseudo-module par profil à maintenir.

### Risks

- Le shell de `developer` peut écrire dans les dossiers de gouvernance. La relecture par `qa-engineer` et par l'humain reste la garantie.
- Un nouveau dossier de gouvernance ajouté par un module n'est pas protégé tant qu'il n'est pas dans la liste.
- Les entrées de table des profils optionnels existent même sans la clé `profiles` : un agent du projet qui porte l'un de ces noms est borné sans l'avoir demandé.
- Avec `keep` sur `profile-guard.mjs`, les profils choisis ne sont bornés que par la version du projet ; le rapport l'avertit.
- Un teammate `developer` isolé dans un worktree écrit sous `.claude/worktrees/` et se voit tout refuser.
- Le texte de `regulatedDomain` est visible dans le dépôt, et la liste blanche n'empêche pas une consigne écrite en clair : la garantie est que `compliance-reviewer` n'écrit rien.

## Compliance and Enforcement

Tests du module (`tests/profile-guard.test.mjs`) pour les entrées de table ; tests de génération pour les clés `profiles` et `regulatedDomain` (liste, doublons, refus, héritage, désactivation) et pour les profils ; instantanés de la matrice. Pas de règle Archgate.

## References

- Issue #34 ; changements OpenSpec `34-optional-profiles-batch1`, `34-profiles-batch-2a`, `34-profiles-batch-2b`
- ARCH-010 (modules auto-décrits), ARCH-011 (bornage par un hook unique), ARCH-012 (agents, skills et commandes lançables), ARCH-013 (chef de projet)
