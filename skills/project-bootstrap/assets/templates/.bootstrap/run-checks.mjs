#!/usr/bin/env node
// Commandes propres au projet (tests, linter, types, build), déclarées dans .bootstrap/checks.json.
// Le contrôle qualité local (.claude/hooks/quality-gate.mjs, donc le pre-push) et la CI lisent cette même liste.
// Format d'une commande : { "name": "tests", "command": "npm test", "os": ["linux", "windows", "macos"], "blocking": true }
//   os : facultatif (toutes les plateformes par défaut) ; blocking : facultatif (true par défaut), sinon signalé seulement.
// Usage : node .bootstrap/run-checks.mjs [--print-os]   (--print-os : systèmes de la CI, en JSON)
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OS_NAMES = ["linux", "windows", "macos"];
const current = { linux: "linux", win32: "windows", darwin: "macos" }[process.platform] ?? process.platform;

export function loadConfig() {
  const config = JSON.parse(readFileSync(new URL("./checks.json", import.meta.url), "utf8"));
  if (!Array.isArray(config.checks)) throw new Error("checks.json : « checks » doit être un tableau");
  for (const [i, c] of config.checks.entries()) {
    const at = `checks.json : commande n°${i + 1}`;
    if (typeof c.name !== "string" || !c.name) throw new Error(`${at} : « name » manquant`);
    if (typeof c.command !== "string" || !c.command) throw new Error(`${at} (${c.name}) : « command » manquant`);
    if (c.os !== undefined && !(Array.isArray(c.os) && c.os.every((o) => OS_NAMES.includes(o)))) {
      throw new Error(`${at} (${c.name}) : « os » doit être un sous-ensemble de ${OS_NAMES.join(", ")}`);
    }
    if (c.blocking !== undefined && typeof c.blocking !== "boolean") throw new Error(`${at} (${c.name}) : « blocking » doit être un booléen`);
  }
  return config;
}

// Exécute les commandes applicables au système courant. Renvoie les échecs bloquants et les avertissements.
export function runChecks() {
  const failures = [];
  const warnings = [];
  for (const c of loadConfig().checks) {
    if (c.os && !c.os.includes(current)) continue;
    // shell requis pour résoudre les shims .cmd sous Windows ; la commande vient du fichier versionné du projet
    const res = spawnSync(c.command, { encoding: "utf8", shell: true });
    if (res.status === 0) continue;
    const report = `$ ${c.command}\n${res.stdout ?? ""}${res.stderr ?? ""}`;
    (c.blocking === false ? warnings : failures).push(c.blocking === false ? `${c.name} (non bloquant) : échec\n${report}` : `${c.name} : échec\n${report}`);
  }
  return { failures, warnings };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.includes("--print-os")) {
      console.log(JSON.stringify(loadConfig().ciOs));
    } else {
      const { failures, warnings } = runChecks();
      for (const w of warnings) process.stderr.write(`${w}\n`);
      if (failures.length > 0) {
        process.stderr.write(`Commandes du projet en échec :\n\n${failures.join("\n")}\n`);
        process.exit(1);
      }
    }
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }
}
