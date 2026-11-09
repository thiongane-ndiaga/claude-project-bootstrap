#!/usr/bin/env node
// Tests du hook compact-recall.mjs (#39) : rappel lu sur le disque, sous-dossier, dépôt vide, CRLF.
// Lancé par tests/modules.test.mjs ou seul : node compact-recall.test.mjs
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const modules = path.join(here, "..", "..");

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` — ${detail}`}`);
  if (!ok) failures++;
};

// projet d'essai hors de tout dépôt git : GIT_CEILING_DIRECTORIES empêche de remonter vers un dépôt parent
const base = mkdtempSync(path.join(tmpdir(), "pb-recall-"));
const project = path.join(base, "projet avec espace");
for (const lang of ["templates", "templates.en"]) {
  const dest = path.join(project, lang);
  mkdirSync(path.join(dest, ".claude", "hooks"), { recursive: true });
  cpSync(path.join(modules, "compact-recall", lang, ".claude", "hooks", "compact-recall.mjs"), path.join(dest, ".claude", "hooks", "compact-recall.mjs"));
}
const run = (lang, cwd = path.join(project, lang)) => {
  const res = spawnSync(process.execPath, [path.join(project, lang, ".claude", "hooks", "compact-recall.mjs")], { cwd, encoding: "utf8", env: { ...process.env, GIT_CEILING_DIRECTORIES: base } });
  return { code: res.status, out: res.stdout, err: res.stderr };
};

for (const [lang, word] of [["templates", "tâches faites"], ["templates.en", "tasks done"]]) {
  const root = path.join(project, lang);
  const empty = run(lang);
  check(`${lang} : dépôt sans openspec ni git, code 0 et rappel de lecture`, empty.code === 0 && /CLAUDE\.md/.test(empty.out) && !/openspec|OpenSpec/i.test(empty.out.split("\n").slice(1).join("\n")), empty.err);

  const changes = path.join(root, "openspec", "changes");
  mkdirSync(path.join(changes, "12-x"), { recursive: true });
  mkdirSync(path.join(changes, "archive", "2026-01-01-9-old"), { recursive: true });
  mkdirSync(path.join(changes, "13-sans-tasks"), { recursive: true });
  writeFileSync(path.join(changes, "12-x", "tasks.md"), "## 1.\n\n- [x] a\n- [X] b\n  - [ ] c\n- [ ] d\n- [ ] e\n");
  writeFileSync(path.join(changes, "archive", "2026-01-01-9-old", "tasks.md"), "- [x] z\n");
  const r = run(lang);
  check(`${lang} : changement en cours avec 2/5, archive et dossier sans tasks.md ignorés`, r.code === 0 && r.out.includes(`12-x`) && r.out.includes(`2/5 ${word}`) && !r.out.includes("old") && !r.out.includes("13-sans-tasks"), r.out);

  mkdirSync(path.join(root, "src"), { recursive: true });
  const sub = run(lang, path.join(root, "src"));
  check(`${lang} : lancé depuis un sous-dossier, même rappel`, sub.code === 0 && sub.out === r.out, sub.out);

  writeFileSync(path.join(changes, "12-x", "tasks.md"), "- [x] a\r\n  - [X] b\r\n- [ ] c\r\n");
  const crlf = run(lang);
  check(`${lang} : fins de ligne CRLF et case [X] indentée comptées`, crlf.out.includes("2/3"), crlf.out);

  for (let i = 0; i < 12; i++) {
    mkdirSync(path.join(changes, `2${String(i).padStart(2, "0")}-c`), { recursive: true });
    writeFileSync(path.join(changes, `2${String(i).padStart(2, "0")}-c`, "tasks.md"), "- [ ] t\n");
  }
  const many = run(lang);
  check(`${lang} : au plus dix changements listés`, many.out.split("\n").filter((l) => l.startsWith("- 2")).length + (many.out.includes("12-x") ? 1 : 0) <= 10 && /… \d+ (autres|more)/.test(many.out), many.out);
}

process.exit(failures ? 1 : 0);
