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
| fichier modifié, modèle changé, base valide | **fusion à trois voies** : sans conflit, écrite et consignée `reconciled` ; avec conflit, rien n'est écrit et la proposition avec marqueurs est dans `diffs` (`--diff`) |
| fichier modifié, modèle changé, base absente ou invalide | **conflit** : diff proposé, jamais écrasé (`baseInvalid` si la base est altérée) |
| fichier que le modèle ne produit plus | signalé (`retired`), jamais supprimé |

## Base et fusion à trois voies
À chaque génération ou mise à jour, `scaffold.mjs` conserve dans `.bootstrap/base/<chemin>.base` ce que le modèle a produit (LF), pour les fichiers du modèle qui ne sont ni partagés (`.gitignore`, `settings.json`…), ni `owned`, ni `keep`. Le suffixe `.base` évite que les outils du projet traitent ces copies comme du code. La base est valide si son empreinte, après normalisation en LF, égale `generated` du manifeste ; sinon elle est ignorée et signalée (`baseInvalid`).

- Fusion par `git merge-file` (git est déjà requis pour les diffs). Les fins de ligne CRLF du fichier du projet sont restituées.
- Un fichier fusionné prend le statut `reconciled` : il n'est jamais remplacé par le modèle aux mises à jour suivantes, mais refusionné.
- Jamais de marqueurs de conflit écrits dans un fichier du projet.
- Une fusion sans conflit peut produire un fichier invalide (clé YAML en double, étape ajoutée des deux côtés) : relire `ci.yml` et les hooks avant de commiter.
- Un fichier aux fins de ligne mélangées est réécrit entièrement en CRLF.
- La date de génération est enregistrée dans `config.date` : un manifeste antérieur sans date reçoit la date du jour à la première mise à jour, ce qui peut changer une fois la date écrite dans ARCH-004 si ce fichier est resté tel que généré.
- Les bases de fichiers que le modèle ne produit plus restent en place (rien n'est supprimé).

## Fichiers propres au projet
Une entrée du catalogue (`assets/modules.json`) marquée `"owned": true` est créée à la première génération, puis appartient au projet : jamais remplacée, fusionnée ni signalée en conflit, consignée `kept` dans le manifeste. C'est le cas de `.bootstrap/checks.json` (commandes de tests et systèmes de la CI). Pas besoin de la lister dans `keep`.

## Chaîne d'outils de la CI : `project-setup`
`ci.yml` est entièrement géré par le plugin. L'installation de la chaîne d'outils du projet (langage, dépendances) se place dans `.github/actions/project-setup/action.yml`, une action composite locale créée une seule fois (`owned`) et appelée par `ci.yml` avant les commandes de `.bootstrap/checks.json`. Les noms des jobs et des checks ne changent pas. L'action utilise `bash` (exécuteurs hébergés) ; une installation qui change la version de Node doit garder Node ≥ 20.19, nécessaire à `run-checks.mjs`.

Mise à jour d'un projet généré avant ce point d'extension : l'action est créée ; `ci.yml` est remplacé s'il est resté tel que généré, fusionné à partir de sa base si la modification du projet est éloignée de l'ancien commentaire d'installation (rapporté `reconciled` : le relire), et sinon signalé en conflit. Pour résoudre le conflit : déplacer l'étape d'installation dans l'action, reprendre le `ci.yml` du modèle (ou `--adopt`), puis relancer `--update`.

## Migrations hors fichiers
Ce qui n'est pas un fichier (réglage du dépôt, labels, protection de branche) se corrige par une migration dans `migrations/`, un module `.mjs` par migration, numéroté (`0001-…`) :

```js
export const id = "0001-actions-pr-permission";
export const title = "…";
export const modules = ["release"];          // modules du projet qui la rendent utile
export function plan({ gh, repo, target, manifest }) {
  // vérifie l'état réel ; renvoie [] s'il est déjà conforme, sinon [{ description, command, run }]
  // ou { actions, notes } : les notes sont des informations à présenter, jamais exécutées
}
```

`scripts/migrate.mjs` simule par défaut ; `--apply` exécute les actions et consigne l'identifiant dans le manifeste. Toute action visible hors de la machine demande l'accord de l'utilisateur, comme dans le reste du skill.

## Pas encore géré
- Zones gérées délimitées par des marqueurs dans `CLAUDE.md`, `docs/workflow.md` et `ci.yml`.
- Reconnaissance automatique des fichiers non modifiés d'une version antérieure au manifeste (table d'empreintes par version).
- Retrait d'un module.
