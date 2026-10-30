# Compléments à openspec/config.yaml

Après `openspec init`, ajoute ce qui suit au champ `context` existant (sous la consigne de langue écrite par `--language`) et remplace l'exemple commenté `rules:` par le bloc ci-dessous. Garde les commentaires d'exemple `operations:` tels quels.

```yaml
  Change ids are "<issue-number>-<kebab-slug>" (e.g. 12-password-reset).
  The technology stack is not chosen yet: never assume a language, framework,
  database or deployment target unless an accepted ADR in docs/architecture/adrs/ says so.

rules:
  proposal:
    - "First lines: 'Issue: #<n>' and 'ADR: <PREFIX-NNN, ...>' (or 'ADR: aucun')"
    - Always state what is out of scope
  design:
    - Cross-cutting or durable decisions belong in an ADR; link it instead of restating it
```

Sans module `archgate`, retire la mention des ADR des deux premières règles. Sans module `github`, retire `Issue: #<n>` et utilise un id `<slug>`.

Vérifie : `openspec validate --all --strict --no-interactive` renvoie 0.
