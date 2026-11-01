# Conditions GitHub Free à revérifier

Les chiffres changent : relève-les dans la doc du jour, cite la source, ne donne rien de mémoire.

| Point | Où vérifier |
|---|---|
| Ce qu'inclut Free (public / privé) | https://docs.github.com/en/get-started/learning-about-github/githubs-plans |
| Crédit et tarifs Actions, blocage au-delà | https://docs.github.com/en/billing/concepts/product-billing/github-actions |
| Branches protégées par plan | https://raw.githubusercontent.com/github/docs/main/data/reusables/gated-features/protected-branches.md |
| Rulesets par plan | https://raw.githubusercontent.com/github/docs/main/data/reusables/gated-features/repo-rules.md |
| Automatisations natives de Projects | https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-built-in-automations |

Les fichiers `gated-features` bruts sont plus fiables que les pages rendues, qui omettent souvent la phrase de disponibilité.

État constaté le 29/10/2026 (à confirmer) : branches protégées et rulesets en **public** seulement sur Free ; crédit Actions mensuel pour le privé (12 $, Linux 0,006 $/min, Windows 0,010 $/min), usage bloqué au-delà sans moyen de paiement ; runners standards gratuits en public ; Pages en public seulement.

Dependabot (module `dependabot`) : chaque PR de mise à jour lance la CI; en dépôt privé elle consomme des minutes du crédit Actions mensuel (le regroupement hebdomadaire en une seule PR limite ce coût).
