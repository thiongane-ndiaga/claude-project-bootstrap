## Contexte

Le catalogue (ARCH-010) porte un champ `questions` par module : des textes que `SKILL.md` fait poser pour chaque module choisi. Les réponses ne sont pas consommées par un schéma ; le skill les reporte dans `bootstrap.json`. La seule clé de configuration d'`agent-profiles` est `mainAgent` (#35).

## Décisions

- **D1. Une seule question aujourd'hui** : celle qui configure une fonctionnalité existante. Les questions des profils optionnels et de l'advisor sont déclarées par #34 et #36, avec leurs modules.
- **D2. Texte de la question** : explicite sur la portée (toutes les sessions du clone) et sur le défaut (non), car le choix remplace l'agent par défaut et s'impose à l'agent du plugin Archgate.
- **D3. Annonce en phase 1** : le dry-run rapporte déjà les `warnings` (agent existant) ; `SKILL.md` demande de les présenter avec le choix.
- **D4. Pas d'ADR** : application de ARCH-010 (questions de module) et ARCH-013 (`mainAgent`).
