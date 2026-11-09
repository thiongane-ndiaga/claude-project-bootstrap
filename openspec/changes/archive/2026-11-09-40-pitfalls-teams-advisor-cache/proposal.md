Issue: #40
ADR: aucun

## Why

Des pièges des équipes d'agents, de l'advisor et du cache de prompt ont été constatés ou lus dans la documentation de Claude Code mais ne figurent pas dans `references/pitfalls.md`.

## What Changes

- Une section de `pitfalls.md` consigne sept pièges, chacun avec sa source (page de documentation lue le 2026-11-09), en complément des puces existantes ; celui que la documentation n'établit pas est signalé comme tel et renvoyé à #114.
- Quatre pièges existent déjà (`skills`, teammate par `name`, `DISABLE_TELEMETRY`, Archgate et `agent`) : la section ajoute leurs sources et renvoie aux puces existantes, sans les remplacer.

## Capabilities

### New Capabilities

(aucune : changement sans comportement, `skip_specs: true`)

### Modified Capabilities

(aucune)

## Impact

- `skills/project-bootstrap/references/pitfalls.md` seulement.
- Hors périmètre : #114 (essai des équipes), correction des consignes générées.
- Hors périmètre : le mot « impose » de l'ADR ARCH-013 (le plugin Archgate impose son agent), inexact au regard de D3, à corriger dans une suite.
