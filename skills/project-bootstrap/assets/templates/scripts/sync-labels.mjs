#!/usr/bin/env node
// Crée ou met à jour les labels du dépôt à partir de .github/labels.json (via gh). Usage : node scripts/sync-labels.mjs
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const labels = JSON.parse(readFileSync(new URL("../.github/labels.json", import.meta.url), "utf8"));
let failed = false;
for (const { name, color, description } of labels) {
  // sans shell : arguments passés tels quels, pas d'échappement à gérer
  const res = spawnSync("gh", ["label", "create", name, "--color", color, "--description", description, "--force"], {
    stdio: "inherit",
  });
  if (res.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
