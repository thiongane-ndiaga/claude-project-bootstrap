## Context

La classification d'un fichier généré se fait dans `scaffold.mjs` (boucle sur les fichiers produits) : `keep` et `owned`, création, identique, « resté tel que généré » (remplacé), « modèle inchangé » (`customized`), fusion par lignes ou JSON, `--adopt`, puis conflit. Le manifeste enregistre par fichier `sha256` (fichier tel qu'écrit), `generated` (empreinte du contenu produit par le modèle) et `status`. Les conflits ne sont jamais écrits ; `--diff` ajoute un diff au rapport. Voir proposal.md pour la motivation et ARCH-006 pour la décision.

Le contenu produit contient `{{DATE}}` pour un seul modèle (ARCH-004), évalué à `config.date ?? aujourd'hui`. `config` vient de `--config` ou, à défaut, du manifeste : sans date enregistrée, ce fichier est considéré chaque jour comme dont le modèle a changé.

## Goals / Non-Goals

**Goals:**
- Fusionner sans conflit les modifications éloignées du projet et du modèle, pour tout fichier généré non partagé.
- Ne jamais écrire de marqueurs de conflit ni écraser une personnalisation.
- Rester sans dépendance npm et sur Windows, Linux, macOS.
- Ne pas gêner les outils du projet avec les copies de base.

**Non-Goals:**
- Séparer le contenu géré (#82, #83), reconnaître les projets sans manifeste (#84).
- Valider la syntaxe du résultat (un YAML fusionné propre peut rester invalide : la relecture de `ci.yml` et des hooks reste obligatoire).
- Fusionner les fichiers déjà traités par `mergeLines` ou `mergeJson`.

## Decisions

**D1. Base stockée dans `.bootstrap/base/<chemin>.base`, pour tout fichier généré non partagé, ni `owned`, ni `keep`, ni `status: kept`.** Le suffixe `.base` écarte la base des outils du projet (`tsc`, linters, `node --test`, formateurs), qui ignorent une extension inconnue ; la copie `rules.ts` d'un ADR, par exemple, n'est plus un fichier TypeScript. Cela précise l'ADR ARCH-006 (point 1), qui fixait `.bootstrap/base/<chemin>` : un addendum le consigne. Alternatives : suffixe seul sans dossier (disperse les fichiers), `.gitattributes` `linguist-generated` (n'arrête pas les outils). La base est écrite quand l'empreinte du contenu produit égale `generated` de l'entrée finale : création, remplacement, fusion, adoption, mais aussi fichier `customized` dont le modèle n'a pas bougé (la base manquante se reconstitue sans réseau). Un fichier en conflit conserve son ancienne entrée et son ancienne base.

**D2. Fusion par `git merge-file -p --diff3` sur des copies temporaires LF, avec les étiquettes `projet`, `base`, `modele`.** Alternative : un diff3 en JavaScript (environ 200 lignes à maintenir). `git` est déjà exigé pour `diffText`. Le code de sortie donne le nombre de conflits : 0 fusion propre, 1 à 127 conflits ; toute autre valeur, un `status` nul (signal) ou une erreur de lancement est un échec, traité comme absence de fusion.

**D3. Statut `reconciled` après une fusion propre.** `created` ferait remplacer le fichier à la mise à jour suivante par la règle « resté tel que généré » (son `sha256` égalerait celui du manifeste) ; `merged` désigne les fichiers partagés. `reconciled` n'est jamais traité comme intact : l'entrée prend `generated` = nouveau modèle et la base devient le nouveau modèle. Si la fusion redonne exactement le fichier actuel, rien n'est réécrit : le fichier est rapporté dans `identical`, avec la même mise à jour de l'entrée et de la base.

**D4. Rang dans la classification : après `customized` (modèle inchangé), avant la fusion partagée, `--adopt` et le conflit.** Conditions : entrée du manifeste existante qui n'est pas `kept`, base valide, fichier ≠ modèle. Pour un fichier partagé (`merge` défini), le mécanisme existant garde la priorité. `--adopt` n'intervient qu'en cas de conflit : une fusion propre l'emporte. `--dry-run` rapporte `reconciled` sans rien écrire.

**D5. Fins de ligne.** Lecture normalisée (`readText`), y compris pour l'empreinte de la base ; fusion en LF ; écriture restaurée en CRLF si le fichier d'origine contenait `\r\n`. Un fichier aux fins de ligne mélangées est écrit entièrement en CRLF : acceptable et documenté.

**D6. Date figée.** Priorité : `config.date` fournie, puis `previous.config.date`, puis la date du jour ; le résultat est enregistré dans le manifeste. `--update --config` sans date conserve donc la date enregistrée. Pour un manifeste existant sans date, la date du jour est figée à la première mise à jour : le contenu d'ARCH-004 peut changer une fois, avec une conséquence limitée à un fichier resté tel que généré (documenté dans `versioning.md`).

**D7. Rapport.** Nouvelle clé `reconciled` (liste) et `baseInvalid` (liste des fichiers dont la base est présente mais invalide). La proposition de fusion avec marqueurs remplace, sous `diffs[fichier]`, le diff simple avec le modèle quand la base est valide, comme le prévoit ARCH-006. Les bases de fichiers que le modèle ne produit plus restent en place et ne sont pas supprimées ; le fichier lui-même est signalé dans `retired` comme aujourd'hui.

## Risks / Trade-offs

- [Fusion propre mais invalide, en particulier `ci.yml`] → documenté ; le skill demande la relecture de ce qui s'exécute (`ci.yml`, hooks), et `reconciled` figure dans le rapport pour qu'il soit relu.
- [Version de git ou réglages de l'utilisateur (`merge.conflictStyle`)] → style fixé par option explicite, étiquettes fixes ; tests sous les trois systèmes en CI.
- [`.bootstrap/base/` ajoute des fichiers au projet] → versionnés, petits, avec un suffixe neutre ; documentés dans `versioning.md`.
- [Base altérée ou réécrite par un formateur] → l'empreinte est contrôlée, repli sur le conflit, et `baseInvalid` le dit au lieu d'un échec silencieux.
- [Projets antérieurs sans base] → premier conflit comme aujourd'hui ; la base est constituée à l'adoption ou à la première mise à jour sans conflit.
- [Bit exécutable] → `writeFileSync` sur un fichier existant en conserve les droits (vérifié par un test sous POSIX).

## Migration Plan

Aucune migration de fichier : la première `--update` après la mise à jour du plugin écrit `.bootstrap/base/` et `config.date`. Retour arrière : supprimer le dossier ; le comportement est celui d'avant.
