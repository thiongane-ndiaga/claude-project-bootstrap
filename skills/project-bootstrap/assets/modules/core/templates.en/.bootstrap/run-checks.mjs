#!/usr/bin/env node
// Project-specific commands (tests, linter, types, build), declared in .bootstrap/checks.json.
// The local quality check (.claude/hooks/quality-gate.mjs, hence the pre-push) and the CI read this same list.
// Format of a command: { "name": "tests", "command": "npm test", "os": ["linux", "windows", "macos"], "blocking": true }
//   os: optional (all platforms by default); blocking: optional (true by default), otherwise only reported.
// Usage: node .bootstrap/run-checks.mjs [--print-os]   (--print-os: CI systems, as JSON)
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OS_NAMES = ["linux", "windows", "macos"];
const current = { linux: "linux", win32: "windows", darwin: "macos" }[process.platform] ?? process.platform;

export function loadConfig() {
  const config = JSON.parse(readFileSync(new URL("./checks.json", import.meta.url), "utf8"));
  if (!Array.isArray(config.checks)) throw new Error("checks.json: \"checks\" must be an array");
  for (const [i, c] of config.checks.entries()) {
    const at = `checks.json: command #${i + 1}`;
    if (typeof c.name !== "string" || !c.name) throw new Error(`${at}: "name" is missing`);
    if (typeof c.command !== "string" || !c.command) throw new Error(`${at} (${c.name}): "command" is missing`);
    if (c.os !== undefined && !(Array.isArray(c.os) && c.os.every((o) => OS_NAMES.includes(o)))) {
      throw new Error(`${at} (${c.name}): "os" must be a subset of ${OS_NAMES.join(", ")}`);
    }
    if (c.blocking !== undefined && typeof c.blocking !== "boolean") throw new Error(`${at} (${c.name}): "blocking" must be a boolean`);
  }
  return config;
}

// Runs the commands that apply to the current system. Returns the blocking failures and the warnings.
export function runChecks() {
  const failures = [];
  const warnings = [];
  for (const c of loadConfig().checks) {
    if (c.os && !c.os.includes(current)) continue;
    // shell required to resolve .cmd shims on Windows; the command comes from the project's versioned file
    const res = spawnSync(c.command, { encoding: "utf8", shell: true });
    if (res.status === 0) continue;
    const report = `$ ${c.command}\n${res.stdout ?? ""}${res.stderr ?? ""}`;
    (c.blocking === false ? warnings : failures).push(c.blocking === false ? `${c.name} (non-blocking): failed\n${report}` : `${c.name}: failed\n${report}`);
  }
  return { failures, warnings };
}

// real paths: argv[1] may go through a symbolic link (e.g. /var → /private/var on macOS), unlike import.meta.url
if (realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    if (process.argv.includes("--print-os")) {
      console.log(JSON.stringify(loadConfig().ciOs));
    } else {
      const { failures, warnings } = runChecks();
      for (const w of warnings) process.stderr.write(`${w}\n`);
      if (failures.length > 0) {
        process.stderr.write(`Project commands failed:\n\n${failures.join("\n")}\n`);
        process.exit(1);
      }
    }
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }
}
