## 1. Catalogue et skill

- [x] 1.1 `module.json` d'`agent-profiles` : question de phase 0
- [x] 1.2 `SKILL.md` : question posée en phase 0, annonce en phase 1
- [x] 1.3 `bootstrap-config.md` : description de la question

## 2. Tests

- [x] 2.1 `scaffold.test.mjs` : la question est listée par `--list-modules` (JSON et tableau), cite `mainAgent` et le défaut

## 3. Validation

- [x] 3.1 `node .bootstrap/run-checks.mjs`, `node .claude/hooks/quality-gate.mjs`, `openspec validate --all --strict`
