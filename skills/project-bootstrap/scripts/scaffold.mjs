#!/usr/bin/env node
// Génère les fichiers d'outillage d'un projet à partir des modèles du skill.
// Usage : node scaffold.mjs --config <bootstrap.json> --target <dossier> [--dry-run]
// Ne remplace jamais un fichier existant : les conflits sont listés, à résoudre à la main.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(here, "..", "assets");
const manifest = JSON.parse(readFileSync(path.join(assets, "modules.json"), "utf8"));

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? true : all[i + 1]]] : acc), []),
);
if (!args.config || !args.target) {
  console.error("Usage : node scaffold.mjs --config <bootstrap.json> --target <dossier> [--dry-run]");
  process.exit(1);
}
const config = JSON.parse(readFileSync(args.config, "utf8"));
const target = path.resolve(args.target);
const dryRun = args["dry-run"] === true;

// --- modules sélectionnés et dépendances ---
const selected = new Set(["core", ...(config.modules ?? [])]);
const errors = [];
for (const m of selected) {
  const def = manifest.modules[m];
  if (!def) errors.push(`Module inconnu : ${m}`);
  else for (const r of def.requires) if (!selected.has(r)) errors.push(`Le module ${m} requiert ${r}`);
}
if (!["private", "public"].includes(config.visibility)) errors.push("visibility doit valoir private ou public");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
// pseudo-modules utilisés par les blocs conditionnels
const active = new Set([...selected, `visibility-${config.visibility}`]);

// --- paramètres ---
const ref = (a) => (a ? `${a.sha} # ${a.tag}` : undefined);
const isPublic = config.visibility === "public";
const params = {
  PROJECT_NAME: config.projectName,
  PROJECT_DESCRIPTION: config.description,
  DOC_LANGUAGE_NAME: config.docLanguageName ?? "Français",
  DATE: config.date ?? new Date().toISOString().slice(0, 10),
  VISIBILITY_FR: isPublic ? "public" : "privé",
  OPENSPEC_VERSION: config.versions?.openspec,
  ARCHGATE_VERSION: config.versions?.archgate,
  NODE_VERSION: config.versions?.node ?? "24",
  CHECKOUT_REF: ref(config.actions?.checkout),
  SETUP_NODE_REF: ref(config.actions?.setupNode),
  RELEASE_PLEASE_REF: ref(config.actions?.releasePlease),
  CI_OS_MATRIX: isPublic ? "[ubuntu-latest, windows-latest]" : "[ubuntu-latest]",
  CI_OS_FR: isPublic ? "`ubuntu-latest` et `windows-latest` (gratuits en public)" : "`ubuntu-latest` uniquement (crédit Actions limité en privé)",
  CI_BLOCKING_NOTE: isPublic
    ? "oui si la protection de `main` exige le check"
    : "non : un dépôt privé sur GitHub Free n'a pas de protection de branche ; ne pas merger une PR rouge",
  ACTIONS_CREDIT_NOTE: config.actionsCreditNote ?? "voir la page de facturation Actions",
};

// --- blocs conditionnels : lignes contenant @@module:a|b ... @@end (imbriquables) ---
function applyBlocks(text, file) {
  const out = [];
  const stack = [];
  for (const line of text.split("\n")) {
    const open = /@@module:([\w|-]+)/.exec(line);
    if (open) {
      stack.push(open[1].split("|").some((m) => active.has(m)));
      continue;
    }
    if (/@@end\b/.test(line)) {
      if (!stack.length) throw new Error(`${file} : @@end sans @@module`);
      stack.pop();
      continue;
    }
    if (stack.every(Boolean)) out.push(line);
  }
  if (stack.length) throw new Error(`${file} : @@module non fermé`);
  return out.join("\n");
}

function applyParams(text, file) {
  return text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => {
    if (params[key] === undefined || params[key] === null) throw new Error(`${file} : paramètre {{${key}}} non renseigné`);
    return params[key];
  });
}

// --- .claude/settings.json construit selon les modules (le JSON n'admet pas de blocs) ---
function buildSettings() {
  const both = (rule) => [`Bash(${rule})`, `PowerShell(${rule})`];
  const allow = [];
  const ask = [];
  for (const g of ["git status *", "git diff *", "git log *", "git show *", "git branch --show-current", "git rev-parse *", "git ls-files *"]) allow.push(...both(g));
  if (active.has("openspec")) {
    allow.push(...both("openspec *"));
    for (const c of ["openspec install *", "openspec feedback *", "openspec config *"]) ask.push(...both(c));
  }
  if (active.has("archgate")) {
    allow.push(...both("archgate *"));
    for (const c of ["archgate login *", "archgate upgrade *", "archgate plugin *", "archgate telemetry *"]) ask.push(...both(c));
  }
  if (active.has("openspec") || active.has("archgate")) allow.push(...both("node .claude/hooks/quality-gate.mjs"));
  if (active.has("github")) {
    for (const g of ["auth status", "repo view", "issue list", "issue view", "pr list", "pr view", "pr diff", "pr checks", "run list", "run view", "release list", "release view", "label list"]) allow.push(...both(`gh ${g} *`));
    if (active.has("projects")) for (const g of ["project list", "project view", "project item-list"]) allow.push(...both(`gh ${g} *`));
  }
  const settings = { $schema: "https://json.schemastore.org/claude-code-settings.json", permissions: { allow, ask } };
  if (active.has("openspec") || active.has("archgate")) {
    settings.hooks = {
      TaskCompleted: [{ hooks: [{ type: "command", command: "node", args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/quality-gate.mjs"] }] }],
    };
  }
  return JSON.stringify(settings, null, 2) + "\n";
}

// --- génération ---
const outputs = [];
try {
  for (const { path: rel, when } of manifest.files) {
    if (!when.every((m) => active.has(m))) continue;
    const raw = readFileSync(path.join(assets, "templates", rel), "utf8").replace(/\r\n/g, "\n");
    outputs.push({ rel, content: applyParams(applyBlocks(raw, rel), rel) });
  }
} catch (err) {
  // rien n'est écrit tant que tous les modèles ne sont pas résolus
  console.error(err.message);
  process.exit(1);
}
if (active.has("claude")) outputs.push({ rel: ".claude/settings.json", content: buildSettings() });

const report = { target, modules: [...selected], created: [], identical: [], conflicts: [] };
for (const { rel, content } of outputs) {
  const dest = path.join(target, ...rel.split("/"));
  if (existsSync(dest)) {
    const current = readFileSync(dest, "utf8").replace(/\r\n/g, "\n");
    (current === content ? report.identical : report.conflicts).push(rel);
    continue;
  }
  if (!dryRun) {
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, content);
  }
  report.created.push(rel);
}
console.log(JSON.stringify(report, null, 2));
process.exit(report.conflicts.length ? 3 : 0);
