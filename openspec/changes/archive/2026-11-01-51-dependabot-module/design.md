## Context

Le module `github` génère `ci.yml` et `release.yml` avec trois actions épinglées par SHA : `actions/checkout`, `actions/setup-node`, `googleapis/release-please-action`. `scaffold.mjs` écrit chaque référence sous la forme `<sha> # <tag>` (`ref()`), ce qui est le format que Dependabot sait mettre à jour. `resolve-versions.mjs` choisit chaque action par numéro de version, publiée depuis au moins 14 jours. Le contrôle `check-pr-title.mjs` accepte `ci(deps): …`. La matrice de tests déduit ses combinaisons du catalogue.

## Goals / Non-Goals

**Goals:**
- Un fichier de configuration Dependabot optionnel, cohérent avec la règle d'ancienneté du plugin.
- Des PR de mise à jour dont le titre passe `pr-title` sans réglage côté projet.

**Non-Goals:**
- D'autres écosystèmes (npm, pip, …) : le plugin ne choisit aucune stack.
- Modifier `resolve-versions.mjs` ni les références existantes.

## Decisions

1. **Module dédié `dependabot`**, opt-in, requiert `github`. Un fichier à part du module `github` permet de ne pas le proposer par défaut et de l'ajouter plus tard (la mise à jour crée seulement le nouveau fichier). Alternative écartée : un fichier désactivable du module `github` (aucun mécanisme de désactivation par fichier, et une combinaison de moins dans la matrice).
2. **Préfixe `ci` + `include: "scope"`** : Dependabot produit `ci(deps): …`, plus juste pour des actions que `chore(deps)`. Le type `ci` et le scope `deps` (`[a-z0-9-]+`) sont déjà acceptés par le contrôle.
3. **`cooldown: default-days: 14`** : reproduit le délai par défaut de `resolve-versions.mjs` (option `--min-age-days`), pour que Dependabot ne propose pas une version publiée depuis moins de 14 jours. La valeur est fixe dans le modèle : un projet qui a résolu ses versions avec un autre délai ajuste le fichier à la main.
4. **Un groupe unique `actions` avec le motif `*`** : une seule PR regroupe les mises à jour, pour limiter le bruit.
5. **Fréquence hebdomadaire** (`interval: weekly`) : valeur courante qui bat un rythme quotidien pour un projet sans stack. Choix d'implémentation sans effet sur les autres décisions.
6. **Pas de paramètre `{{…}}`** : `dependabot.yml` est lié au module par son entrée `when`. Trois documents générés reçoivent un bloc `@@module:dependabot` (`workflow.md`, ARCH-005, agent `traceability-checker`) pour l'exception de traçabilité : une PR de Dependabot n'a ni branche `<type>/<issue>-<slug>` ni `Closes #N`.
7. **Documentation** dans `references/versioning.md` (règle de choix par numéro, délai, commentaire `# <tag>`) ; ligne dans le tableau de `SKILL.md`.

8. **Répertoires `/` et `/.github/actions/*`** : sans le second, les `uses:` ajoutés dans l'action composite `project-setup` (épinglés par SHA, règle ARCH-004) ne seraient jamais mis à jour.
9. **Label `chore`** : Dependabot poserait sinon `dependencies` et `github_actions`, absents de `labels.json` ; `chore` existe déjà (principe de `forge-labels` : réutiliser avant de créer).
10. **Audit** : les PR de Dependabot font avancer les SHA des workflows sans toucher au manifeste. Avec le module, l'audit ne compare plus aux SHA de `config.actions` (delta `project-audit`) mais exige toujours un SHA identique entre `ci.yml` et `release.yml` (le groupe `actions` les met à jour ensemble). À la mise à jour du plugin, un workflow modifié par Dependabot dont le modèle n'a pas changé reste `customized` ; si le modèle change aussi, la fusion à trois voies s'applique comme pour toute modification du projet.

## Risks / Trade-offs

- Un SHA épinglé ne porte pas toujours un tag lisible par Dependabot : les références du plugin portent `# <tag>`, donc le format est correct tant que `ref()` ne change pas. Le test de non-régression est le motif `# <tag>` des modèles existants, déjà couvert par les tests du générateur.
- `cooldown`, `include: scope` et `directories` pour `github-actions` sont couramment utilisés dans des dépôts publics : rien à noter dans `pitfalls.md`. Si GitHub rejetait une clé, Dependabot le signale dans l'onglet Insights, Dependency graph, Dependabot.
- L'action locale `./.github/actions/project-setup` n'a pas de version : seuls ses `uses:` internes sont mis à jour.
- Les PR de Dependabot sur un dépôt privé consomment des minutes Actions : le module est optionnel pour cette raison.

## Migration Plan

Aucune migration : un projet existant ajoute le module en relançant le skill avec `modules` complété. Retour arrière : supprimer `.github/dependabot.yml` à la main (le retrait d'un module n'est pas géré).

## Open Questions

Aucune.
