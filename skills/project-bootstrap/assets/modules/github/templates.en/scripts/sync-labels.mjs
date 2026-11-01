#!/usr/bin/env node
// Creates or updates the repository labels from .github/labels.json (via gh). Usage: node scripts/sync-labels.mjs
// Reuses what the forge provides: a "native" label is only created if it is missing and is never modified;
// the other labels (specific to the project) are created or updated. Names are compared regardless of case.
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

// gh(args) runs gh and returns its standard output (throws on failure); injectable for tests.
// If the label list cannot be read, the error is propagated before any creation.
export function syncLabels({ labels, gh }) {
  const existing = new Set(JSON.parse(gh(["label", "list", "--json", "name", "--limit", "1000"])).map((l) => l.name.toLowerCase()));
  const result = { created: [], updated: [], skipped: [], failed: [] };
  for (const { name, color, description, native } of labels) {
    const exists = existing.has(name.toLowerCase());
    if (native && exists) {
      result.skipped.push(name);
      continue;
    }
    const args = ["label", "create", name, "--color", color, "--description", description];
    if (exists) args.push("--force");
    try {
      gh(args);
      (exists ? result.updated : result.created).push(name);
    } catch {
      result.failed.push(name);
    }
  }
  return result;
}

function realGh(args) {
  // no shell: arguments passed as they are, no escaping to handle
  const res = spawnSync("gh", args, { encoding: "utf8" });
  if (res.status !== 0) throw new Error(`gh ${args.slice(0, 2).join(" ")}: ${res.stderr || res.error?.message}`);
  return res.stdout;
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(self)) {
  const labels = JSON.parse(readFileSync(new URL("../.github/labels.json", import.meta.url), "utf8"));
  try {
    const r = syncLabels({ labels, gh: realGh });
    for (const [k, v] of Object.entries(r)) if (v.length) console.log(`${k}: ${v.join(", ")}`);
    process.exit(r.failed.length ? 1 : 0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
