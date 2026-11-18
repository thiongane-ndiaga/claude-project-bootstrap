---
id: ARCH-020
title: Fichiers de gouvernance modifiés par proposition avec agent-profiles
domain: architecture
rules: false
files: ["skills/project-bootstrap/assets/modules/agent-profiles/**", "skills/project-bootstrap/assets/modules/core/templates/.gitignore", "skills/project-bootstrap/assets/modules/core/templates.en/.gitignore", "skills/project-bootstrap/assets/modules/core/templates/docs/workflow.md", "skills/project-bootstrap/assets/modules/core/templates.en/docs/workflow.md", "skills/project-bootstrap/references/pitfalls.md", "skills/project-bootstrap/SKILL.md"]
---

# Fichiers de gouvernance modifiés par proposition avec agent-profiles

## Statut

Accepté. Complète ARCH-012, ARCH-013 et ARCH-014, sans en amender aucun ; cite ARCH-016 sans le modifier.

## Context

Avec `agent-profiles`, la table `PROFILES` de `.claude/hooks/profile-guard.mjs` interdit à `developer` les fichiers et dossiers de gouvernance (`writeExcept`, ligne 140) : `.archgate/`, `.bootstrap/`, `.claude/`, `.git/`, `.githooks/`, `.github/`, `.release-please-manifest.json`, `agents.md`, `claude.md`, `docs/architecture/`, `docs/workflow.md`, `openspec/changes/archive/`, `openspec/config.yaml`, `openspec/config.yml`, `openspec/schemas/`, `openspec/specs/`, `release-please-config.json` (casse ignorée, lignes 207-209). Les autres profils écrivent dans `docs/architecture/` (`architect`, ligne 114), `tests/` et `test/` (`qa-engineer`, ligne 121), `openspec/changes/` (`business-analyst`, ligne 142 ; ce préfixe, comparé en tenant compte de la casse, ligne 211, couvre aussi `openspec/changes/archive/`) ; `project-lead` n'écrit nulle part (ligne 149) et son shell est réduit au pilotage (ligne 150). `CLAUDE.md`, `AGENTS.md`, `docs/workflow.md`, `.claude/`, `.github/`, `.githooks/`, `.archgate/`, `openspec/config.*`, `openspec/schemas/` et les fichiers release-please n'ont donc aucun rédacteur parmi les profils.

