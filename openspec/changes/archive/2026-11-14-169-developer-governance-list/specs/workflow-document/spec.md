# Spec Delta

## ADDED Requirements

### Requirement: Liste de gouvernance de developer dans « Qui fait quoi »
Avec `agent-profiles`, la cellule d'écriture de la ligne `developer` du `docs/workflow.md` généré SHALL citer, entre accents graves et séparées par des virgules, exactement les entrées de `writeExcept` du profil `developer` du hook généré, dans le même ordre, sans autre élément entre accents graves. Les deux langues MUST respecter cette égalité ; le test de génération MUST échouer, en nommant les entrées, à la moindre divergence.

#### Scenario: Liste du tableau égale à la liste du hook
- **WHEN** un projet est généré avec `agent-profiles`, en français puis en anglais
- **THEN** la liste de la ligne `developer` égale `writeExcept` de `.claude/hooks/profile-guard.mjs`, entrée par entrée et dans le même ordre

#### Scenario: Entrée de fichier et d'archive citée
- **WHEN** la ligne `developer` est lue dans le document généré
- **THEN** elle cite `openspec/changes/archive/`, `openspec/config.yaml`, `claude.md` et `release-please-config.json`

#### Scenario: Liste présente sans module optionnel
- **WHEN** seuls `claude` et `agent-profiles` sont sélectionnés
- **THEN** la ligne `developer` porte la liste complète, sans dépendre d'un autre module

#### Scenario: Entrée manquante dans le tableau
- **WHEN** le tableau généré omet `openspec/schemas/`
- **THEN** le test échoue en nommant `openspec/schemas/`

#### Scenario: Entrée ajoutée au hook seulement
- **WHEN** une entrée est ajoutée à `writeExcept` sans l'être au modèle de `workflow.md`
- **THEN** le test échoue en nommant l'entrée, en français comme en anglais

#### Scenario: Ordre différent
- **WHEN** le tableau cite les mêmes entrées dans un autre ordre que `writeExcept`
- **THEN** le test échoue en signalant l'ordre

#### Scenario: Entrée citée deux fois
- **WHEN** le tableau cite deux fois `.github/`
- **THEN** le test échoue en nommant `.github/` comme entrée répétée

#### Scenario: Élément en trop entre accents graves
- **WHEN** la cellule d'écriture de `developer` cite entre accents graves un élément absent de `writeExcept`, par exemple dans la phrase qui suit la liste
- **THEN** le test échoue en nommant l'élément
