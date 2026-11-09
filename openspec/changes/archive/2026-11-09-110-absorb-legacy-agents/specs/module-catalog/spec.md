## MODIFIED Requirements

### Requirement: Propriété des fichiers et condition de génération
Un fichier appartient au module qui le déclare. Il n'est généré que si ce module et tous les modules de son `when` sont actifs ; le catalogue assemblé SHALL exposer cette condition complète, avec le propriétaire en premier. Le propriétaire cité dans `when` est toléré et un doublon ignoré. Les fichiers SHALL être triés par chemin.

#### Scenario: Condition de génération
- **WHEN** `arc42` déclare `.claude/hooks/restrict-path.mjs` avec `when: ["claude", "legacy-agents"]`
- **THEN** le fichier n'est généré que si `arc42` et `claude` sont choisis et `agent-profiles` ne l'est pas

#### Scenario: Pseudo-module dans when
- **WHEN** un `when` cite `cli-local`
- **THEN** il est accepté, alors qu'un `requires` ou `conflicts` ne peut pas citer un pseudo-module
