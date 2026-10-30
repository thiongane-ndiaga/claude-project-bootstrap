---
name: project-bootstrap
description: Met en place, dans un dépôt neuf ou presque vide, un outillage de développement assisté par IA complet et modulaire — Claude Code (CLAUDE.md, settings, hooks Node, agents), OpenSpec (spec-driven), Archgate (ADR exécutables), arc42, GitHub Free (formulaires d'issues, template de PR, labels, CI, Projects) et release-please — avec un workflow documenté de l'issue à la release, portable Windows/Linux, sans choisir de stack. À utiliser dès que l'utilisateur veut démarrer un nouveau projet « comme fleetbook », initialiser/bootstrapper un dépôt avec ce workflow, recréer cette configuration ailleurs, ou ajouter une de ces briques (OpenSpec, Archgate, arc42, release-please, agents de revue) à un dépôt qui ne l'a pas encore — même s'il ne nomme pas le skill.
---

# project-bootstrap

Recrée l'outillage d'un projet piloté par Claude Code : la stack applicative n'est **jamais** choisie ici (ce sera l'objet d'ADR du projet) ; Node.js n'est qu'un prérequis d'outillage.

Travaille en phases et arrête-toi à chaque **[STOP]** pour obtenir une validation explicite. L'utilisateur garde la main sur tout ce qui est global à sa machine ou visible à l'extérieur (installations globales, `archgate login`, toute écriture sur GitHub).

Lis `references/pitfalls.md` avant la phase 2 : chaque piège qui y figure a déjà coûté du temps.

## Modules

Le catalogue fait foi : `assets/modules.json` (dépendances, fichiers, valeurs par défaut).

| Module | Apporte | Requiert |
|---|---|---|
| `core` (toujours) | `.gitignore`, `.gitattributes`, `CLAUDE.md`, `docs/workflow.md` | — |
| `claude` | `.claude/settings.json`, hooks Node, agents du projet | — |
| `openspec` | `openspec init` + conventions `<issue>-<slug>` | — |
| `archgate` | `.archgate/`, ADR d'outillage + règles dans `docs/architecture/adrs/` | — |
| `archgate-plugin` | plugin Claude Code d'Archgate (compte Archgate) | archgate, claude |
| `arc42` | 12 sections avec questions-guides | — |
| `github` | formulaires d'issues, template de PR, labels, `ci.yml`, dépôt | — |
| `release` | release-please (changelog, SemVer, tags, Releases) | github |
| `projects` | tableau GitHub Projects | github |
| `githooks` | `pre-push` Node qui rejoue le contrôle qualité | claude |
| `agent-teams` | flag expérimental dans `.claude/settings.local.json` | claude |

Les agents générés dépendent des modules : `spec-reviewer` (openspec), `traceability-checker` (github), `architecture-explorer` (archgate), `arc42-keeper` (arc42).

## Phase 0 — Cadrage

1. Inspecte le dossier cible : dépôt git ? fichiers existants (ils ne seront jamais écrasés) ? données sensibles (elles pèsent sur le choix public/privé) ?
2. Pose les questions (AskUserQuestion), recommandation en premier :
   - nom et description en une phrase ;
   - visibilité : **privé** si des données réelles ou sensibles sont présentes, sinon public (CI Windows gratuite et protection de branche disponible) ;
   - modules (multi-sélection, défauts de `modules.json`) ;
   - langue de la documentation (modèles fournis en français) ;
   - Windows natif ou WSL (recommandé : natif ; jamais un même clone partagé entre les deux).
3. Relève les versions : `claude --version`, `node --version` (≥ 20.19), `git --version`, `gh --version`, `gh auth status` (scope `project` si module projects).
4. **Revérifie les conditions du plan GitHub Free** dans la doc actuelle (voir `references/github-free.md`) au lieu de citer des chiffres de mémoire.

## Phase 1 — Plan [STOP]

1. `node scripts/resolve-versions.mjs` → versions des CLI et SHA des actions publiées depuis ≥ 14 jours.
2. Écris `bootstrap.json` dans le scratchpad (schéma : `references/bootstrap-config.md`).
3. `node scripts/scaffold.mjs --config bootstrap.json --target <dépôt> --dry-run` : liste des fichiers créés et des conflits.
4. Présente : modules et dépendances, fichiers à créer, conflits, commandes globales à approuver, actions GitHub prévues, ce qui restera manuel. **[STOP]**

## Phase 2 — Mise en place

Un commit Conventional Commits par étape (anglais). Demande l'accord avant chaque action globale ou GitHub.

1. **git** : `git init -b main` si besoin ; vérifie `user.name`/`user.email` (ne les invente pas : demande).
2. **CLI** (accord requis) : `npm install -g @fission-ai/openspec@<v> archgate@<v>` aux versions de `bootstrap.json`. `gh` s'installe avec winget (élévation requise sous Windows) ou le gestionnaire de paquets Linux.
3. **Génération** : `scaffold.mjs` sans `--dry-run`. Code de sortie 3 = conflits : montre-les, ne les écrase pas. Si la langue n'est pas le français, traduis ensuite les fichiers générés (sauf identifiants, commandes et marqueurs techniques).
4. **openspec** : `openspec init --tools claude --language <code> --no-animation`, puis complète `openspec/config.yaml` avec `references/openspec-config.md`. Ne touche jamais `.claude/skills/openspec-*` ni `.claude/commands/opsx/`.
5. **archgate** : **ne lance pas `archgate init`** (voir pièges) ; les fichiers générés suffisent. `archgate check` doit passer et génère `docs/architecture/rules.d.ts` (ignoré par git).
6. **archgate-plugin** (accord requis) : `archgate login` (flux device, l'utilisateur valide dans son navigateur), puis `archgate plugin install --editor claude`. Ensuite, retire tout `"agent": "archgate:developer"` de `.claude/settings.local.json` et aligne les `Skill(archgate:…)` autorisés sur les skills réellement fournis (`claude plugin details archgate@archgate`).
7. **githooks** : `git config core.hooksPath .githooks` et `git update-index --chmod=+x .githooks/pre-push` après le premier `git add`.
8. **agent-teams** : `"env": {"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"}` dans `.claude/settings.local.json` (jamais dans `settings.json` partagé : le flag change la délégation ordinaire).
9. **Contrôle** : `node .claude/hooks/quality-gate.mjs` renvoie 0.
10. **GitHub** (accord pour chaque action ; voir `references/github-setup.md`) : création du dépôt et push, labels, permissions Actions pour release-please, Project, protection de branche si public. Si un classificateur de permissions bloque une commande, ne la contourne pas : donne-la à l'utilisateur pour qu'il la lance avec `!`.
11. Dis à l'utilisateur de **redémarrer Claude Code** dans le dépôt (depuis un terminal ouvert après l'installation de gh) : agents et plugins ne se chargent qu'au démarrage.

**[STOP]** Journal concis (commande → résultat), écarts par rapport au plan.

## Phase 3 — Vérification

Suis `references/verification.md` : chaîne issue → spec → PR → CI rouge puis verte → merge → Done → release, règles Archgate en échec puis en succès, subagent et teammates. Rapporte ce qui a marché, échoué, et les contournements.

## Phase 4 — Suite

Les ADR d'outillage générés sont au statut **Proposé** : l'utilisateur les relit, les passe à « Accepté », puis merge. Propose ensuite de rédiger arc42 §1 à §3, puis d'ouvrir la première issue « Décision d'architecture » pour la stack.
