Issue: #29
ADR: aucun

## Why

Le module `github` crée des labels (`type:bug`, `type:feature`) qui doublent ceux que GitHub fournit déjà (`bug`, `enhancement`), et `type:chore` / `needs-adr` ne sont posés ni lus par rien. Le script de synchronisation crée avec `--force`, ce qui écraserait la description et la couleur d'un label natif si on l'y mettait. Un formulaire qui pose un label absent ne l'applique pas, sans le signaler : ce dépôt a ce défaut aujourd'hui (son formulaire « Décision d'architecture » pose `type:adr`, qui n'existe pas ici).

## What Changes

- Les formulaires posent les labels natifs : `bug.yml` → `bug`, `feature.yml` → `enhancement`; `architecture-decision.yml` pose `adr`.
- `labels.json` ne décrit plus que quatre labels, aux noms plats : `bug` et `enhancement` (natifs, créés seulement s'ils manquent), `adr` et `chore` (propres au plugin, sans équivalent natif). `type:bug`, `type:feature`, `type:adr`, `type:chore` et `needs-adr` disparaissent du modèle.
- `sync-labels.mjs` liste d'abord les labels du dépôt, crée ceux qui manquent, n'écrase jamais un label natif existant, et ne met à jour (couleur, description) que les labels propres au plugin.
- Nouvelle migration `0002-native-labels` : sur un dépôt qui a les anciens labels, elle simule (liste les actions et les issues touchées), puis, avec accord, pose les nouveaux labels sur chaque issue et PR concernée et supprime les anciens (`needs-adr` seulement s'il n'est posé nulle part).
- Ce dépôt est corrigé : ses fichiers `labels.json` et `sync-labels.mjs` sont générés, les labels `adr` et `chore` sont créés, `docs/workflow.md` dit la vérité.
- Le principe « réutiliser avant de créer » est inscrit dans `SKILL.md` pour tout module de forge ou de suivi.

Hors périmètre : champs `creates`/`reuses` du catalogue (avec le premier module non GitHub, #23 ou #25), renommage ou suppression de labels natifs.

## Capabilities

### New Capabilities
- `forge-labels`: labels créés et posés par le module `github` (réutilisation des labels natifs, synchronisation non destructive) et migration des dépôts qui ont les anciens labels préfixés.

### Modified Capabilities

## Impact

- Modèles : `.github/labels.json`, `scripts/sync-labels.mjs`, trois formulaires d'issues, `docs/workflow.md`.
- Nouveau : `skills/project-bootstrap/migrations/0002-native-labels.mjs` ; `migrate.mjs` accepte des notes d'information en plus des actions.
- Documentation : `SKILL.md`, `references/github-setup.md`, `references/verification.md`, `references/versioning.md`.
- Projets générés : leurs formulaires et `labels.json` changent à la mise à jour (fusion ou conflit selon leurs modifications) ; leurs labels existants ne bougent qu'avec la migration, sur accord. La suppression d'un label retire celui-ci de toutes les issues et PR, sans retour possible.
