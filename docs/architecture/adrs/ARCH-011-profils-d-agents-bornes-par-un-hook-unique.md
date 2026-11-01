---
id: ARCH-011
title: Profils d'agents bornés par un hook unique
domain: architecture
rules: false
files: ["skills/project-bootstrap/assets/modules/agent-profiles/**"]
---

# Profils d'agents bornés par un hook unique

## Statut

Accepté. ARCH-012 en décide les outils `Agent` et `Skill`.

## Context

Le module `agent-profiles` génère des profils d'agents (`.claude/agents/*.md`) qui doivent borner ce que chaque rôle écrit et exécute. Les essais de l'issue #32 (Claude Code 2.1.316) fixent les moyens disponibles :

- la liste `tools` du frontmatter est respectée par un sous-agent et par un teammate ;
- un hook de frontmatter bloque un sous-agent, mais ne s'applique pas à un teammate ;
- les règles `permissions.allow` / `deny` s'appliquent aux teammates, mais à toute la session et non par profil ;
- un hook `PreToolUse` de `.claude/settings.json` se déclenche pour l'agent principal, un sous-agent et un teammate, et son entrée porte `agent_id` et `agent_type`. `agent_type` est le nom du profil pour un sous-agent et le nom du teammate pour un teammate.

## Decision

1. **Droits d'outils par profil** : la liste `tools` du frontmatter, respectée en sous-agent et en équipe. Les outils `Agent` et `Skill` des profils et ce qu'ils peuvent lancer sont décidés par ARCH-012.
2. **Bornes d'écriture et de commandes par un hook unique** : `.claude/hooks/profile-guard.mjs`, déclaré dans `.claude/settings.json` (événement `PreToolUse`, outils d'écriture, `Bash` et `PowerShell`, plus `Agent`, `Task` et `Skill` selon ARCH-012). Il lit `agent_type` et applique la table `PROFILES` (profil, préfixes d'écriture permis, commandes de shell permises en plus de la lecture seule). Un `agent_type` absent de la table (agent principal, autre agent) n'est pas borné. Pour un profil de la table, une entrée incomplète ou une erreur interne est un refus (code 2).
3. **Convention de nommage** : un teammate porte le nom de son profil (`qa-engineer`). Un teammate nommé autrement n'est pas borné.
4. **Lecture seule du shell** : le hook délègue à `read-only-bash.mjs` (module `claude`) ; les commandes supplémentaires d'un profil sont des motifs ancrés sur la commande entière, sans séparateur ni redirection. Le titre d'un ADR se limite aux lettres, chiffres et à la ponctuation simple, car PowerShell évalue les parenthèses et traite les guillemets typographiques comme des guillemets doubles.
5. **Pas de hook de frontmatter** dans les profils générés : il ne protégerait pas les teammates.
6. **Coexistence** : les agents existants (`architecture-explorer`, `arc42-keeper`, `spec-reviewer`, `traceability-checker`) ne changent pas ; leur absorption fait l'objet d'une autre décision.

## Do's and Don'ts

### Do

- Ajouter un profil en ajoutant son fichier `.claude/agents/<nom>.md` et sa ligne dans `PROFILES`.
- Nommer un teammate comme son profil.
- Tester la table dans `assets/modules/agent-profiles/tests/` avec un `agent_type` de sous-agent et de teammate.

### Don't

- Ne pas compter sur un hook de frontmatter pour borner un profil utilisé en équipe.
- Ne pas déclarer `agent` dans `.claude/settings.json` : le choix de l'agent principal appartient à une autre décision.

## Consequences

### Positive

- Un seul mécanisme borne sous-agents et teammates, sans dépendre d'une règle globale.
- La table des droits tient dans un fichier lisible et testable.

### Negative

- Un hook `node` s'exécute à chaque écriture et commande shell de la session, y compris pour l'agent principal (démarrage de Node, quelques dizaines de millisecondes) ; une commande d'un profil qui ne correspond à aucun motif de la table lance un second `node` pour `read-only-bash.mjs`.
- La bonne application dépend du nom du teammate.
- Le bornage est un garde-fou contre l'erreur d'un agent, pas un bac à sable : voir les risques.

### Risks

- Un profil peut écrire un fichier exécutable dans son périmètre puis le faire exécuter : `qa-engineer` écrit `tests/x.test.mjs` puis lance `node .bootstrap/run-checks.mjs` ; `architect` écrit une règle `*.rules.ts` puis lance `archgate check`. Le bornage ne l'empêche pas ; la relecture humaine des changements reste la garantie.
- Un teammate nommé autrement, ou le profil intégré `Explore` (qui reçoit tout l'outillage en équipe), n'est pas borné ; documenté dans `pitfalls.md`.
- Un teammate isolé dans un worktree écrit sous `.claude/worktrees/<nom>/` : ses écritures légitimes sont refusées, car le chemin est calculé depuis `CLAUDE_PROJECT_DIR`.
- La casse compte : `Tests/` est refusé, y compris sous Windows (refus à tort, sans risque). Les liens et jonctions ne sont pas résolus.
- Retirer le module `agent-profiles` ne supprime ni le hook déjà déclaré dans `settings.json` ni les fichiers générés ; sans la table, le hook ne borne plus rien.
- Un changement futur du contenu de `agent_type` casserait la correspondance : les tests de contrat du module la vérifient.

## Compliance and Enforcement

Tests du module (`assets/modules/agent-profiles/tests/profile-guard.test.mjs`) pour la table et le hook ; tests de génération et instantanés de la matrice pour les profils et la déclaration dans `settings.json`. Pas de règle Archgate : le sujet est du contenu de modèles.

## References

- Issue #33 ; changement OpenSpec `33-agent-profiles-module`
- ARCH-012 (agents, skills et commandes lançables par un profil)
- Issue #32 et `skills/project-bootstrap/references/agent-profiles-prototype.md` (constats)
- ARCH-010 (modules auto-décrits)
