Issue: #42
ADR: aucun

## Why

La clé `mainAgent` (#35) change l'agent de toutes les sessions d'un projet, mais rien ne la propose à l'utilisateur : elle n'est écrite que sur demande explicite. Le catalogue sait déjà déclarer des questions de phase 0 par module (ARCH-010) ; `agent-profiles` n'en déclare aucune.

## What Changes

- `agent-profiles` déclare dans `module.json` la question de phase 0 sur l'agent principal (`mainAgent`, défaut : non), listée par `scaffold.mjs --list-modules`.
- `SKILL.md` : la question est posée en phase 0 et la réponse reportée dans `bootstrap.json` ; la phase 1 annonce le choix avant toute écriture et reporte les avertissements du dry-run.
- `bootstrap-config.md` décrit la question.
- Les questions des profils optionnels, du domaine réglementé et de l'advisor viennent avec #34 et #36, chaque module déclarant la sienne.

## Capabilities

### New Capabilities

(aucune)

### Modified Capabilities

- `agent-profiles` : le module déclare sa question de phase 0 sur l'agent principal.

## Impact

- `module.json` d'`agent-profiles`, `SKILL.md`, `bootstrap-config.md`, un test de catalogue.
- Aucun fichier généré ne change : instantanés inchangés.
- Hors périmètre : profils optionnels et domaine réglementé (#34), module `advisor` (#36).
