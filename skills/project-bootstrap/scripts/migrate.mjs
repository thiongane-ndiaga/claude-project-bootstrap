#!/usr/bin/env node
// Migrations hors fichiers d'un projet bootstrappé (réglages côté forge, etc.), dans migrations/.
// Usage : node migrate.mjs --target <dépôt> [--repo propriétaire/nom] [--apply]
// Sans --apply : simulation, rien n'est modifié. Avec --apply : exécute les actions et consigne la migration
// dans .bootstrap/manifest.json. Chaque migration vérifie l'état réel avant de proposer quoi que ce soit.
// Le skill demande l'accord de l'utilisateur avant --apply : ces actions sont visibles hors de la machine.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultDir = path.join(here, "..", "migrations");

// Calcule (et exécute avec apply) les migrations applicables à un projet. gh et dir sont injectables pour les tests.
export async function runMigrations({ target, repo, apply = false, gh, dir = defaultDir }) {
  const manifestPath = path.join(target, ".bootstrap", "manifest.json");
  if (!existsSync(manifestPath)) throw new Error("projet sans .bootstrap/manifest.json : lance d'abord scaffold.mjs");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const modules = new Set(manifest.modules ?? []);
  const done = new Set(manifest.migrations ?? []);
  const results = [];
  const names = readdirSync(dir).filter((n) => n.endsWith(".mjs")).sort();
  for (const name of names) {
    const m = await import(pathToFileURL(path.join(dir, name)).href);
    if (done.has(m.id) || !m.modules.every((x) => modules.has(x))) continue;
    // plan renvoie un tableau d'actions, ou { actions, notes } (notes : informations à présenter, jamais exécutées)
    const planned = await m.plan({ gh, repo, target, manifest });
    const actions = Array.isArray(planned) ? planned : (planned.actions ?? []);
    const notes = Array.isArray(planned) ? [] : (planned.notes ?? []);
    const entry = { id: m.id, title: m.title, actions: actions.map(({ description, command }) => ({ description, command })), notes, applied: false };
    if (apply && actions.length > 0) {
      for (const a of actions) a.run();
      done.add(m.id);
      entry.applied = true;
    }
    results.push(entry);
  }
  if (apply && results.some((r) => r.applied)) {
    manifest.migrations = [...done].sort();
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  }
  return results;
}

function realGh(args) {
  const res = spawnSync("gh", args, { encoding: "utf8" });
  if (res.status !== 0) throw new Error(`gh ${args.join(" ")} : ${res.stderr || res.error?.message}`);
  return res.stdout;
}

function repoOf(target) {
  const res = spawnSync("git", ["-C", target, "remote", "get-url", "origin"], { encoding: "utf8" });
  const m = /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?\s*$/.exec(res.stdout ?? "");
  return m?.[1];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = Object.fromEntries(
    process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? true : all[i + 1]]] : acc), []),
  );
  if (!args.target) {
    console.error("Usage : node migrate.mjs --target <dépôt> [--repo propriétaire/nom] [--apply]");
    process.exit(1);
  }
  const target = path.resolve(args.target);
  const repo = typeof args.repo === "string" ? args.repo : repoOf(target);
  if (!repo) {
    console.error("Dépôt GitHub introuvable : passe --repo propriétaire/nom");
    process.exit(1);
  }
  try {
    const results = await runMigrations({ target, repo, apply: args.apply === true, gh: realGh });
    console.log(JSON.stringify({ target, repo, apply: args.apply === true, migrations: results }, null, 2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
