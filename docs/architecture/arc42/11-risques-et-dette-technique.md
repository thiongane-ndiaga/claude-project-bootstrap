# 11. Risques et dette technique

> Les risques connus et la dette technique, par ordre de priorité.

| Risque / dette | Probabilité | Impact | Mesure envisagée |
|---|---|---|---|
| Session Claude Code lancée sans `npm run claude` en mode `local` : `openspec` introuvable | Moyenne | Faible | Démarrer par `npm run claude` ; hook, CI et audit ajoutent déjà `node_modules/.bin` au `PATH` ([ARCH-007](../adrs/ARCH-007-installation-des-cli-d-outillage.md)) |
| Mise à jour manuelle des `devDependencies` en mode `local` (Dependabot ne couvre que `github-actions`) | Moyenne | Faible | `npm install --save-exact` ([ARCH-007](../adrs/ARCH-007-installation-des-cli-d-outillage.md)) |
| `package.json` existant conservé tel quel : `devDependencies` à ajouter à la main | Moyenne | Faible | Documenté dans l'ADR |
| Deux versions de chaque modèle à maintenir (français et langue traduite) | Haute | Moyen | Modifier les deux dans la même PR ; tests de parité ([ARCH-008](../adrs/ARCH-008-modeles-de-documentation-par-langue.md)) |
| Écart de sens entre deux versions, ou français sans accent dans un modèle sans version traduite : non détectable par les tests | Moyenne | Moyen | Relecture en PR ([ARCH-008](../adrs/ARCH-008-modeles-de-documentation-par-langue.md)) |
| Langue autre que `fr` et celles de `templates.*` refusée (le skill ne traduit plus) | Moyenne | Faible | Ajouter un dossier `templates.<code>/` ([ARCH-008](../adrs/ARCH-008-modeles-de-documentation-par-langue.md)) |

- Quels risques pèsent sur les objectifs de qualité ?
- Quelle dette est acceptée consciemment, et jusqu'à quand ?

_À rédiger._
