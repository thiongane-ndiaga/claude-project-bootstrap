#!/usr/bin/env node
// Crée ou met à jour les labels du dépôt à partir de .github/labels.json (via gh). Usage : node scripts/sync-labels.mjs
// Réutilise ce que la forge fournit : un label « native » n'est créé que s'il manque et n'est jamais modifié ;
// les autres labels (propres au projet) sont créés ou mis à jour. Les noms sont comparés sans tenir compte de la casse.
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

// gh(args) exécute gh et renvoie sa sortie standard (lève une erreur en cas d'échec) ; injectable pour les tests.
// Si la liste des labels ne peut pas être lue, l'erreur est propagée avant toute création.
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
  // sans shell : arguments passés tels quels, pas d'échappement à gérer
  const res = spawnSync("gh", args, { encoding: "utf8" });
  if (res.status !== 0) throw new Error(`gh ${args.slice(0, 2).join(" ")} : ${res.stderr || res.error?.message}`);
  return res.stdout;
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(self)) {
  const labels = JSON.parse(readFileSync(new URL("../.github/labels.json", import.meta.url), "utf8"));
  try {
    const r = syncLabels({ labels, gh: realGh });
    for (const [k, v] of Object.entries(r)) if (v.length) console.log(`${k} : ${v.join(", ")}`);
    process.exit(r.failed.length ? 1 : 0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
