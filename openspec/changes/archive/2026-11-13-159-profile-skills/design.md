## Contexte

Le hook `profile-guard.mjs` borne l'outil `Skill` par la liste `skills` de chaque profil (ARCH-012) et refuse un skill à `context: fork`. `developer` a un shell non borné ; sa liste est vide et son frontmatter n'a pas `Skill`.

## Décisions

1. **`developer` lance `openspec-apply-change` et `opsx:apply`, rien d'autre.** Le skill ne lance aucun agent et n'a pas `context: fork` ; il écrit du code et `tasks.md`, ce que la table autorise. Le garde-fou reste la liste : un autre skill (`archgate:reviewer`, `opsx:archive`, `opsx:sync`) est refusé. Le shell de `developer` n'étant pas borné, le skill n'élargit pas ses droits réels.
2. **Les deux noms du skill sont permis.** Le nom de l'outil est celui de la commande (`opsx:apply`) ou du skill (`openspec-apply-change`) selon la façon dont il est invoqué ; `business-analyst` a déjà les deux formes pour `propose` et `update`.
3. **`architect` ajoute `archgate:cli-reference`** : la référence ne lance pas d'agent. Il n'y a pas de forme `opsx`. La liste d'`architect` n'est complétée qu'avec `archgate-plugin`, comme `archgate:adr-author`.
4. **`archgate:planner` et `archgate:reviewer` restent exclus.** Ils contredisent ARCH-012 (décisions 3 et 4 et section « Don't ») : l'un porte tous les outils, l'autre lance des agents refusés. Les rouvrir demanderait un ADR qui affaiblit le bornage ; la planification est le rôle d'`architect` (ADR, options), la vérification ADR celui de `qa-engineer` (`archgate review-context`).
5. **`/opsx:sync` et `/opsx:archive` ne changent pas** : ils déplacent des fichiers de `openspec/specs/` et de l'archive, interdits à `developer` ; `project-lead` archive par `openspec archive <id> --yes`.

## Risques

- Le skill `openspec-apply-change` évolue avec OpenSpec : un futur `context: fork` ou une instruction qui lance un agent le ferait refuser par le hook (cas déjà couvert par « Skills à contexte isolé » ; revue du skill à chaque mise à jour d'OpenSpec, comme pour les autres skills de la table).
- Que `developer` lance le skill sans que `project-lead` le lui demande n'est pas constaté en session réelle : le profil le demande par texte, le hook ne fait que permettre.

## Non observé

Aucun essai réel d'un sous-agent `developer` chargeant le skill n'a été fait ; les tests couvrent le hook et la génération.
