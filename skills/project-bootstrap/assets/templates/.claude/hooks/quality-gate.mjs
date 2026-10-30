#!/usr/bin/env node
// Contrôle qualité commun (hook TaskCompleted, pre-push) : outillage de validation du dépôt.
// Sortie 2 = échec bloquant (stderr renvoyé à Claude) ; sortie 0 = OK.
import { spawnSync } from "node:child_process";

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
  // shell requis sous Windows pour résoudre les shims .cmd installés par npm ; arguments constants, rien à échapper
  const res = spawnSync(`${cmd} ${args.join(" ")}`, { encoding: "utf8", shell: true });
  // CLI absente = échec aussi : l'outillage fait partie des prérequis (docs/workflow.md)
  if (res.status !== 0) failures.push(`$ ${cmd} ${args.join(" ")}\n${res.stdout ?? ""}${res.stderr ?? ""}`);
}
// @@module:githooks

const hooksPath = spawnSync("git config --get core.hooksPath", { encoding: "utf8", shell: true }).stdout?.trim();
if (hooksPath !== ".githooks") {
  process.stderr.write("quality-gate: hook pre-push inactif dans ce clone (git config core.hooksPath .githooks)\n");
}
// @@end

if (failures.length > 0) {
  process.stderr.write(`Contrôle qualité en échec :\n\n${failures.join("\n")}\n`);
  process.exit(2);
}
