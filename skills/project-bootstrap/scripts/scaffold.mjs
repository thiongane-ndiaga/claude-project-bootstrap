#!/usr/bin/env node
// Génère les fichiers d'outillage d'un projet à partir des modèles du skill.
// Usage : node scaffold.mjs --config <bootstrap.json> --target <dossier> [--dry-run] [--diff] [--catalog <modules.json>]
//         node scaffold.mjs --detect --target <dossier>     (état du dépôt : existant, déjà bootstrappé)
// Écrit .bootstrap/manifest.json (modules, version du plugin, empreinte de chaque fichier généré).
// N'écrase jamais un fichier modifié : les conflits sont listés (diff avec --diff), à résoudre à la main.
// Un fichier resté tel que généré est remplacé par le modèle actuel ; .gitignore, .gitattributes et
// .claude/settings.json sont fusionnés avec l'existant ; config.keep liste les fichiers à ne pas toucher.
// --catalog : catalogue de modules alternatif (tests) ; par défaut assets/modules.json.
// Codes de sortie : 0 succès ; 1 configuration ou catalogue invalide ; 2 modules incompatibles ; 3 fichiers en conflit.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mergeJson, mergeLines } from "./merge.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(here, "..", "assets");
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? true : all[i + 1]]] : acc), []),
);
if (!args.target || (!args.config && args.detect !== true && args.update !== true)) {
  console.error(
    "Usage : node scaffold.mjs --config <bootstrap.json> --target <dossier> [--dry-run] [--diff] [--adopt] [--catalog <modules.json>]\n" +
      "        node scaffold.mjs --update --target <dossier> [--dry-run] [--diff] [--adopt]   (configuration lue dans le manifeste)\n" +
      "        node scaffold.mjs --detect --target <dossier>",
  );
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(typeof args.catalog === "string" ? args.catalog : path.join(assets, "modules.json"), "utf8"));
const target = path.resolve(args.target);

// --- manifeste du projet (.bootstrap/manifest.json) et version du plugin en cours d'exécution ---
const MANIFEST = ".bootstrap/manifest.json";
const manifestPath = path.join(target, ...MANIFEST.split("/"));
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const readText = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
let pluginVersion = "unknown";
try {
  pluginVersion = JSON.parse(readFileSync(path.join(here, "..", "..", "..", ".claude-plugin", "plugin.json"), "utf8")).version;
} catch {
  // plugin lancé hors de son arborescence : version inconnue
}
let previous = null;
if (existsSync(manifestPath)) {
  try {
    previous = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    if (args.detect !== true) {
      console.error(`${MANIFEST} illisible : corrige-le ou supprime-le avant de relancer`);
      process.exit(1);
    }
  }
}

