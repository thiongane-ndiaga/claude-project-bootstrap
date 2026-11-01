## 1. Hook et génération

- [x] 1.1 Créer le modèle `session-path.mjs` (français) et sa version anglaise dans le module `claude`, déclaré `when: ["cli-local"]` dans `module.json`
- [x] 1.2 Déclarer le hook `SessionStart` dans `buildSettings` (`scaffold.mjs`) quand `cli-local` est actif

## 2. Tests

- [x] 2.1 Tests de `scaffold.test.mjs` : présence/absence du fichier et de la déclaration selon le mode ; exécution du hook (écriture, ajout sans écrasement, sans variable, écriture impossible, chemin avec espace et apostrophe) ; relecture de la ligne par Bash ; modèle anglais ; `--update`
- [x] 2.2 Régénérer l'instantané `default-cli-local` ; vérifier que les autres sont inchangés

## 3. Documentation

- [x] 3.1 `docs/workflow.md` (fr/en) : section Nouveau poste du mode `local`
- [x] 3.2 `references/pitfalls.md` et `references/verification.md` : limite PowerShell/terminal, essai réel
- [x] 3.3 ARCH-007 (Décision 2, Do, Négatif)
- [x] 3.4 arc42 (concepts transverses, risques) via `arc42-keeper`, après l'ADR

## 4. Validation

- [x] 4.1 Essai réel sur ce poste : projet généré en mode `local`, `claude` lancé directement, `command -v openspec` trouvé dans l'outil Bash, introuvable dans l'outil PowerShell (limite confirmée)
- [x] 4.2 Linux et macOS : couverts par la CI (le test relit la ligne avec Bash sur les trois systèmes) ; pas d'essai manuel
- [x] 4.3 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `openspec validate --all --strict`
