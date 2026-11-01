#!/usr/bin/env node
// Lance les tests propres aux modules : assets/modules/<module>/tests/*.test.mjs (ARCH-010).
// Usage : node tests/modules.test.mjs [--root <dossier du plugin>]   (--root : copie du plugin, pour les essais)
// Code de sortie : 0 si tous les tests de module passent (ou s'il n'y en a aucun), 1 sinon.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const rootArg = process.argv.indexOf("--root");
const root = rootArg > 0 ? path.resolve(process.argv[rootArg + 1]) : path.join(here, "..");
const modulesDir = path.join(root, "skills", "project-bootstrap", "assets", "modules");

let found = 0;
const failed = [];
for (const name of existsSync(modulesDir) ? readdirSync(modulesDir).sort() : []) {
  const testsDir = path.join(modulesDir, name, "tests");
  if (!existsSync(testsDir)) continue;
  for (const file of readdirSync(testsDir).filter((f) => f.endsWith(".test.mjs")).sort()) {
    found++;
    const res = spawnSync(process.execPath, [path.join(testsDir, file)], { encoding: "utf8", env: { ...process.env, PLUGIN_ROOT: root } });
    const ok = res.status === 0;
    console.log(`${ok ? "ok  " : "FAIL"} module ${name} : ${file}${ok ? "" : ` — code ${res.status}\n${(res.stdout + res.stderr).trim().split("\n").slice(-8).join("\n")}`}`);
    if (!ok) failed.push(`${name}/${file}`);
  }
}
if (found === 0) console.log("ok   aucun test de module (rien à lancer)");
console.log(failed.length ? `\n${failed.length} test(s) de module en échec : ${failed.join(", ")}` : "\nTous les tests de module passent");
process.exit(failed.length ? 1 : 0);
