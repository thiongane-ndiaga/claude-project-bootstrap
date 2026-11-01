# bootstrap.json

Entrée de `scripts/scaffold.mjs`. Fusionne la sortie de `scripts/resolve-versions.mjs` (`versions`, `actions`) avec les réponses de la phase 0.

```json
{
  "projectName": "Mon projet",
  "description": "Une phrase sur ce que le projet doit faire.",
  "visibility": "private",
  "docLanguage": "fr",
  "stack": "Node.js 24, modules ES",
  "keep": ["CLAUDE.md", ".github/pull_request_template.md"],
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
| `docLanguage` | — | langue de la documentation générée : `fr` (défaut, clé à omettre) ou le code d'un dossier `templates.<code>` du module `core` (`en`) ; une langue indisponible est refusée (code 1). Consignée au manifeste seulement si présente et reprise par `--update` |
| `docLanguageName` | — | libellé affiché de la langue (défaut : « Français », « English » selon `docLanguage`) ; à omettre sauf libellé voulu (« English (US) »), car une valeur explicite l'emporte |
| `stack` | — | stack déjà connue, en une ligne ; absente, `CLAUDE.md` dit que la stack n'est pas choisie |
| `cliInstall` | — | installation des CLI : `global` (défaut, clé à omettre), `user` ou `local`. `local` exige `openspec` ou `archgate` et crée `package.json` (voir ARCH-007) ; la clé est consignée au manifeste seulement si elle est présente |
| `mainAgent` | — | agent principal du projet, question de phase 0 du module `agent-profiles` (défaut : non) : `"project-lead"` écrit `"agent": "project-lead"` dans `.claude/settings.json` ; exige le module `agent-profiles` (voir ARCH-013). Absente (défaut), aucune clé `agent` ; `null` désactive la clé, qui n'est alors ni héritée du manifeste ni consignée. Consignée au manifeste seulement quand elle est présente, héritée par `--update`. Un `agent` déjà déclaré dans `settings.json` ou `settings.local.json` est conservé et signalé par `warnings` |
| `keep` | — | fichiers du modèle que le projet gère lui-même : jamais créés, modifiés ni signalés en conflit, consignés dans le manifeste |
| `date` | — | date de vérification des conditions GitHub (défaut : aujourd'hui) |
| `actionsCreditNote` | archgate + github + privé | chiffres **relevés dans la doc du jour**, jamais de mémoire |
| `versions.openspec` | openspec | épinglage CI et doc |
| `versions.archgate` | archgate | épinglage CI et doc |
| `actions.*` | github / release | `uses: owner/action@<sha> # <tag>` |

Un paramètre manquant fait échouer le script en nommant le fichier et le paramètre.

## Blocs conditionnels des modèles

Une ligne contenant `@@module:a|b` ouvre un bloc conservé si l'un des modules est actif ; `@@end` le ferme (imbrication possible). Les lignes de marqueurs sont supprimées. Pseudo-modules : `visibility-private`, `visibility-public`. Les paramètres s'écrivent `{{MAJUSCULES}}` (sans espace, pour ne pas toucher aux expressions `${{ … }}` de GitHub Actions).