// --- détection : le dépôt cible existe-t-il, est-il déjà bootstrappé ? (aucune écriture) ---
if (args.detect === true) {
  const has = (p) => existsSync(path.join(target, ...p.split("/")));
  let recorded = null;
  if (has(".bootstrap/manifest.json")) {
    recorded = previous
      ? { plugin: previous.plugin, modules: previous.modules, files: Object.keys(previous.files ?? {}).length, migrations: previous.migrations ?? [] }
      : { error: "manifeste illisible" };
  }
  console.log(
    JSON.stringify(
      {
        target,
        exists: existsSync(target),
        git: has(".git"),
        bootstrapped: recorded !== null,
        manifest: recorded,
        pluginVersion,
        updateAvailable: previous?.plugin?.version !== undefined && previous.plugin.version !== pluginVersion,
        claude: has(".claude"),
        packageJson: has("package.json"),
        ci: has(".github/workflows") ? readdirSync(path.join(target, ".github", "workflows")).sort() : [],
        sharedFiles: [".gitignore", ".gitattributes", "CLAUDE.md", ".claude/settings.json"].filter(has),
        topLevel: existsSync(target) ? readdirSync(target).filter((n) => n !== ".git").sort() : [],
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

// --update : la configuration est celle du manifeste (--config la remplace, par exemple pour relever des versions épinglées)
if (args.update === true && !previous && !args.config) {
  console.error(`--update exige ${MANIFEST} (projet sans manifeste : utilise --config avec --adopt)`);
  process.exit(1);
}
const config = typeof args.config === "string" ? JSON.parse(readFileSync(args.config, "utf8")) : previous?.config;
const dryRun = args["dry-run"] === true;

// --- modules sélectionnés et dépendances ---
const selected = new Set(["core", ...(config.modules ?? [])]);
const errors = [];
// catalogue : `conflicts` ne cite que des modules connus, jamais le module lui-même ni l'un de ses `requires`
for (const [m, def] of Object.entries(manifest.modules)) {
  for (const c of def.conflicts ?? []) {
    if (!manifest.modules[c]) errors.push(`Catalogue invalide : ${m} est incompatible avec le module inconnu ${c}`);
    else if (c === m || def.requires.includes(c)) errors.push(`Catalogue invalide : ${m} ne peut pas être incompatible avec ${c}`);
  }
}
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
// incompatibilités : la déclaration d'un seul des deux modules suffit
const incompatible = new Set();
for (const m of selected) {
  for (const c of manifest.modules[m].conflicts ?? []) if (selected.has(c)) incompatible.add([m, c].sort().join(" / "));
}
if (incompatible.size) {
  console.error([...incompatible].map((p) => `Modules incompatibles : ${p}`).join("\n"));
  process.exit(2);
}
// pseudo-modules utilisés par les blocs conditionnels
const active = new Set([...selected, `visibility-${config.visibility}`, config.stack ? "stack-chosen" : "stack-open"]);

// --- paramètres ---
const ref = (a) => (a ? `${a.sha} # ${a.tag}` : undefined);
const isPublic = config.visibility === "public";
const params = {
  PROJECT_NAME: config.projectName,
  PROJECT_DESCRIPTION: config.description,
  STACK: config.stack,
  DOC_LANGUAGE_NAME: config.docLanguageName ?? "Français",
  DATE: config.date ?? new Date().toISOString().slice(0, 10),
  VISIBILITY_FR: isPublic ? "public" : "privé",
  OPENSPEC_VERSION: config.versions?.openspec,
  ARCHGATE_VERSION: config.versions?.archgate,
  NODE_VERSION: config.versions?.node ?? "24",
  CHECKOUT_REF: ref(config.actions?.checkout),
  SETUP_NODE_REF: ref(config.actions?.setupNode),
  RELEASE_PLEASE_REF: ref(config.actions?.releasePlease),
  CI_OS_JSON: isPublic ? '["ubuntu-latest", "windows-latest"]' : '["ubuntu-latest"]',
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
  allow.push(...both("node .claude/hooks/quality-gate.mjs"));
  if (active.has("github")) {
    for (const g of ["auth status", "repo view", "issue list", "issue view", "pr list", "pr view", "pr diff", "pr checks", "run list", "run view", "release list", "release view", "label list"]) allow.push(...both(`gh ${g} *`));
    if (active.has("projects")) for (const g of ["project list", "project view", "project item-list"]) allow.push(...both(`gh ${g} *`));
  }
  const settings = { $schema: "https://json.schemastore.org/claude-code-settings.json", permissions: { allow, ask } };
  settings.hooks = {
    TaskCompleted: [{ hooks: [{ type: "command", command: "node", args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/quality-gate.mjs"] }] }],
  };
  return JSON.stringify(settings, null, 2) + "\n";
}

// --- génération ---
const outputs = [];
try {
  for (const { path: rel, when, merge, owned } of manifest.files) {
    if (!when.every((m) => active.has(m))) continue;
    const raw = readFileSync(path.join(assets, "templates", rel), "utf8").replace(/\r\n/g, "\n");
    outputs.push({ rel, merge, owned, content: applyParams(applyBlocks(raw, rel), rel) });
  }
} catch (err) {
  // rien n'est écrit tant que tous les modèles ne sont pas résolus
  console.error(err.message);
  process.exit(1);
}
if (active.has("claude")) outputs.push({ rel: ".claude/settings.json", merge: "json", content: buildSettings() });

function diffText(currentPath, proposed) {
  const tmp = path.join(mkdtempSync(path.join(tmpdir(), "pb-diff-")), "propose");
  writeFileSync(tmp, proposed);
  const res = spawnSync("git", ["diff", "--no-index", "--no-color", "--", currentPath, tmp], { encoding: "utf8" });
  return res.error ? "(git requis pour afficher le diff)" : res.stdout;
}

// Chaque entrée du manifeste : { sha256 (fichier tel qu'écrit), generated (empreinte du contenu produit par le modèle), status }.
// status : created (fichier du modèle) | merged (fusionné avec l'existant) | kept (géré par le projet) | adopted (existant repris tel quel).
//
// Règles, dans l'ordre, pour chaque fichier du modèle :
//   listé dans config.keep ou « owned » dans le catalogue (créé s'il est absent) -> conservé tel quel, jamais touché ;
//   absent                            -> créé ;
//   identique au modèle               -> rien ;
//   resté tel que généré              -> remplacé par le modèle actuel (l'empreinte du manifeste le prouve) ;
//   modèle inchangé depuis la génération -> rien : la personnalisation du projet n'est pas un conflit (« customized ») ;
//   fichier partagé (merge)           -> fusionné avec l'existant ;
//   --adopt                           -> repris tel quel, consigné « adopted » (le modèle actuel devient la référence) ;
//   sinon                             -> conflit signalé (diff avec --diff), jamais d'écrasement.
const keep = new Set(config.keep ?? []);
const files = { ...(previous?.files ?? {}) };
const report = {
  target,
  modules: [...selected],
  bootstrapped: previous !== null,
  fromVersion: previous?.plugin?.version ?? null,
  toVersion: pluginVersion,
  created: [],
  updated: [],
  merged: [],
  identical: [],
  customized: [],
  adopted: [],
  kept: [],
  retired: [],
  conflicts: [],
};
const diffs = {};
const put = (dest, text) => {
  if (dryRun) return;
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, text);
};

for (const { rel, content, merge, owned } of outputs) {
  const dest = path.join(target, ...rel.split("/"));
  const generated = sha256(content);
  const before = previous?.files?.[rel];
  if (keep.has(rel) || (owned && existsSync(dest))) {
    report.kept.push(rel);
    if (existsSync(dest)) files[rel] = { sha256: sha256(readText(dest)), generated, status: "kept" };
    continue;
  }
  if (!existsSync(dest)) {
    put(dest, content);
    report.created.push(rel);
    files[rel] = { sha256: generated, generated, status: owned ? "kept" : "created" };
    continue;
  }
  const current = readText(dest);
  if (current === content) {
    report.identical.push(rel);
    files[rel] = { sha256: generated, generated, status: before?.status === "merged" ? "merged" : "created" };
    continue;
  }
  if (before?.status === "created" && sha256(current) === before.sha256) {
    put(dest, content);
    report.updated.push(rel);
    files[rel] = { sha256: generated, generated, status: "created" };
    continue;
  }
  if (before && before.status !== "kept" && before.generated === generated) {
    report.customized.push(rel);
    continue;
  }
  if (merge) {
    const merged = merge === "lines" ? mergeLines(current, content) : mergeJson(current, content);
    if (merged !== null) {
      if (merged === current) report.identical.push(rel);
      else {
        put(dest, merged);
        report.merged.push(rel);
      }
      files[rel] = { sha256: sha256(merged), generated, status: "merged" };
      continue;
    }
  }
  if (args.adopt === true) {
    report.adopted.push(rel);
    files[rel] = { sha256: sha256(current), generated, status: "adopted" };
    continue;
  }
  report.conflicts.push(rel);
  if (args.diff === true) diffs[rel] = diffText(dest, content);
}

// fichiers suivis par le manifeste que le modèle ne produit plus : signalés, jamais supprimés
const produced = new Set(outputs.map((o) => o.rel));
for (const rel of Object.keys(previous?.files ?? {})) if (!produced.has(rel)) report.retired.push(rel);

const manifestOut =
  JSON.stringify(
    {
      schema: 1,
      plugin: { name: "project-bootstrap", version: pluginVersion },
      modules: [...selected],
      config,
      files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))),
      migrations: previous?.migrations ?? [],
    },
    null,
    2,
  ) + "\n";
const manifestCurrent = existsSync(manifestPath) ? readFileSync(manifestPath, "utf8").replace(/\r\n/g, "\n") : null;
if (manifestCurrent !== manifestOut) {
  put(manifestPath, manifestOut);
  report.manifest = manifestCurrent === null ? "created" : "updated";
}
if (Object.keys(diffs).length) report.diffs = diffs;
console.log(JSON.stringify(report, null, 2));
process.exit(report.conflicts.length ? 3 : 0);
