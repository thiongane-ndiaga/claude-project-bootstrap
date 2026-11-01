Issue: #47
ADR: ARCH-009

## Why

Le bootstrap impose de redémarrer Claude Code en cours de route (agents et plugins ne se chargent qu'au démarrage) et le contexte d'une session peut être compacté ou perdu. Rien ne conserve l'avancement : les réponses de la phase 0 et `bootstrap.json` vivent dans le scratchpad de la session, et le manifeste n'existe qu'après la génération. Par ailleurs les actions globales à la machine (`npm install -g`, installation de plugin, `git config --global`) ne laissent aucune trace permettant de les annuler.

## What Changes

- Nouveau script `scripts/state.mjs` (Node, aucune dépendance) : `init`, `config`, `step`, `show`, `next`, `resume`, `effect`, `effects`, réponses en JSON.
- **État de reprise** `.bootstrap/local/state.json` : réponses de la phase 0 (clés du schéma de `bootstrap.json` seulement, jamais de jeton) et état de chaque étape (`doing`, `done`, `failed`, `skipped`). Les étapes inutiles pour les modules choisis sont ignorées ; en mode `local`, l'installation des CLI suit la génération.
- **Dossier qui s'ignore seul** : `.bootstrap/local/` contient un `.gitignore` réduit à `*`, donc rien n'est suivi par git, avant même la génération et sans toucher aux modèles ni aux instantanés.
- **Reprise** : `resume` (lecture seule) donne la prochaine étape, les réponses et les incohérences avec les preuves vérifiables (`.git`, manifeste, `openspec/config.yaml`, `core.hooksPath`) ; sans état, il déduit l'avancement du dépôt. `config --out` restitue `bootstrap.json` dans une nouvelle session.
- **Journal des effets globaux** `.bootstrap/local/effects.json` : commande, valeur précédente lue avant l'action, commande d'annulation (chaîne et tableau d'arguments), statut (`planned`, `applied`, `failed`). Annulation prudente pour les plugins et marketplaces déjà présents. Le script ne lance ni l'action ni l'annulation.
- `scaffold.mjs --detect` rapporte `resumable`.
- Le skill appelle `resume` au début, `step --status doing` puis `done` autour de chaque étape, `effect` avant chaque action globale, et propose `effects --undo` en fin de phase 2.
- Nouveau fichier de tests `tests/state.test.mjs`, lancé par `.bootstrap/checks.json` ; ADR ARCH-009 ; arc42.

Hors périmètre : exécuter une annulation, reprendre une action GitHub partiellement faite, synchroniser l'état entre machines, la phase 5 (mise à jour) et ses effets, faire lire le journal par l'audit.

## Capabilities

### New Capabilities
- `session-resume`: état de reprise du bootstrap, reprise après redémarrage ou perte de contexte, journal des effets globaux avec leur annulation.

### Modified Capabilities

## Impact

- Nouveaux : `skills/project-bootstrap/scripts/state.mjs`, `tests/state.test.mjs`, ADR `ARCH-009`.
- Modifiés : `scaffold.mjs` (`--detect`), `SKILL.md`, `.bootstrap/checks.json`, `.github/pull_request_template.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `README.md`, arc42.
- Instantanés et modèles : aucun changement.
- Projets existants : aucun effet.