La règle est en vigueur : la spec `agent-profiles` (exigence « Exécution du parcours OpenSpec », ligne 684, scénario lignes 690-692) dit qu'aucun profil n'écrit les fichiers de gouvernance en tâche courante (l'utilisateur les modifie, ou une session sans `mainAgent`) ; `project-lead.md` (ligne 20) et `pitfalls.md` (ligne 190) la reprennent. Elle n'a pas de procédure.

Faits observés (issue #172) :

- le shell de `developer` est ouvert (`shellOpen`, ligne 140 ; commentaire des lignes 138-139 ; ARCH-012 décision 5) : un agent a écrit `docs/workflow.md` par la ligne de commande, sur consigne du chef de projet ;
- la cause est dans `project-lead.md` ligne 8 : « Ce qui est refusé se délègue à `developer` (code, commits, pushes, fichiers) », sans exception pour la gouvernance, que la ligne 20 exclut ; la même ligne lui délègue les pushes, que `developer.md` (ligne 28) et la spec `agent-profiles` (exigence « Profil developer », ligne 382, scénario ligne 386 : « ne rien publier ») lui interdisent ;
- les autres modifications de gouvernance de la session ont été faites par l'utilisateur ;
- la mise à jour par le plugin (`SKILL.md`, phase 5) lance `scaffold.mjs --update`, qui écrit `.claude/`, `.github/`, `CLAUDE.md` et `.bootstrap/` ; `project-lead` ne peut pas la lancer (ligne 150) ; les migrations (`migrate.mjs --apply`, étape 6) écrivent sur la forge et peuvent supprimer des labels ;
- `.gitignore` appartient au module `core`, fusionné ligne à ligne (`core/module.json` ligne 6, `merge.mjs` ligne 2), et son modèle porte des blocs `@@module:…` (`core/templates/.gitignore`, bloc `archgate`, lignes 20-25).

Ce que protège chaque fichier de gouvernance :

| Chemin | Protège |
|---|---|
| `.claude/hooks/` | le garde-fou : le modifier change les droits dès l'appel suivant (ARCH-011) |
| `.claude/settings.json` | la déclaration du hook, les règles `allow`/`ask`, le réglage `agent` (ARCH-013) |
| `.claude/agents/`, `.claude/skills/` | les prompts et les outils des profils |
| `.github/workflows/` | du code exécuté en CI avec des secrets (ARCH-004, ARCH-019) |
| `.githooks/`, `.git/` | du code exécuté à chaque commit ou push |
| `docs/architecture/adrs/` | les décisions acceptées, bloquantes (niveau 1) |
| `openspec/specs/`, archives | les specs en vigueur, écrites par `openspec archive` |
| `CLAUDE.md`, `AGENTS.md`, `docs/workflow.md` | les instructions de tous les agents et l'échelle d'arbitrage (ARCH-013 décision 6) |
| `.bootstrap/` | le manifeste et les bases de fusion (ARCH-006) |

Options comparées (rapport d'`architect` sur l'issue #172) :

1. **Statu quo documenté** : aucune modification de la table, mais aucune procédure ; l'utilisateur rédige, et la consigne de la ligne 8 pousse au contournement observé.
2. **Profil `maintainer`** borné à une liste de chemins : moins d'effort ; mais s'il écrit `.claude/hooks/` ou `.claude/settings.json`, il réécrit sa propre table, et sans eux ces chemins restent sans rédacteur ; un `maintainer.md` livré par `--update` à un projet dont `profile-guard.mjs` est en `keep` n'est pas borné (lignes 186-187, ARCH-014). Reporté, limité aux fichiers documentaires.
3. **`architect` élargi** à `CLAUDE.md` et `docs/workflow.md` : une ligne de table, mais cumul de rôles (ARCH-016) et couverture partielle. Rejeté.
4. **Shell de `developer` borné** : un profil qui écrit du code puis lance des tests écrit où il veut (ARCH-011, risque « écrire puis exécuter ») ; contraire à ARCH-012 décision 5 et à ARCH-014 décision 4 (pile non choisie). Rejeté.
5. **Édition proposée** : l'agent prépare, l'utilisateur relit et applique ; aucune modification de la table. `.bootstrap/local/` est exclu (`writeExcept` ; réservé au générateur, `CONTRIBUTING.md` ligne 47) et le dossier temporaire du système est hors du projet (ligne 208). Retenue.
6. **Contrôle de détection** des fichiers de gouvernance modifiés dans la branche : seul moyen de voir aussi le passage par le shell ; il n'empêche rien. Retenu en complément.

## Decision

1. **Règle** : avec `agent-profiles`, les fichiers de gouvernance sans rédacteur de profil (`CLAUDE.md`, `AGENTS.md`, `docs/workflow.md`, `.claude/`, `.github/`, `.githooks/`, `.archgate/`, `openspec/config.*`, `openspec/schemas/`, fichiers release-please) sont appliqués par l'utilisateur, ou écrits dans une session sans `mainAgent`. La table `PROFILES` reste inchangée.
2. **Proposition** : seul `developer` écrit sous `.proposals/`, dossier racine hors `writeExcept`, ignoré par la ligne `.proposals/` du `.gitignore` racine ; le contenu d'un autre profil lui est transmis par le brief de `project-lead`. La proposition est un patch aux en-têtes `a/<chemin>` et `b/<chemin>` relatifs à la racine du dépôt.
3. **Application** : `project-lead` donne `git apply --check`, `git apply --stat`, puis `git apply` sur `.proposals/<nom>.patch` ; l'utilisateur relit et lance.
4. **Consignes** : `project-lead.md` exclut la gouvernance de sa délégation à `developer` ; dans les deux prompts, le push est fait par `developer` sur délégation de `project-lead`, avec l'accord explicite de l'utilisateur pour chaque push.
5. **Détection** : `pr-readiness-review` exige dans la PR une trace d'origine admise pour chaque fichier de la décision 1 ou de `.proposals/` modifié par la branche. Ni `quality-gate` ni la CI.
6. **Phase 5**, exception écrite : `developer` lance `scaffold.mjs` (`--update`, `--config <copie>`, `--update --adopt`) sur brief de `project-lead`, après l'accord explicite de l'utilisateur sur la simulation et sa relecture du diff. `migrate.mjs --apply` reste lancé par l'utilisateur.
7. **Hors règle** : les modèles du plugin (`assets/modules/**/templates*/`) ; `docs/architecture/` (`architect`) ; `openspec/specs/` et les archives (`openspec archive`).
8. Complète ARCH-012 (décision 5), ARCH-013 (décision 4) et ARCH-014 (risque du shell de `developer`).

## Do's and Don'ts

### Do

- Comparer les chemins de la décision 1 et `.proposals/` depuis la racine du dépôt, sans tenir compte de la casse, comme `writeExcept` : `skills/…/templates/docs/workflow.md` n'est pas `docs/workflow.md`.
- Admettre comme origine d'un fichier de gouvernance modifié : proposition appliquée par l'utilisateur, phase 5, session sans `mainAgent`, `openspec update`, écriture d'Archgate, PR Dependabot, PR release-please.
- Exclure de la détection `docs/architecture/`, `openspec/specs/` et les archives, écrits par leurs rédacteurs et par l'archivage.
- Produire le patch selon la méthode fixée par le changement `172-governance-edit-procedure`, y compris depuis un fichier complet.
- Donner à l'utilisateur `git apply --check`, puis `git apply --stat`, puis `git apply` sur le même fichier, et nommer les chemins à relire avec soin : `.claude/hooks/`, `.claude/settings.json`, `.github/workflows/`, `.githooks/`.
- Lancer la mise à jour de la phase 5 par `developer` seulement après l'accord explicite de l'utilisateur sur la simulation et le diff.
- Demander l'accord explicite de l'utilisateur pour chaque push délégué à `developer`.
- Traiter les fichiers release-please et `openspec/config.*` comme les autres fichiers de gouvernance.

### Don't

- Ne pas écrire un fichier de gouvernance par le shell de `developer`, hors phase 5.
- Ne pas déléguer à `developer` l'écriture d'un fichier de gouvernance.
- Ne pas confier `migrate.mjs --apply` à un profil.
- Ne pas placer une proposition sous `.bootstrap/` ni hors du projet.
- Ne pas ajouter `.proposals/` à la liste de gouvernance ni créer d'entrée `PROFILES` pour cette procédure.
- Ne pas committer le contenu de `.proposals/`.

## Consequences

### Positive

- La règle en vigueur reçoit une procédure, sans nouveau profil ni nouvelle entrée de table.
- Aucun agent n'écrit la gouvernance en tâche courante ; l'utilisateur voit le diff qu'il applique.
- La commande `git apply` est la même sous Windows et sous Linux ; `--check` signale un patch qui ne s'applique pas sans rien écrire.
- La ligne `.proposals/` du `.gitignore` racine est commitée et vaut pour tous les clones.
- Le passage par le shell, interdit par consigne, devient visible à la revue de PR.
- La phase 5 garde son [STOP] et sa relecture du diff (`SKILL.md`, étapes 4 et 5) ; les migrations gardent l'accord explicite de l'étape 6 et restent à l'utilisateur.

### Negative

- L'utilisateur relit et lance une commande pour chaque proposition.
- La détection est une consigne du skill `pr-readiness-review` : elle dépend de son lancement par `qa-engineer` (ARCH-016).
- La mise à jour de la phase 5 reste une écriture de gouvernance par le shell de `developer`, `.bootstrap/` compris, autorisée par exception.
- Un contenu rédigé par `architect`, `qa-engineer` ou `business-analyst` passe par le brief de `project-lead` jusqu'à `developer`.

### Risks

- **Patch appliqué sans lecture** : un patch peut toucher `.claude/hooks/`, `.claude/settings.json` ou `.github/workflows/`. Mitigation : `git apply --stat`, chemins sensibles nommés par `project-lead`, trace exigée dans la PR.
- **Shell de `developer` ouvert** : il peut toujours écrire la gouvernance (ARCH-014). Mitigation : consignes de `developer.md` et de `project-lead.md`, détection par `pr-readiness-review`, relecture humaine.
- **Push sans accord** : l'accord pour chaque push est une consigne ; `.claude/settings.json` n'a aucune règle `ask` sur `git push`. Mitigation : consignes alignées de `project-lead.md` et de `developer.md`, relecture de la PR, niveau 5 de l'échelle d'arbitrage.
- **Clone sans la ligne `.proposals/`** (projet non mis à jour, ligne retirée, `git add -f`) : une proposition est committée. Mitigation : `pr-readiness-review` signale tout fichier de `.proposals/` dans la branche.
- **Projets déjà générés** : `--update` ajoute la ligne `.proposals/` au `.gitignore` par fusion de lignes, remplace les prompts restés tels que générés et fusionne en général un prompt modifié à partir de sa base (`reconciled`) ; seul un conflit ou un fichier en `keep` garde la consigne de la ligne 8. Mitigation : rapport `conflicts` et `kept` de la phase 5, procédure de fusion de `versioning.md`.

## Compliance and Enforcement

Tests de génération : ligne `.proposals/` dans le `.gitignore` généré avec `agent-profiles`, absente sans ; assertions sur `project-lead.md` et `developer.md` (français et anglais) : exclusion de la gouvernance dans la délégation, commandes `git apply --check`, `git apply --stat` et `git apply`, push par `developer` sur délégation de `project-lead` avec l'accord explicite de l'utilisateur ; assertion sur `pr-readiness-review` (français et anglais) : liste comparée depuis la racine sans casse, origines admises, exclusions, trace exigée. Test du hook : une écriture de `developer` sous `.proposals/` se termine avec le code 0. Instantanés de la matrice. Relecture humaine de chaque PR qui touche la gouvernance. Pas de règle Archgate : le sujet est du contenu de modèles.

Le changement OpenSpec `172-governance-edit-procedure` traite :

- la spec `agent-profiles` : exigence « Exécution du parcours OpenSpec » (ligne 684, scénario lignes 690-692) et exigence « Profil developer » (ligne 382, scénario ligne 386), pour le push avec accord ;
- les modèles `project-lead.md` et `developer.md` (français et anglais), dont la ligne 28 de `developer.md` ;
- `pr-readiness-review` (français et anglais) ;
- `docs/workflow.md` (modèle) et `pitfalls.md`, dont la ligne 159, que le manifeste de ce dépôt contredit ;
- `SKILL.md`, phase 5 (étape « Appliquer » ; l'étape « Migrations » reste à l'utilisateur) ;
- la ligne `.proposals/` du `.gitignore` : bloc `@@module:agent-profiles` de `core/templates/.gitignore` et `core/templates.en/.gitignore` ;
- la méthode de production du patch, depuis un fichier complet.

Ce dépôt a le module `agent-profiles` (manifeste en version 0.1.21) et `"agent": "project-lead"` (`.claude/settings.json` ligne 130) : il reçoit les modifications de ses propres prompts, de `pr-readiness-review`, de `docs/workflow.md` et du `.gitignore` par une phase 5 ou par la procédure, avec la trace dans la PR.

À l'acceptation d'ARCH-020, `architect` ajoute dans la même PR une ligne de renvoi à ARCH-020 dans le statut d'ARCH-012, d'ARCH-013 et d'ARCH-014, complétés et non amendés, et aligne arc42 §8 (ligne 142) et §11 (ligne 30) sur le push avec accord.

## References

- Issue #172 (décisions de l'utilisateur) ; rapport d'`architect` sur l'issue #172 ; relecture de l'ADR par `qa-engineer`
- [ARCH-011](./ARCH-011-profils-d-agents-bornes-par-un-hook-unique.md), [ARCH-012](./ARCH-012-agents-skills-et-commandes-lancables-par-un-profil.md), [ARCH-013](./ARCH-013-chef-de-projet-comme-agent-principal-active-par-mainagent.md), [ARCH-014](./ARCH-014-profils-optionnels-choisis-par-la-cle-profiles.md), [ARCH-016](./ARCH-016-les-profils-absorbent-les-agents-historiques.md) (cité, non modifié), [ARCH-006](./ARCH-006-strategie-de-mise-a-jour-des-fichiers-generes.md)
- Spec `openspec/specs/agent-profiles/spec.md`
- `.claude/hooks/profile-guard.mjs`, `.claude/agents/project-lead.md`, `.claude/agents/developer.md`, `skills/project-bootstrap/assets/modules/core/module.json`, `skills/project-bootstrap/scripts/merge.mjs`
- https://git-scm.com/docs/git-apply
