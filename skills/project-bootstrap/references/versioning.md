# Versions du plugin et projets générés

## Politique
- **SemVer** du plugin (`.claude-plugin/plugin.json`). La version est incrémentée par release-please à la release, d'après les types de commits : `fix` → patch, `feat` → minor (avant 1.0.0, `feat!` → minor). Le cache du plugin est indexé par cette version : une correction n'atteint les utilisateurs qu'à la release suivante.
- Un projet généré enregistre la version qui l'a produit dans `.bootstrap/manifest.json` (`plugin.version`). `scaffold.mjs --detect` signale `updateAvailable` quand elle diffère de celle du plugin installé.
- Pas de retour en arrière géré : une mise à jour se défait avec git.

## Ce qu'une release change pour un projet généré
Un changement de **modèle** (`assets/templates/`), du **catalogue** (`assets/modules.json`) ou d'une **migration** touche les projets générés. Dans ce cas, le commit utilise le scope `templates`, `scaffold` ou `migrations` (`fix(templates): …`) pour que le journal des modifications le fasse apparaître. Un changement de documentation ou de test n'a aucun effet sur eux.

À la mise à jour (`scaffold.mjs --update`), chaque fichier est classé d'après le manifeste :

| Cas | Effet |
|---|---|
| nouveau fichier du modèle | ajouté |
| fichier resté tel que généré | remplacé par le nouveau modèle |
| fichier partagé (`.gitignore`, `.gitattributes`, `settings.json`, `.archgate/config.json`) | fusionné |
| fichier modifié, modèle inchangé | laissé tel quel (`customized`) |
| fichier modifié, modèle changé | **conflit** : diff proposé, jamais écrasé |
| fichier que le modèle ne produit plus | signalé (`retired`), jamais supprimé |

## Migrations hors fichiers
Ce qui n'est pas un fichier (réglage du dépôt, labels, protection de branche) se corrige par une migration dans `migrations/`, un module `.mjs` par migration, numéroté (`0001-…`) :

```js
export const id = "0001-actions-pr-permission";
export const title = "…";
export const modules = ["release"];          // modules du projet qui la rendent utile
export function plan({ gh, repo, target, manifest }) {
  // vérifie l'état réel ; renvoie [] s'il est déjà conforme, sinon [{ description, command, run }]
}
```

`scripts/migrate.mjs` simule par défaut ; `--apply` exécute les actions et consigne l'identifiant dans le manifeste. Toute action visible hors de la machine demande l'accord de l'utilisateur, comme dans le reste du skill.

## Pas encore géré
- Fusion à trois voies (la version de base se régénérerait depuis l'étiquette git du plugin enregistré).
- Zones gérées délimitées par des marqueurs dans `CLAUDE.md`, `docs/workflow.md` et `ci.yml`.
- Reconnaissance automatique des fichiers non modifiés d'une version antérieure au manifeste (table d'empreintes par version).
- Retrait d'un module.
