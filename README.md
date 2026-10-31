# project-bootstrap

Plugin Claude Code qui recrée, dans un nouveau dépôt, l'outillage et le workflow de développement assisté par IA : Claude Code (CLAUDE.md, settings, hooks Node, agents), OpenSpec, Archgate (ADR exécutables), arc42, GitHub Free (formulaires, labels, CI, Projects) et release-please. Chaque brique est un module optionnel ; aucune stack applicative n'est choisie.

## Installation

```
claude plugin marketplace add thiongane-ndiaga/claude-project-bootstrap
claude plugin install project-bootstrap@thiongane-ndiaga
```

Puis, dans le dossier du nouveau projet, demander à Claude de « bootstrapper ce projet avec project-bootstrap » (ou décrire le besoin : le skill se déclenche seul).

## Contenu

```
.claude-plugin/          plugin.json + marketplace.json (ce dépôt est sa propre marketplace)
skills/project-bootstrap/
  SKILL.md               procédure par phases avec points d'arrêt
  assets/modules.json    catalogue des modules, dépendances, fichiers
  assets/templates/      modèles (blocs @@module:… et paramètres {{…}})
  scripts/scaffold.mjs   génère, met à jour et fusionne les fichiers (manifeste .bootstrap/manifest.json), n'écrase jamais un fichier modifié
  scripts/migrate.mjs    migrations hors fichiers (réglages côté forge), simulation puis --apply
  migrations/            une migration par fichier, idempotente
  scripts/resolve-versions.mjs  dernières versions CLI ; SHA d'actions publiés depuis ≥ 14 jours
  references/            pièges connus, configuration, GitHub, vérification
tests/scaffold.test.mjs  tests du générateur (node tests/scaffold.test.mjs)
tests/matrix.test.mjs    matrice des modules, instantanés (tests/snapshots/) et validation par les CLI réelles
```

## Développement

- `node tests/scaffold.test.mjs` et `node tests/matrix.test.mjs` doivent passer avant tout commit (ensemble : `node .bootstrap/run-checks.mjs`).
- Un piège découvert sur un nouveau projet va dans `references/pitfalls.md`.
- Modèles en français ; le skill traduit après génération si le projet utilise une autre langue.
