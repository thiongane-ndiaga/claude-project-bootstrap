# bootstrap.json

Entrée de `scripts/scaffold.mjs`. Fusionne la sortie de `scripts/resolve-versions.mjs` (`versions`, `actions`) avec les réponses de la phase 0.

```json
{
  "projectName": "Mon projet",
  "description": "Une phrase sur ce que le projet doit faire.",
  "visibility": "private",
  "docLanguageName": "Français",
  "modules": ["claude", "openspec", "archgate", "arc42", "github", "release", "projects", "githooks"],
  "date": "2027-01-15",
  "actionsCreditNote": "12 $ de crédit par mois, 0,006 $/min sous Linux",
  "versions": { "openspec": "1.14.2", "archgate": "0.60.0", "node": "24" },
  "actions": {
    "checkout": { "tag": "v7.0.1", "sha": "<40 hex>" },
    "setupNode": { "tag": "v7.1.0", "sha": "<40 hex>" },
    "releasePlease": { "tag": "v5.0.0", "sha": "<40 hex>" }
  }
}
```

| Champ | Requis si | Rôle |
|---|---|---|
| `projectName`, `description`, `visibility` | toujours | titre de CLAUDE.md, ADR ARCH-004, matrice CI (`public` → ubuntu + windows) |
| `modules` | toujours | `core` est ajouté d'office ; dépendances vérifiées |
| `docLanguageName` | — | nom affiché de la langue (défaut « Français ») |
| `date` | — | date de vérification des conditions GitHub (défaut : aujourd'hui) |
| `actionsCreditNote` | archgate + github + privé | chiffres **relevés dans la doc du jour**, jamais de mémoire |
| `versions.openspec` | openspec | épinglage CI et doc |
| `versions.archgate` | archgate | épinglage CI et doc |
| `actions.*` | github / release | `uses: owner/action@<sha> # <tag>` |

Un paramètre manquant fait échouer le script en nommant le fichier et le paramètre.

## Blocs conditionnels des modèles

Une ligne contenant `@@module:a|b` ouvre un bloc conservé si l'un des modules est actif ; `@@end` le ferme (imbrication possible). Les lignes de marqueurs sont supprimées. Pseudo-modules : `visibility-private`, `visibility-public`. Les paramètres s'écrivent `{{MAJUSCULES}}` (sans espace, pour ne pas toucher aux expressions `${{ … }}` de GitHub Actions).
