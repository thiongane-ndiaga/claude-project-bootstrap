#!/usr/bin/env node
// Shared quality check (TaskCompleted hook, pre-push): the repository's validation tooling.
// Exit 2 = blocking failure (stderr sent back to Claude); exit 0 = OK.
import { spawnSync } from "node:child_process";
// @@module:cli-local
import path from "node:path";
import { fileURLToPath } from "node:url";
// @@end
import { runChecks } from "../../.bootstrap/run-checks.mjs";
// @@module:cli-local

// CLIs installed in the project (package.json): node_modules/.bin in front of this process's PATH, hence of every command it launches.
// On Windows the variable is called "Path": find the key regardless of case.
const bin = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "node_modules", ".bin");
const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
process.env[pathKey] = [bin, process.env[pathKey]].filter(Boolean).join(path.delimiter);
// @@end

const checks = [
  // @@module:openspec
  ["openspec", ["validate", "--all", "--strict", "--no-interactive"]],
  // @@end
  // @@module:archgate
  ["archgate", ["check", "--output", "console"]],
  // @@end
];

const failures = [];
for (const [cmd, args] of checks) {
  // shell required on Windows to resolve the .cmd shims installed by npm; constant arguments, nothing to escape
  const res = spawnSync(`${cmd} ${args.join(" ")}`, { encoding: "utf8", shell: true });
  // a missing CLI is a failure too: the tooling is part of the prerequisites (docs/workflow.md)
  if (res.status !== 0) failures.push(`$ ${cmd} ${args.join(" ")}\n${res.stdout ?? ""}${res.stderr ?? ""}`);
}

// project-specific commands: .bootstrap/checks.json (same commands in the pre-push and the CI)
try {
  const project = runChecks();
  failures.push(...project.failures);
  for (const w of project.warnings) process.stderr.write(`quality-gate: ${w}\n`);
} catch (err) {
  failures.push(`.bootstrap/checks.json invalid: ${err.message}`);
}
// @@module:githooks

const hooksPath = spawnSync("git config --get core.hooksPath", { encoding: "utf8", shell: true }).stdout?.trim();
if (hooksPath !== ".githooks") {
  process.stderr.write("quality-gate: pre-push hook inactive in this clone (git config core.hooksPath .githooks)\n");
}
// @@end

if (failures.length > 0) {
  process.stderr.write(`Quality check failed:\n\n${failures.join("\n")}\n`);
  process.exit(2);
}
